import { NextResponse } from "next/server";
import { validateJourney } from "@/lib/journey";
import { RouteError } from "@/lib/maps/routes";
import { quoteJourney } from "@/lib/quote";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, sameOrigin } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 5_000;
/** Every uncached quote costs a Google Routes request, so keep this modest. */
const MAX_PER_WINDOW = 30;
const WINDOW_MS = 10 * 60 * 1000;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** POST /api/quote – price a journey. Nothing is saved. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ ok: false, error: "forbidden" }, 403);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: "too-large" }, 413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "bad-request" }, 400);
  }

  if (!rateLimit(`quote:${clientIp(request)}`, MAX_PER_WINDOW, WINDOW_MS)) {
    return json({ ok: false, error: "rate-limited" }, 429);
  }

  const journey = validateJourney(body);
  if (!journey.ok) return json({ ok: false, error: "invalid", errors: journey.errors }, 422);

  try {
    const result = await quoteJourney(journey.data);
    if (!result.ok) return json({ ok: false, error: result.reason, message: result.message }, 422);
    return json({ ok: true, quote: result.quote });
  } catch (error) {
    if (error instanceof RouteError) {
      // While developing, say exactly what is wrong (never shown on the live site).
      const hint = process.env.NODE_ENV !== "production" && error.hint ? { hint: error.hint } : {};
      if (error.kind === "no-route") return json({ ok: false, error: "no-route" }, 422);
      if (error.kind === "not-configured") return json({ ok: false, error: "maps-not-configured", ...hint }, 503);
      return json({ ok: false, error: "maps-unavailable", ...hint }, 502);
    }
    console.error("[quote] Unexpected error:", error);
    return json({ ok: false, error: "server-error" }, 500);
  }
}
