import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { clearRouteCache, computeRoute, RouteError } from "./routes";

const realFetch = globalThis.fetch;
type Call = { url: string; init: RequestInit & { headers: Record<string, string> } };
let calls: Call[] = [];

function mockFetch(status: number, body: unknown) {
  calls = [];
  globalThis.fetch = (async (url: string, init: Call["init"]) => {
    calls.push({ url, init });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as typeof fetch;
}

const goodResponse = {
  routes: [
    {
      distanceMeters: 16093.44,
      duration: "1800s",
      polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" },
      legs: [
        {
          startLocation: { latLng: { latitude: 51.87, longitude: -0.37 } },
          endLocation: { latLng: { latitude: 51.47, longitude: -0.45 } },
        },
      ],
    },
  ],
};

beforeEach(() => {
  clearRouteCache();
  process.env.GOOGLE_MAPS_SERVER_API_KEY = "test-server-key";
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("computeRoute", () => {
  it("asks Google for the route between two place ids and converts the answer", async () => {
    mockFetch(200, goodResponse);
    const route = await computeRoute("ChIJ_pickup_000001", "ChIJ_dropoff_00002");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://routes.googleapis.com/directions/v2:computeRoutes");
    assert.equal(calls[0].init.headers["X-Goog-Api-Key"], "test-server-key");
    assert.match(calls[0].init.headers["X-Goog-FieldMask"], /routes\.polyline/);
    const sent = JSON.parse(calls[0].init.body as string);
    assert.deepEqual(sent.origin, { placeId: "ChIJ_pickup_000001" });
    assert.deepEqual(sent.destination, { placeId: "ChIJ_dropoff_00002" });
    assert.equal(sent.travelMode, "DRIVE");
    assert.equal(route.miles, 10);
    assert.equal(route.durationMinutes, 30);
    assert.deepEqual(route.start, { lat: 51.87, lng: -0.37 });
    assert.equal(route.path.length, 3);
  });

  it("does not call Google twice for the same two places", async () => {
    mockFetch(200, goodResponse);
    await computeRoute("ChIJ_a_0000000001", "ChIJ_b_0000000002");
    await computeRoute("ChIJ_a_0000000001", "ChIJ_b_0000000002");
    assert.equal(calls.length, 1);
    await computeRoute("ChIJ_b_0000000002", "ChIJ_a_0000000001"); // other direction is its own lookup
    assert.equal(calls.length, 2);
  });

  it("reports a missing key without calling Google", async () => {
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    mockFetch(200, goodResponse);
    await assert.rejects(
      () => computeRoute("ChIJ_a_0000000001", "ChIJ_b_0000000002"),
      (e: unknown) => e instanceof RouteError && e.kind === "not-configured",
    );
    assert.equal(calls.length, 0);
  });

  it("maps Google's answers to clear error kinds", async () => {
    const kind = async () => {
      try {
        await computeRoute("ChIJ_a_0000000001", "ChIJ_b_0000000002");
      } catch (e) {
        return e instanceof RouteError ? e.kind : "other";
      }
      return "none";
    };
    mockFetch(400, { error: { message: "bad place" } });
    assert.equal(await kind(), "no-route");
    clearRouteCache();
    mockFetch(403, { error: { message: "key restricted" } });
    assert.equal(await kind(), "upstream");
    clearRouteCache();
    mockFetch(200, { routes: [] });
    assert.equal(await kind(), "no-route");
    clearRouteCache();
    mockFetch(200, "not json");
    assert.equal(await kind(), "no-route");
  });

  it("does not mistake a bad or blocked key (also a 400) for 'no route', and explains it", async () => {
    mockFetch(400, { error: { status: "INVALID_ARGUMENT", message: "API key not valid.", details: [{ reason: "API_KEY_INVALID" }] } });
    await assert.rejects(
      () => computeRoute("ChIJ_a_0000000001", "ChIJ_b_0000000002"),
      (e: unknown) => e instanceof RouteError && e.kind === "upstream" && /server key is not valid/.test(e.hint ?? ""),
    );
    clearRouteCache();
    mockFetch(403, { error: { status: "PERMISSION_DENIED", message: "Routes API has not been used in project 1 or it is disabled.", details: [{ reason: "SERVICE_DISABLED" }] } });
    await assert.rejects(
      () => computeRoute("ChIJ_a_0000000001", "ChIJ_b_0000000002"),
      (e: unknown) => e instanceof RouteError && e.kind === "upstream" && /enable Routes API/.test(e.hint ?? ""),
    );
  });

  it("treats a network failure as upstream", async () => {
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    await assert.rejects(
      () => computeRoute("ChIJ_a_0000000001", "ChIJ_b_0000000002"),
      (e: unknown) => e instanceof RouteError && e.kind === "upstream",
    );
  });
});
