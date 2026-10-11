import { validateResetEmail } from "@/lib/account";
import { json, identityFailure, looksAutomated, readJsonBody, WINDOW_MS } from "@/lib/auth/http";
import { sendPasswordReset } from "@/lib/auth/identity";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/reset – Firebase emails a reset link. The answer is always
 * "sent", so nobody can use this to find out who has an account.
 */
export async function POST(request: Request) {
  const read = await readJsonBody(request);
  if (!read.ok) return read.response;

  if (looksAutomated(read.body, 1_500) === "honeypot") return json({ ok: true });

  const ip = clientIp(request);
  if (!rateLimit(`reset-ip:${ip}`, 5, WINDOW_MS)) return json({ ok: false, error: "rate-limited" }, 429);

  const validated = validateResetEmail(read.body);
  if (!validated.ok) return json({ ok: false, error: "invalid", errors: validated.errors }, 422);
  if (!rateLimit(`reset-email:${validated.data.email}`, 3, WINDOW_MS)) return json({ ok: true });

  try {
    await sendPasswordReset(validated.data.email);
    return json({ ok: true });
  } catch (error) {
    return identityFailure(error);
  }
}
