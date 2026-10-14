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

  describe("airport fees only for the airport itself", () => {
    const LUTON_AIRPORT = { lat: 51.8747, lng: -0.3683 };
    const IBIS = { lat: 51.8766, lng: -0.3735 }; // hotel beside the terminal, inside the airport area
    const hotelRoute = route({ miles: 1.2, durationMinutes: 5, start: LUTON_AIRPORT, end: IBIS, path: [LUTON_AIRPORT, IBIS] });
    const luton = { placeId: "ChIJ_luton_airport1", text: "London Luton Airport (LTN), Luton, UK" };
    const ibis = { placeId: "ChIJ_ibis_hotel_001", text: "ibis London Luton Airport, Spittlesea Road, Luton, UK" };

    it("airport pickup to a hotel next to it: only the pickup fee → £19.88", () => {
      const r = buildQuote(journey({ pickup: luton, dropoff: ibis }), hotelRoute, {
        pickup: ["airport", "point_of_interest", "establishment"],
        dropoff: ["lodging", "point_of_interest", "establishment"],
      });
      assert.ok(r.ok);
      assert.equal(r.quote.total, 19.88);
      assert.equal(r.quote.pickup.airport, "London Luton");
      assert.equal(r.quote.dropoff.airport, null);
      assert.equal(r.quote.outbound.lines.some((l) => l.key === "airport-dropoff"), false);
    });

    it("hotel to airport: only the drop-off fee", () => {
      const r = buildQuote(journey({ pickup: ibis, dropoff: luton }), route({ miles: 1.2, start: IBIS, end: LUTON_AIRPORT, path: [IBIS, LUTON_AIRPORT] }), {
        pickup: ["lodging"],
        dropoff: ["airport"],
      });
      assert.ok(r.ok);
      assert.equal(r.quote.total, 19.88);
      assert.equal(r.quote.outbound.lines.some((l) => l.key === "airport-pickup"), false);
    });

    it("both ends are airports: both fees are added", () => {
      const r = buildQuote(journey({ pickup: luton, dropoff: { placeId: "ChIJ_heathrow_air_1", text: "Heathrow Airport, UK" } }), route({ miles: 25, start: LUTON_AIRPORT }), {
        pickup: ["airport"],
        dropoff: ["airport"],
      });
      assert.ok(r.ok);
      assert.equal(r.quote.total, 8 + 60 + 9 + 7);
    });

    it("no airport at either end: no airport fee, even if a hotel is inside an airport area", () => {
      const r = buildQuote(journey({ pickup: ibis, dropoff: { placeId: "ChIJ_shop_000000001", text: "Shop, Luton" } }), route({ miles: 2, start: IBIS, end: { lat: 51.8787, lng: -0.42 } }), {
        pickup: ["lodging"],
        dropoff: ["store"],
      });
      assert.ok(r.ok);
      assert.equal(r.quote.total, 12.8);
      assert.equal(r.quote.pickup.airport, null);
    });

    it("a terminal typed as a transit station still counts as the airport", () => {
      const r = buildQuote(journey({ pickup: { placeId: "ChIJ_t5_00000000001", text: "Heathrow Terminal 5, UK" } }), route({ start: HEATHROW_T5, end: LUTON_TOWN }), {
        pickup: ["transit_station"],
        dropoff: ["locality"],
      });
      assert.ok(r.ok);
      assert.equal(r.quote.pickup.airport, "London Heathrow");
    });

    it("unknown place types fall back to the location-only check", () => {
      const r = buildQuote(journey({ pickup: luton, dropoff: ibis }), hotelRoute);
      assert.ok(r.ok);
      assert.equal(r.quote.dropoff.airport, "London Luton");
    });
  });
});
