/**
 * What kind of place a Google place is ("airport", "lodging", …), from Place
 * Details (New). SERVER ONLY – uses GOOGLE_MAPS_SERVER_API_KEY. The key must be
 * allowed to use "Places API (New)" as well as Routes API.
 *
 * Used to tell the airport ITSELF from a hotel or shop that merely stands next
 * to it – only the airport itself carries an airport fee.
 * Returns null when Google can't say (no key, error, timeout); callers then
 * fall back to the location-only check.
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 1000;
const cache = new Map<string, { at: number; types: string[] }>();

export async function fetchPlaceTypes(placeId: string): Promise<string[] | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) return null;

  const hit = cache.get(placeId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.types;

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "types" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[places] Place Details answered ${res.status}. Airport fees fall back to location only. ` +
          `Check the server key allows "Places API (New)". ${detail.slice(0, 200)}`,
      );
      return null;
    }
    const data = (await res.json().catch(() => ({}))) as { types?: unknown };
    if (!Array.isArray(data.types)) return null;
    const types = data.types.filter((t): t is string => typeof t === "string");
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(placeId, { at: Date.now(), types });
    return types;
  } catch (error) {
    console.error("[places] Could not look up the place type:", error);
    return null;
  }
}

/** For tests. */
export function clearPlaceTypesCache() {
  cache.clear();
}
