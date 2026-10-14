import { airportSites } from "@/config/airports";
import { congestionZone } from "@/config/congestion-zone";
import { haversineKm, pathTouchesRing, pointInRing, shrinkRing, type LatLng } from "./geo";

/** Which airport (if any) a coordinate is at. Returns the id used in config/airport-fees.ts. */
export function findAirportId(point: LatLng | null): string | null {
  if (!point) return null;
  let best: { id: string; distance: number } | null = null;
  for (const site of airportSites) {
    const distance = haversineKm(point, site);
    if (distance <= site.radiusKm && (!best || distance < best.distance)) best = { id: site.id, distance };
  }
  return best?.id ?? null;
}

const AIRPORT_TYPES = new Set(["airport", "international_airport", "airstrip", "airport_terminal"]);
const TRANSIT_TYPES = new Set(["transit_station", "train_station", "bus_station", "light_rail_station", "subway_station"]);

/**
 * Is this place the airport itself (terminal, drop-off area…) rather than a hotel,
 * shop or car-hire office that just stands near it? `types` are Google's place
 * types; `text` is the address the customer picked.
 */
export function isAirportPlace(types: readonly string[], text: string): boolean {
  if (types.some((t) => AIRPORT_TYPES.has(t))) return true;
  // Terminals are sometimes typed as transit stations ("Heathrow Terminal 5")
  return types.some((t) => TRANSIT_TYPES.has(t)) && /\bterminal\b/i.test(text);
}

/**
 * The airport id to charge a fee for, or null. A place only counts when it is
 * inside an airport's area AND is the airport itself. When Google's place types
 * are unknown (`types` is null) we fall back to the area check alone.
 */
export function airportIdForPlace(point: LatLng | null, types: readonly string[] | null, text: string): string | null {
  const id = findAirportId(point);
  if (!id) return null;
  if (types === null) return id;
  return isAirportPlace(types, text) ? id : null;
}

export function pointInCongestionZone(point: LatLng | null): boolean {
  return point ? pointInRing(point, congestionZone) : false;
}

/**
 * The route counts as "in the zone" only if it goes properly inside. The outline
 * is approximate and hugs the Inner Ring Road, which is free to drive on, so we
 * test against a slightly smaller ring to avoid charging for boundary-road trips.
 */
const ROUTE_RING = shrinkRing(congestionZone, 0.96);

export function routeEntersCongestionZone(path: readonly LatLng[]): boolean {
  return pathTouchesRing(path, ROUTE_RING);
}
