import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { congestionZone } from "@/config/congestion-zone";
import { decodePolyline, haversineKm, pointInRing, segmentsCross } from "./geo";
import { findAirportId, pointInCongestionZone, routeEntersCongestionZone } from "./places";

describe("geo basics", () => {
  it("decodes Google's documented polyline example", () => {
    const points = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    assert.deepEqual(points, [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });

  it("measures distance", () => {
    // Luton to Heathrow terminal area is roughly 40 km as the crow flies
    const km = haversineKm({ lat: 51.8747, lng: -0.3683 }, { lat: 51.47, lng: -0.4543 });
    assert.ok(km > 40 && km < 50, `got ${km}`);
  });

  it("point in ring and segment crossing", () => {
    const square = [
      [0, 0],
      [0, 10],
      [10, 10],
      [10, 0],
    ] as const;
    assert.equal(pointInRing({ lat: 5, lng: 5 }, square), true);
    assert.equal(pointInRing({ lat: 15, lng: 5 }, square), false);
    assert.equal(segmentsCross([-5, 5], [15, 5], [0, 0], [0, 10]), true);
    assert.equal(segmentsCross([-5, 20], [15, 20], [0, 0], [0, 10]), false);
  });
});

describe("airport geofences", () => {
  it("finds the airport for terminal-area coordinates", () => {
    assert.equal(findAirportId({ lat: 51.4723, lng: -0.4885 }), "heathrow"); // T5
    assert.equal(findAirportId({ lat: 51.8763, lng: -0.3717 }), "luton");
    assert.equal(findAirportId({ lat: 51.8896, lng: 0.2635 }), "stansted");
    assert.equal(findAirportId({ lat: 51.1566, lng: -0.1612 }), "gatwick");
    assert.equal(findAirportId({ lat: 51.5053, lng: 0.0553 }), "london-city");
  });

  it("returns null away from airports", () => {
    assert.equal(findAirportId({ lat: 51.5074, lng: -0.1278 }), null); // central London
    assert.equal(findAirportId({ lat: 51.8787, lng: -0.42 }), null); // Luton town centre
    assert.equal(findAirportId(null), null);
  });
});

describe("Congestion Charge zone (approximate outline)", () => {
  it("is a closed-enough ring with plenty of points", () => {
    assert.ok(congestionZone.length > 30);
  });

  it("recognises places clearly inside", () => {
    for (const [name, lat, lng] of [
      ["Trafalgar Square", 51.508, -0.1281],
      ["Piccadilly Circus", 51.51, -0.1347],
      ["Oxford Circus", 51.5152, -0.1415],
      ["St Paul's Cathedral", 51.5138, -0.0984],
      ["Waterloo station", 51.5031, -0.1132],
      ["Buckingham Palace", 51.5014, -0.1419],
    ] as const) {
      assert.equal(pointInCongestionZone({ lat, lng }), true, name);
    }
  });

  it("recognises places clearly outside", () => {
    for (const [name, lat, lng] of [
      ["Luton", 51.8787, -0.42],
      ["Heathrow", 51.47, -0.4543],
      ["Camden Town", 51.539, -0.1426],
      ["Paddington station", 51.5154, -0.1755],
      ["Canary Wharf", 51.5054, -0.0235],
      ["Battersea Power Station", 51.4818, -0.1445],
      ["Hyde Park", 51.5073, -0.1657],
    ] as const) {
      assert.equal(pointInCongestionZone({ lat, lng }), false, name);
    }
  });

  it("flags a route that passes through the zone and not one that skirts far north", () => {
    const through = [
      { lat: 51.58, lng: -0.22 }, // Hendon
      { lat: 51.53, lng: -0.15 },
      { lat: 51.5031, lng: -0.1132 }, // Waterloo
    ];
    assert.equal(routeEntersCongestionZone(through), true);

    const crossingOnly = [
      { lat: 51.51, lng: -0.19 }, // west of the zone
      { lat: 51.51, lng: -0.05 }, // east of the zone – a straight line right across it
    ];
    assert.equal(routeEntersCongestionZone(crossingOnly), true);

    const northOfIt = [
      { lat: 51.56, lng: -0.2 },
      { lat: 51.56, lng: -0.05 },
    ];
    assert.equal(routeEntersCongestionZone(northOfIt), false);

    const lutonToHeathrow = [
      { lat: 51.8787, lng: -0.42 },
      { lat: 51.65, lng: -0.45 },
      { lat: 51.47, lng: -0.4543 },
    ];
    assert.equal(routeEntersCongestionZone(lutonToHeathrow), false);
  });
});
