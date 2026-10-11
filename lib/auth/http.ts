import { NextResponse } from "next/server";
import { IdentityError } from "./identity";
import { applyCookies, readSession, type Session } from "./session";
import { sameOrigin } from "@/lib/request";

/** Shared plumbing for the /api/account/* routes. SERVER ONLY. */

export const MAX_BODY_BYTES = 10_000;
export const WINDOW_MS = 10 * 60 * 1000;

export function json(body: Record<string, unknown>, status = 200, cookies: string[] = []) {
  return applyCookies(NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }), cookies);
}

/** Origin check, size cap and JSON parse in one go. Returns a ready-made error response on failure. */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  if (!sameOrigin(request)) return { ok: false, response: json({ ok: false, error: "forbidden" }, 403) };
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return { ok: false, response: json({ ok: false, error: "too-large" }, 413) };
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad body");
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, response: json({ ok: false, error: "bad-request" }, 400) };
  }
}

/** Bots fill hidden fields and submit instantly; people do neither. */
export function looksAutomated(body: Record<string, unknown>, minFillMs: number): "honeypot" | "too-fast" | null {
  if (typeof body.website === "string" && body.website.trim() !== "") return "honeypot";
  const openedAt = Number(body.openedAt);
  if (Number.isFinite(openedAt) && Date.now() - openedAt < minFillMs) return "too-fast";
  return null;
}

/** Turns a Firebase problem into a response the form understands. The developer hint is never sent in production. */
export function identityFailure(error: unknown, cookies: string[] = []) {
  if (error instanceof IdentityError) {
    const hint = process.env.NODE_ENV !== "production" && error.detail ? { hint: error.detail } : {};
    switch (error.kind) {
      case "email-exists":
        return json({ ok: false, error: "email-exists" }, 409, cookies);
      case "invalid-credentials":
        return json({ ok: false, error: "invalid-credentials" }, 401, cookies);
      case "weak-password":
        return json({ ok: false, error: "invalid", errors: { password: "Choose a stronger password – at least 8 characters." } }, 422, cookies);
      case "too-many-attempts":
        return json({ ok: false, error: "rate-limited" }, 429, cookies);
      case "user-disabled":
        return json({ ok: false, error: "disabled" }, 403, cookies);
      case "token-expired":
        return json({ ok: false, error: "signed-out" }, 401, cookies);
      default:
        return json({ ok: false, error: "accounts-unavailable", ...hint }, 503, cookies);
    }
  }
  console.error("[account] Unexpected problem:", error);
  return json({ ok: false, error: "accounts-unavailable" }, 503, cookies);
}

/** For routes that need a signed-in person. */
export async function requireSession(
  request: Request,
): Promise<{ ok: true; session: Session & { user: NonNullable<Session["user"]> } } | { ok: false; response: NextResponse }> {
  const session = await readSession(request);
  if (!session.user) return { ok: false, response: json({ ok: false, error: "signed-out" }, 401, session.cookies) };
  return { ok: true, session: session as Session & { user: NonNullable<Session["user"]> } };
}
