import type { LatLng } from "@/lib/geo/geo";
import { decodePolyline } from "@/lib/geo/geo";

/**
 * Driving distance, time and route between two Google places, using the Google
 * Routes API. SERVER ONLY – uses GOOGLE_MAPS_SERVER_API_KEY, which must never
 * reach the browser.
 */
export type RouteInfo = {
  miles: number;
  durationMinutes: number;
  start: LatLng;
  end: LatLng;
  path: LatLng[];
};

export class RouteError extends Error {
  constructor(
    public kind: "not-configured" | "no-route" | "upstream",
    message: string,
    /** Plain-English cause for the developer (shown on screen only while developing). */
    public hint?: string,
  ) {
    super(message);
  }
}

/** One sentence about why Google refused a Routes request. */
export function explainRoutesProblem(httpStatus: number, body: string): string {
  const b = body.toLowerCase();
  if (b.includes("service_disabled") || b.includes("has not been used") || b.includes("is disabled")) {
    return "Routes API is not enabled. In Google Cloud → APIs & Services → Library, enable Routes API.";
  }
  if (b.includes("api_key_service_blocked") || b.includes("are blocked")) {
    return "The server key is not allowed to use Routes API. Open the key → API restrictions and tick Routes API.";
  }
  if (b.includes("referer") || b.includes("referrer")) {
    return "The server key has a website (referrer) restriction. Set its Application restriction to None – the server has no website address.";
  }
  if (b.includes("api_key_invalid") || b.includes("api key not valid")) {
    return "Google says the server key is not valid. Check GOOGLE_MAPS_SERVER_API_KEY in .env.local and restart npm run dev.";
  }
  if (b.includes("billing")) return "Billing is not switched on for the Google Cloud project.";
  return `Google's Routes API answered ${httpStatus}. See the terminal for details.`;
}

const METRES_PER_MILE = 1609.344;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { at: number; route: RouteInfo }>();

type RoutesResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: { encodedPolyline?: string };
    legs?: Array<{
      startLocation?: { latLng?: { latitude: number; longitude: number } };
      endLocation?: { latLng?: { latitude: number; longitude: number } };
    }>;
  }>;
};

export async function computeRoute(pickupPlaceId: string, dropoffPlaceId: string): Promise<RouteInfo> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) throw new RouteError(
    "not-configured",
    "GOOGLE_MAPS_SERVER_API_KEY is not set",
    "GOOGLE_MAPS_SERVER_API_KEY is empty. Put the server key in .env.local, then stop and restart npm run dev.",
  );

  // Same two places → same road distance, so repeat lookups are free.
  const cacheKey = `${pickupPlaceId}>${dropoffPlaceId}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.route;

  let res: Response;
  try {
    res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation",
      },
      body: JSON.stringify({
        origin: { placeId: pickupPlaceId },
        destination: { placeId: dropoffPlaceId },
        travelMode: "DRIVE",
        // Cheapest tier: no live traffic. Estimates are not fixed prices anyway.
        routingPreference: "TRAFFIC_UNAWARE",
        regionCode: "GB",
        languageCode: "en-GB",
        units: "IMPERIAL",
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[routes] Could not reach the Routes API:", error);
    throw new RouteError("upstream", "Routes API unreachable", "The server could not reach Google (no internet, or a firewall/VPN is blocking routes.googleapis.com).");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[routes] Routes API answered ${res.status}: ${detail.slice(0, 400)}`);
    // 400 = Google could not use one of the places. A bad/blocked key also answers 400,
    // so look at the reason before calling it "no route".
    const keyProblem = /API_KEY|SERVICE_DISABLED|PERMISSION_DENIED|API key not valid|has not been used|is disabled/i.test(detail);
    throw new RouteError(
      res.status === 400 && !keyProblem ? "no-route" : "upstream",
      `Routes API ${res.status}`,
      explainRoutesProblem(res.status, detail),
    );
  }

  const data = (await res.json().catch(() => ({}))) as RoutesResponse;
  const route = data.routes?.[0];
  const leg = route?.legs?.[0];
  if (
    !route ||
    typeof route.distanceMeters !== "number" ||
    !route.polyline?.encodedPolyline ||
    !leg?.startLocation?.latLng ||
    !leg.endLocation?.latLng
  ) {
    throw new RouteError("no-route", "No driving route between those places");
  }

  const seconds = Number.parseInt(route.duration ?? "0", 10);
  const info: RouteInfo = {
    miles: route.distanceMeters / METRES_PER_MILE,
    durationMinutes: Number.isFinite(seconds) ? Math.round(seconds / 60) : 0,
    start: { lat: leg.startLocation.latLng.latitude, lng: leg.startLocation.latLng.longitude },
    end: { lat: leg.endLocation.latLng.latitude, lng: leg.endLocation.latLng.longitude },
    path: decodePolyline(route.polyline.encodedPolyline),
  };

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(cacheKey, { at: Date.now(), route: info });
  return info;
}

/** For tests. */
export function clearRouteCache() {
  cache.clear();
}
