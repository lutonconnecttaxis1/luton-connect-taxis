import { airportFees } from "@/config/airport-fees";
import { pricingConfig } from "@/config/pricing";
import { findAirportId, pointInCongestionZone, routeEntersCongestionZone } from "@/lib/geo/places";
import type { JourneyInput } from "@/lib/journey";
import { computeRoute, type RouteInfo } from "@/lib/maps/routes";
import { calculateEstimate } from "@/lib/pricing/calculateEstimate";
import type { Estimate } from "@/lib/pricing/types";

/** What the server sends back for a quote. Everything the page needs to show an estimate. */
export type Quote = {
  miles: number;
  durationMinutes: number;
  pickup: { text: string; airport: string | null };
  dropoff: { text: string; airport: string | null };
  outbound: Estimate;
  /** Present when a return journey was requested – priced as its own leg. */
  returnLeg: Estimate | null;
  total: number;
  /** True when some fee is "confirmed on quote", so the total is a minimum. */
  hasPendingFees: boolean;
};

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; reason: "too-far" | "too-many-passengers" | "invalid-input"; message: string };

const airportName = (id: string | null) => (id ? (airportFees.find((a) => a.id === id)?.name ?? null) : null);

/**
 * Turns a journey + its route into an estimate. No network here, so it can be
 * tested with a made-up route. A return journey is priced as a second leg:
 * same road distance, its own date/time (so its own day/night band and
 * Congestion Charge check), and airport fees swapped (pickup ↔ drop-off).
 */
export function buildQuote(journey: JourneyInput, route: RouteInfo): QuoteResult {
  if (route.miles > pricingConfig.maxEstimateMiles) {
    return {
      ok: false,
      reason: "too-far",
      message: "That’s a long journey – please call or WhatsApp us for a quote.",
    };
  }

  const pickupAirportId = findAirportId(route.start);
  const dropoffAirportId = findAirportId(route.end);
  const inCongestionZone =
    pointInCongestionZone(route.start) || pointInCongestionZone(route.end) || routeEntersCongestionZone(route.path);

  const common = {
    miles: route.miles,
    durationMinutes: route.durationMinutes,
    passengers: journey.passengers,
    inCongestionZone,
  };

  const outbound = calculateEstimate({
    ...common,
    pickupDate: journey.date,
    pickupTime: journey.time,
    pickupAirportId,
    dropoffAirportId,
  });
  if (!outbound.ok) return { ok: false, reason: outbound.reason, message: outbound.message };

  let returnLeg: Estimate | null = null;
  if (journey.returnTrip) {
    const result = calculateEstimate({
      ...common,
      pickupDate: journey.returnTrip.date,
      pickupTime: journey.returnTrip.time,
      pickupAirportId: dropoffAirportId,
      dropoffAirportId: pickupAirportId,
    });
    if (!result.ok) return { ok: false, reason: result.reason, message: result.message };
    returnLeg = result;
  }

  const total = Math.round((outbound.total + (returnLeg?.total ?? 0)) * 100) / 100;
  return {
    ok: true,
    quote: {
      miles: outbound.miles,
      durationMinutes: route.durationMinutes,
      pickup: { text: journey.pickup.text, airport: airportName(pickupAirportId) },
      dropoff: { text: journey.dropoff.text, airport: airportName(dropoffAirportId) },
      outbound,
      returnLeg,
      total,
      hasPendingFees: outbound.hasPendingFees || (returnLeg?.hasPendingFees ?? false),
    },
  };
}

/** Looks the route up with Google, then prices it. */
export async function quoteJourney(journey: JourneyInput): Promise<QuoteResult> {
  const route = await computeRoute(journey.pickup.placeId, journey.dropoff.placeId);
  return buildQuote(journey, route);
}
