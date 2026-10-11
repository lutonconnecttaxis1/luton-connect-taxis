import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { JourneyInput } from "./journey";
import type { RouteInfo } from "./maps/routes";
import { buildQuote } from "./quote";

const LUTON_TOWN = { lat: 51.8787, lng: -0.42 };
const HEATHROW_T5 = { lat: 51.4723, lng: -0.4885 };
const TRAFALGAR = { lat: 51.508, lng: -0.1281 };

function journey(overrides: Partial<JourneyInput> = {}): JourneyInput {
  return {
    pickup: { placeId: "ChIJ_pickup_000001", text: "Luton" },
    dropoff: { placeId: "ChIJ_dropoff_00002", text: "Heathrow" },
    date: "2026-10-06", // Tuesday
    time: "10:00",
    passengers: 2,
    returnTrip: null,
    ...overrides,
  };
}

function route(overrides: Partial<RouteInfo> = {}): RouteInfo {
  return {
    miles: 25,
    durationMinutes: 40,
    start: LUTON_TOWN,
    end: HEATHROW_T5,
    path: [LUTON_TOWN, { lat: 51.65, lng: -0.45 }, HEATHROW_T5],
    ...overrides,
  };
}

describe("buildQuote", () => {
  it("prices Luton → Heathrow: £8 + 25 miles × £2.40 + £7 airport drop-off = £75", () => {
    const r = buildQuote(journey(), route());
    assert.ok(r.ok);
    assert.equal(r.quote.total, 75);
    assert.equal(r.quote.dropoff.airport, "London Heathrow");
    assert.equal(r.quote.pickup.airport, null);
    assert.equal(r.quote.returnLeg, null);
    assert.equal(r.quote.outbound.lines.some((l) => l.key === "congestion"), false);
  });

  it("adds the Congestion Charge for a weekday trip into the zone", () => {
    const r = buildQuote(
      journey({ dropoff: { placeId: "ChIJ_trafalgar_0003", text: "Trafalgar Square" } }),
      route({ miles: 12, durationMinutes: 45, end: TRAFALGAR, path: [LUTON_TOWN, TRAFALGAR] }),
    );
    assert.ok(r.ok);
    assert.equal(r.quote.total, 54.8); // £8 + £28.80 + £18
  });

  it("prices a return journey as its own leg, with airport fees swapped", () => {
    const r = buildQuote(journey({ returnTrip: { date: "2026-10-09", time: "21:00" } }), route());
    assert.ok(r.ok);
    const back = r.quote.returnLeg;
    assert.ok(back);
    // Return starts at Heathrow: its pickup fee (£7, same as its drop-off fee) is added
    assert.equal(back.lines.some((l) => l.key === "airport-pickup" && l.amount === 7), true);
    assert.equal(back.total, 75); // £8 + £60 day rate + £7 Heathrow pickup
    assert.equal(r.quote.total, 150);
    assert.equal(r.quote.hasPendingFees, false);
  });

  it("uses the night rate for a late-night return leg", () => {
    const r = buildQuote(journey({ returnTrip: { date: "2026-10-09", time: "23:30" } }), route());
    assert.ok(r.ok && r.quote.returnLeg);
    assert.equal(r.quote.returnLeg.band, "night");
    assert.equal(r.quote.returnLeg.total, 92); // £10 + £75 + £7 Heathrow pickup
  });

  it("asks for a call on very long journeys and for more than 6 people", () => {
    const far = buildQuote(journey(), route({ miles: 600 }));
    assert.equal(far.ok, false);
    if (!far.ok) assert.equal(far.reason, "too-far");
    const many = buildQuote(journey({ passengers: 7 }), route());
    assert.equal(many.ok, false);
    if (!many.ok) assert.equal(many.reason, "too-many-passengers");
  });
});
