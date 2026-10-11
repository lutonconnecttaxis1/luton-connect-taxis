import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { AutocompleteError, explainPlacesProblem, fetchSuggestions } from "./autocomplete";

const realFetch = globalThis.fetch;
type Init = RequestInit & { headers: Record<string, string> };
let last: { url: string; init: Init } | null = null;

beforeEach(() => {
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "browser-key";
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
});

function mock(status: number, body: unknown) {
  globalThis.fetch = (async (url: string, init: Init) => {
    last = { url, init };
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}

describe("fetchSuggestions", () => {
  it("asks Places (New) for UK suggestions near Luton and maps the answer", async () => {
    mock(200, {
      suggestions: [
        {
          placePrediction: {
            placeId: "ChIJabc",
            text: { text: "Luton Airport, Airport Way, Luton, UK" },
            structuredFormat: { mainText: { text: "Luton Airport" }, secondaryText: { text: "Airport Way, Luton, UK" } },
          },
        },
        { queryPrediction: { text: { text: "luton taxi" } } }, // ignored
        { placePrediction: { placeId: "ChIJdef", text: { text: "Luton Station, UK" } } },
      ],
    });
    const out = await fetchSuggestions("luton", "session-1");
    assert.equal(last!.url, "https://places.googleapis.com/v1/places:autocomplete");
    assert.equal(last!.init.headers["X-Goog-Api-Key"], "browser-key");
    const sent = JSON.parse(last!.init.body as string);
    assert.deepEqual(sent.includedRegionCodes, ["gb"]);
    assert.equal(sent.sessionToken, "session-1");
    assert.equal(sent.locationBias.circle.radius, 50000);
    assert.deepEqual(out, [
      { placeId: "ChIJabc", text: "Luton Airport, Airport Way, Luton, UK", main: "Luton Airport", secondary: "Airport Way, Luton, UK" },
      { placeId: "ChIJdef", text: "Luton Station, UK", main: "Luton Station, UK", secondary: "" },
    ]);
  });

  it("returns an empty list when nothing matches", async () => {
    mock(200, {});
    assert.deepEqual(await fetchSuggestions("zzzzzz", "s"), []);
  });

  it("reports a missing key and Google errors clearly", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    await assert.rejects(() => fetchSuggestions("luton", "s"), (e: unknown) => e instanceof AutocompleteError && e.kind === "no-key");
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "k";
    mock(403, { error: { message: "referrer blocked" } });
    await assert.rejects(() => fetchSuggestions("luton", "s"), (e: unknown) => e instanceof AutocompleteError && e.kind === "failed");
  });
});

describe("explainPlacesProblem", () => {
  const body = (status: string, message: string, reason?: string) => ({
    error: { status, message, details: reason ? [{ reason }] : [] },
  });
  it("recognises the usual setup mistakes", () => {
    assert.match(explainPlacesProblem(403, body("PERMISSION_DENIED", "Requests from referer <empty> are blocked.", "API_KEY_HTTP_REFERRER_BLOCKED")), /localhost:3000/);
    assert.match(explainPlacesProblem(403, body("PERMISSION_DENIED", "x", "API_KEY_SERVICE_BLOCKED")), /API restrictions/);
    assert.match(explainPlacesProblem(403, body("PERMISSION_DENIED", "Places API (New) has not been used in project 1 before or it is disabled.", "SERVICE_DISABLED")), /enable Places API \(New\)/);
    assert.match(explainPlacesProblem(400, body("INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.", "API_KEY_INVALID")), /restart npm run dev/);
  });
  it("falls back to Google's own words", () => {
    assert.equal(explainPlacesProblem(500, body("INTERNAL", "Boom")), "Google answered 500: Boom.");
    assert.equal(explainPlacesProblem(502, null), "Google answered 502.");
  });
});
