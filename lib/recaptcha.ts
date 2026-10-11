/**
 * reCAPTCHA v3 check (server). SWITCHED OFF until RECAPTCHA_SECRET_KEY is set,
 * so forms work on localhost without it. When the keys are added at launch, the
 * forms start sending a token and this starts enforcing it – no code changes.
 */
const MIN_SCORE = 0.5;

export type CaptchaResult = { ok: true; skipped: boolean } | { ok: false };

export const isRecaptchaEnabled = () => Boolean(process.env.RECAPTCHA_SECRET_KEY);

export async function verifyRecaptcha(token: unknown, action: string, ip?: string): Promise<CaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (typeof token !== "string" || token.length < 20 || token.length > 4000) return { ok: false };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await res.json()) as { success?: boolean; score?: number; action?: string };
    if (!data.success) return { ok: false };
    if (typeof data.score === "number" && data.score < MIN_SCORE) return { ok: false };
    if (data.action && data.action !== action) return { ok: false };
    return { ok: true, skipped: false };
  } catch (error) {
    // Google unreachable: let real customers through; the other protections still apply.
    console.warn("[recaptcha] Could not reach Google, letting the request through:", error);
    return { ok: true, skipped: true };
  }
}
