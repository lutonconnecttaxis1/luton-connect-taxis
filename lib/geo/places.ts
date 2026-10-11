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
