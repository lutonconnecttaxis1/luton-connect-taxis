import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { congestionConfig } from "@/config/congestion";
import { calculateEstimate, type EstimateRules } from "./calculateEstimate";
import { chargingWindowFor, overlapsChargingHours } from "./congestion-hours";
import { addDays, daysBetween, formatDateLong, isValidDate, londonNow, weekdayOf } from "./dates";
import type { EstimateInput } from "./types";
import { bankHolidays } from "@/config/bank-holidays";

const TUESDAY = "2026-10-06";
const SATURDAY = "2026-10-10";
const SUNDAY = "2026-10-11";

function base(overrides: Partial<EstimateInput> = {}): EstimateInput {
  return {
    miles: 1,
    durationMinutes: 10,
    pickupDate: TUESDAY,
    pickupTime: "10:00",
    passengers: 2,
    pickupAirportId: null,
    dropoffAirportId: null,
    inCongestionZone: false,
    ...overrides,
  };
}

function total(overrides: Partial<EstimateInput>): number {
  const result = calculateEstimate(base(overrides));
  assert.ok(result.ok, "estimate should succeed");
  return result.total;
}

describe("worked examples from the client's spec (PROJECT_CONTEXT §6.3)", () => {
  it("day rate, 1–4 people: £8 + £2.40/mile", () => {
    assert.equal(total({ miles: 1 }), 10.4);
    assert.equal(total({ miles: 2 }), 12.8);
    assert.equal(total({ miles: 3 }), 15.2);
    assert.equal(total({ miles: 4 }), 17.6);
  });

  it("night rate, 1–4 people: £10 + £3.00/mile", () => {
    const night = (miles: number) => total({ miles, pickupTime: "23:30" });
    assert.equal(night(1), 13);
    assert.equal(night(2), 16);
    assert.equal(night(3), 19);
    assert.equal(night(4), 22);
  });

  it("5–6 people always get the night rate, even at midday", () => {
    for (const passengers of [5, 6]) {
      assert.equal(total({ miles: 1, passengers, pickupTime: "12:00" }), 13);
      assert.equal(total({ miles: 4, passengers, pickupTime: "12:00" }), 22);
    }
  });

  it("12 miles, day, 3 people, destination in the zone on a Tuesday 10:00 → £54.80", () => {
    assert.equal(
      total({ miles: 12, passengers: 3, inCongestionZone: true, durationMinutes: 40 }),
      54.8,
    );
  });

  it("25 miles, day, drop-off at Heathrow (£7) → £75.00", () => {
    assert.equal(total({ miles: 25, dropoffAirportId: "heathrow" }), 75);
  });

  it("10 miles, day, drop-off at Luton (£9) → £41.00", () => {
    assert.equal(total({ miles: 10, dropoffAirportId: "luton" }), 41);
  });
});

describe("rate band boundaries", () => {
  it("05:59 is night, 06:00 is day, 22:59 is day, 23:00 is night", () => {
    const band = (pickupTime: string) => {
      const r = calculateEstimate(base({ pickupTime }));
      assert.ok(r.ok);
      return r.band;
    };
    assert.equal(band("05:59"), "night");
    assert.equal(band("06:00"), "day");
    assert.equal(band("22:59"), "day");
    assert.equal(band("23:00"), "night");
    assert.equal(band("00:00"), "night");
  });

  it("explains the band chosen", () => {
    const r = calculateEstimate(base({ passengers: 5 }));
    assert.ok(r.ok);
    assert.match(r.bandReason, /5 passengers/);
  });
});

describe("rounding", () => {
  it("rounds miles to 1 decimal and the total to the penny", () => {
    // 12.34 → 12.3 miles; £8 + 12.3 × 2.40 = £37.52
    assert.equal(total({ miles: 12.34 }), 37.52);
    // classic floating-point trap: 7.7 × 2.40
    assert.equal(total({ miles: 7.7 }), 26.48);
    assert.equal(total({ miles: 0.04 }), 8);
  });
});

describe("airport fees", () => {
  it("adds both fees when a journey starts and ends at airports", () => {
    // Stansted pickup £10 + Heathrow drop-off £7
    assert.equal(total({ miles: 10, pickupAirportId: "stansted", dropoffAirportId: "heathrow" }), 8 + 24 + 10 + 7);
  });

  it("charges a pickup fee at Luton, Heathrow and Gatwick (same as their drop-off fee)", () => {
    assert.equal(total({ miles: 10, pickupAirportId: "luton" }), 8 + 24 + 9);
    assert.equal(total({ miles: 10, pickupAirportId: "heathrow" }), 8 + 24 + 7);
    assert.equal(total({ miles: 10, pickupAirportId: "gatwick" }), 8 + 24 + 10);
  });

  it("shows 'confirmed on quote' when the fee has not been supplied", () => {
    const r = calculateEstimate(base({ miles: 10, dropoffAirportId: "london-city" }));
    assert.ok(r.ok);
    assert.equal(r.hasPendingFees, true);
    assert.equal(r.total, 32); // fee not included
    const line = r.lines.find((l) => l.key === "airport-dropoff");
    assert.equal(line?.amount, null);
    assert.equal(line?.detail, "Confirmed on quote");
  });

  it("ignores an airport id that is not in the table", () => {
    assert.equal(total({ miles: 1, dropoffAirportId: "nowhere" }), 10.4);
  });
});

describe("Congestion Charge", () => {
  it("is added once, only when in the zone during charging hours", () => {
    const r = calculateEstimate(base({ inCongestionZone: true }));
    assert.ok(r.ok);
    assert.equal(r.congestion.applies, true);
    assert.equal(r.lines.filter((l) => l.key === "congestion").length, 1);
  });

  it("is not added outside the zone", () => {
    const r = calculateEstimate(base({ inCongestionZone: false }));
    assert.ok(r.ok);
    assert.equal(r.congestion.applies, false);
  });

  it("weekday window is 07:00–18:00", () => {
    const applies = (pickupTime: string, durationMinutes = 20) =>
      overlapsChargingHours(TUESDAY, pickupTime, durationMinutes, congestionConfig, bankHolidays);
    assert.equal(applies("06:00", 30), false); // ends 06:30
    assert.equal(applies("06:45", 30), true); // ends 07:15 – overlaps
    assert.equal(applies("07:00"), true);
    assert.equal(applies("17:59"), true);
    assert.equal(applies("18:00"), false); // window end is exclusive
    assert.equal(applies("21:00"), false);
  });

  it("weekends and bank holidays use 12:00–18:00", () => {
    const sat = (t: string, d = 20) => overlapsChargingHours(SATURDAY, t, d, congestionConfig, bankHolidays);
    assert.equal(sat("10:00", 30), false);
    assert.equal(sat("11:50", 30), true); // ends 12:20
    assert.equal(sat("13:00"), true);
    assert.equal(overlapsChargingHours(SUNDAY, "13:00", 20, congestionConfig, bankHolidays), true);
    assert.equal(overlapsChargingHours(SUNDAY, "09:00", 20, congestionConfig, bankHolidays), false);
    // Boxing Day substitute – a Monday bank holiday, so weekend hours, not 07:00–18:00
    assert.equal(overlapsChargingHours("2026-12-28", "09:00", 20, congestionConfig, bankHolidays), false);
    assert.equal(overlapsChargingHours("2026-12-28", "13:00", 20, congestionConfig, bankHolidays), true);
  });

  it("checks the next day when a journey runs past midnight", () => {
    // Friday 23:30 + 800 min = Saturday 12:50 → overlaps Saturday's 12:00 start
    assert.equal(overlapsChargingHours("2026-10-09", "23:30", 800, congestionConfig, bankHolidays), true);
    assert.equal(overlapsChargingHours("2026-10-09", "23:30", 300, congestionConfig, bankHolidays), false);
  });

  it("the Christmas/New Year exemption is off by default and works when switched on", () => {
    assert.ok(chargingWindowFor("2026-12-30", congestionConfig, bankHolidays));
    const exempt = { ...congestionConfig, christmasExemption: true };
    assert.equal(chargingWindowFor("2026-12-30", exempt, bankHolidays), null);
    assert.equal(chargingWindowFor("2027-01-01", exempt, bankHolidays), null);
    assert.ok(chargingWindowFor("2026-12-24", exempt, bankHolidays));
  });

  it("a zone journey outside charging hours has no charge but says why", () => {
    const r = calculateEstimate(base({ inCongestionZone: true, pickupTime: "21:00" }));
    assert.ok(r.ok);
    assert.equal(r.congestion.inZone, true);
    assert.equal(r.congestion.applies, false);
    assert.match(r.congestion.reason, /outside charging hours/);
  });
});

describe("input checks", () => {
  it("asks for a call when there are more than 6 passengers", () => {
    const r = calculateEstimate(base({ passengers: 7 }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "too-many-passengers");
  });

  it("rejects nonsense input", () => {
    for (const bad of [
      base({ miles: -1 }),
      base({ miles: Number.NaN }),
      base({ pickupDate: "2026-02-30" }),
      base({ pickupTime: "25:00" }),
      base({ passengers: 0 }),
      base({ passengers: 2.5 }),
    ]) {
      const r = calculateEstimate(bad);
      assert.equal(r.ok, false);
    }
  });

  it("is deterministic and lets rates be swapped without touching the code", () => {
    const rules: EstimateRules = {
      pricing: {
        dayWindow: { start: "06:00", end: "23:00" },
        day: { base: 5, perMile: 1 },
        night: { base: 6, perMile: 2 },
        alwaysNightFromPassengers: 5,
        maxPassengers: 6,
        milesDecimals: 1,
      },
      congestion: congestionConfig,
      airports: [],
      holidays: {},
    };
    const a = calculateEstimate(base({ miles: 10 }), rules);
    const b = calculateEstimate(base({ miles: 10 }), rules);
    assert.deepEqual(a, b);
    assert.ok(a.ok);
    assert.equal(a.total, 15);
  });
});

describe("language-neutral fields (for translating the estimate)", () => {
  it("describes the rate band with a code and values", () => {
    const day = calculateEstimate(base({ pickupTime: "10:00" }));
    assert.ok(day.ok);
    assert.equal(day.bandCode, "day");
    assert.deepEqual(day.bandParams, { start: "06:00", end: "23:00" });

    const night = calculateEstimate(base({ pickupTime: "02:00" }));
    assert.ok(night.ok);
    assert.equal(night.bandCode, "night");
    assert.deepEqual(night.bandParams, { start: "23:00", end: "06:00" });

    const group = calculateEstimate(base({ passengers: 5, pickupTime: "10:00" }));
    assert.ok(group.ok);
    assert.equal(group.bandCode, "passengers");
    assert.deepEqual(group.bandParams, { passengers: 5 });
  });

  it("keeps the English text as well", () => {
    const r = calculateEstimate(base({ pickupTime: "10:00" }));
    assert.ok(r.ok);
    assert.equal(r.bandReason, "Day rate (06:00–23:00)");
  });

  it("gives the mileage line its miles and rate", () => {
    const r = calculateEstimate(base({ miles: 10 }));
    assert.ok(r.ok);
    const line = r.lines.find((l) => l.key === "mileage");
    assert.deepEqual(line?.params, { miles: 10, rate: "£2.40" });
    assert.equal(line?.detail, "10 miles × £2.40");
  });

  it("names the airport on airport lines (fee known and 'confirmed on quote')", () => {
    const known = calculateEstimate(base({ miles: 10, pickupAirportId: "stansted", dropoffAirportId: "heathrow" }));
    assert.ok(known.ok);
    assert.equal(known.lines.find((l) => l.key === "airport-pickup")?.params?.airport, "Stansted");
    assert.equal(known.lines.find((l) => l.key === "airport-dropoff")?.params?.airport, "London Heathrow");
    const pending = calculateEstimate(base({ miles: 10, dropoffAirportId: "london-city" }));
    assert.ok(pending.ok);
    assert.equal(pending.lines.find((l) => l.key === "airport-dropoff")?.params?.airport, "London City");
  });

  it("explains the Congestion Charge with a code", () => {
    const outside = calculateEstimate(base({ inCongestionZone: false }));
    assert.ok(outside.ok);
    assert.equal(outside.congestion.reasonCode, "outside-zone");
    assert.deepEqual(outside.congestion.reasonParams, {});

    const charged = calculateEstimate(base({ inCongestionZone: true }));
    assert.ok(charged.ok);
    assert.equal(charged.congestion.reasonCode, "in-charging-hours");

    const weekday = calculateEstimate(base({ inCongestionZone: true, pickupTime: "20:00" }));
    assert.ok(weekday.ok);
    assert.equal(weekday.congestion.reasonCode, "outside-hours");
    assert.deepEqual(weekday.congestion.reasonParams, { day: "weekdays" });

    const weekend = calculateEstimate(base({ inCongestionZone: true, pickupDate: SATURDAY, pickupTime: "20:00" }));
    assert.ok(weekend.ok);
    assert.deepEqual(weekend.congestion.reasonParams, { day: "weekends" });
  });
});

describe("date helpers", () => {
  it("validates dates and works out weekdays", () => {
    assert.equal(isValidDate("2026-02-29"), false);
    assert.equal(isValidDate("2028-02-29"), true);
    assert.equal(weekdayOf(TUESDAY), 2);
    assert.equal(weekdayOf(SATURDAY), 6);
    assert.equal(weekdayOf(SUNDAY), 0);
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(daysBetween("2026-10-01", "2026-10-31"), 30);
    assert.equal(formatDateLong("2026-10-06"), "Tue 6 Oct 2026");
  });

  it("reads London time correctly across summer and winter time", () => {
    // 12:30 UTC in July is 13:30 in London (BST); in January it is 12:30 (GMT)
    assert.equal(londonNow(new Date("2026-07-01T12:30:00Z")).time, "13:30");
    assert.equal(londonNow(new Date("2026-01-15T12:30:00Z")).time, "12:30");
    assert.equal(londonNow(new Date("2026-06-30T23:30:00Z")).date, "2026-07-01");
  });
});
