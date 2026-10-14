import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { clearPlaceTypesCache, fetchPlaceTypes } from "./placeTypes";

const realFetch = globalThis.fetch;
let calls = 0;
function mockFetch(status: number, body: unknown) {
  calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}

beforeEach(() => {
  clearPlaceTypesCache();
  process.env.GOOGLE_MAPS_SERVER_API_KEY = "test-server-key";
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchPlaceTypes", () => {
  it("returns Google's types and caches them", async () => {
    mockFetch(200, { types: ["airport", "point_of_interest"] });
    assert.deepEqual(await fetchPlaceTypes("ChIJ_airport_00001"), ["airport", "point_of_interest"]);
    await fetchPlaceTypes("ChIJ_airport_00001");
    assert.equal(calls, 1);
  });

  it("returns null (unknown) when Google refuses", async () => {
    mockFetch(403, { error: { status: "PERMISSION_DENIED" } });
    assert.equal(await fetchPlaceTypes("ChIJ_refused_00001"), null);
  });

  it("returns null without a key and does not call Google", async () => {
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    mockFetch(200, { types: ["airport"] });
    assert.equal(await fetchPlaceTypes("ChIJ_nokey_0000001"), null);
    assert.equal(calls, 0);
  });
});
