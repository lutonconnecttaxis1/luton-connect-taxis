/** Small geography helpers – pure functions, no network. */
export type LatLng = { lat: number; lng: number };
/** [longitude, latitude] – the order GeoJSON and our zone data use. */
export type Ring = ReadonlyArray<readonly [number, number]>;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Ray-casting point-in-polygon on a [lng, lat] ring. */
export function pointInRing(point: LatLng, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

type Pt = readonly [number, number];

function orient(a: Pt, b: Pt, c: Pt): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/** Do segments p1-p2 and p3-p4 cross? (Proper crossing; touching ends are ignored.) */
export function segmentsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d1 = orient(p3, p4, p1);
  const d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3);
  const d4 = orient(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Does a route (list of points) enter the ring – a point inside, or a segment crossing its edge? */
export function pathTouchesRing(path: readonly LatLng[], ring: Ring): boolean {
  if (path.length === 0) return false;
  for (const p of path) if (pointInRing(p, ring)) return true;
  for (let i = 0; i < path.length - 1; i++) {
    const a: Pt = [path[i].lng, path[i].lat];
    const b: Pt = [path[i + 1].lng, path[i + 1].lat];
    for (let j = 0, k = ring.length - 1; j < ring.length; k = j++) {
      if (segmentsCross(a, b, ring[k], ring[j])) return true;
    }
  }
  return false;
}

/** Shrink a ring towards its centre (factor < 1), e.g. to ignore boundary-road noise. */
export function shrinkRing(ring: Ring, factor: number): Ring {
  const cx = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
  const cy = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
  return ring.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor] as const);
}

/** Decode a Google encoded polyline (precision 5). */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of ["lat", "lng"] as const) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index <= encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === "lat") lat += delta;
      else lng += delta;
    }
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
