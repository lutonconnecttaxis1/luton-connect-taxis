import { bankHolidays } from "@/config/bank-holidays";
import { airportFees } from "@/config/airport-fees";
import { congestionConfig } from "@/config/congestion";
import { pricingConfig } from "@/config/pricing";
import { overlapsChargingHours } from "./congestion-hours";
import { isValidDate, isValidTime, toMinutes, weekdayOf } from "./dates";
import type {
  AirportFeeRow,
  BandCode,
  CongestionRules,
  Estimate,
  EstimateInput,
  EstimateLine,
  EstimateResult,
  PricingRules,
} from "./types";

export type EstimateRules = {
  pricing: PricingRules;
  congestion: CongestionRules;
  airports: readonly AirportFeeRow[];
  holidays: Readonly<Record<string, string>>;
};

const defaultRules: EstimateRules = {
  pricing: pricingConfig,
  congestion: congestionConfig,
  airports: airportFees,
  holidays: bankHolidays,
};

const pence = (pounds: number) => Math.round(pounds * 100);
const pounds = (p: number) => p / 100;
const gbp = (value: number) => `£${value.toFixed(2)}`;

/**
 * The price estimate (rules: PROJECT_CONTEXT.md §6).
 *
 * A PURE function: same input → same output, no network, no clock. Everything
 * it needs (distance, airports, zone) is worked out before calling it.
 *
 *   fare = base + (per-mile × miles)      then extras are added:
 *   airport fee(s) from the table, and the Congestion Charge when it applies.
 *
 * Money is worked out in whole pence so there are never rounding surprises.
 */
export function calculateEstimate(input: EstimateInput, rules: EstimateRules = defaultRules): EstimateResult {
  const { pricing, congestion, airports, holidays } = rules;

  if (
    !Number.isFinite(input.miles) ||
    input.miles < 0 ||
    !Number.isFinite(input.durationMinutes) ||
    input.durationMinutes < 0 ||
    !isValidDate(input.pickupDate) ||
    !isValidTime(input.pickupTime) ||
    !Number.isInteger(input.passengers) ||
    input.passengers < 1
  ) {
    return { ok: false, reason: "invalid-input", message: "Some journey details are missing or invalid." };
  }
  if (input.passengers > pricing.maxPassengers) {
    return {
      ok: false,
      reason: "too-many-passengers",
      message: `For more than ${pricing.maxPassengers} passengers, please call us for a quote.`,
    };
  }

  // 1. Rate band
  const factor = 10 ** pricing.milesDecimals;
  const miles = Math.round(input.miles * factor) / factor;
  const minute = toMinutes(input.pickupTime);
  const inDayWindow = minute >= toMinutes(pricing.dayWindow.start) && minute < toMinutes(pricing.dayWindow.end);

  let band: "day" | "night";
  let bandReason: string;
  let bandCode: BandCode;
  let bandParams: Record<string, string | number>;
  if (input.passengers >= pricing.alwaysNightFromPassengers) {
    band = "night";
    bandCode = "passengers";
    bandParams = { passengers: input.passengers };
    bandReason = `${input.passengers} passengers – night rate applies at any time`;
  } else if (inDayWindow) {
    band = "day";
    bandCode = "day";
    bandParams = { start: pricing.dayWindow.start, end: pricing.dayWindow.end };
    bandReason = `Day rate (${pricing.dayWindow.start}–${pricing.dayWindow.end})`;
  } else {
    band = "night";
    bandCode = "night";
    bandParams = { start: pricing.dayWindow.end, end: pricing.dayWindow.start };
    bandReason = `Night rate (${pricing.dayWindow.end}–${pricing.dayWindow.start})`;
  }
  const rate = band === "day" ? pricing.day : pricing.night;

  // 2. Base + mileage
  const basePence = pence(rate.base);
  const mileagePence = Math.round(pence(rate.perMile) * miles);
  const lines: EstimateLine[] = [
    { key: "base", label: "Base fare", amount: pounds(basePence) },
    {
      key: "mileage",
      label: "Mileage",
      amount: pounds(mileagePence),
      detail: `${miles} miles × ${gbp(rate.perMile)}`,
      params: { miles, rate: gbp(rate.perMile) },
    },
  ];
  let totalPence = basePence + mileagePence;
  let hasPendingFees = false;

  // 3. Airport fees (added at the end, never part of the per-mile sum)
  const addAirportFee = (airportId: string | null, kind: "dropoff" | "pickup") => {
    if (!airportId) return;
    const airport = airports.find((a) => a.id === airportId);
    if (!airport) return;
    const fee = airport[kind];
    const label = kind === "dropoff" ? `Airport drop-off fee – ${airport.name}` : `Airport pickup fee – ${airport.name}`;
    const key = kind === "dropoff" ? "airport-dropoff" : "airport-pickup";
    if (fee === null) {
      hasPendingFees = true;
      lines.push({ key, label, amount: null, detail: "Confirmed on quote", params: { airport: airport.name } });
    } else {
      lines.push({ key, label, amount: fee, params: { airport: airport.name } });
      totalPence += pence(fee);
    }
  };
  addAirportFee(input.pickupAirportId, "pickup");
  addAirportFee(input.dropoffAirportId, "dropoff");

  // 4. Congestion Charge – once per journey, only if the journey overlaps charging hours
  let congestionInfo: Estimate["congestion"];
  if (!input.inCongestionZone) {
    congestionInfo = {
      inZone: false,
      applies: false,
      reason: "Journey is outside the Congestion Charge zone",
      reasonCode: "outside-zone",
      reasonParams: {},
    };
  } else if (overlapsChargingHours(input.pickupDate, input.pickupTime, input.durationMinutes, congestion, holidays)) {
    congestionInfo = {
      inZone: true,
      applies: true,
      reason: "Journey is in the zone during charging hours",
      reasonCode: "in-charging-hours",
      reasonParams: {},
    };
    lines.push({
      key: "congestion",
      label: "London Congestion Charge",
      amount: congestion.charge,
      detail: "Charged once per journey",
    });
    totalPence += pence(congestion.charge);
  } else {
    const holiday = input.pickupDate in holidays;
    const day = holiday ? "bank holidays" : weekdayOf(input.pickupDate) === 0 || weekdayOf(input.pickupDate) === 6 ? "weekends" : "weekdays";
    congestionInfo = {
      inZone: true,
      applies: false,
      reason: `Journey is in the zone but outside charging hours on ${day}`,
      reasonCode: "outside-hours",
      reasonParams: { day },
    };
  }

  return {
    ok: true,
    band,
    bandReason,
    bandCode,
    bandParams,
    miles,
    lines,
    total: pounds(totalPence),
    hasPendingFees,
    congestion: congestionInfo,
  };
}
