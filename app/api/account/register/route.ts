import { validateRegister } from "@/lib/account";
import { json, identityFailure, looksAutomated, readJsonBody, WINDOW_MS } from "@/lib/auth/http";
import { signUp } from "@/lib/auth/identity";
import { loginCookies } from "@/lib/auth/session";
import { saveProfile } from "@/lib/customers";
import { isFirestoreConfigured } from "@/lib/firestore";
import { rateLimit } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { clientIp } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_FILL_MS = 3_000;

/** POST /api/account/register – create a login, save the name/phone, sign the browser in. */
export async function POST(request: Request) {
  const read = await readJsonBody(request);
  if (!read.ok) return read.response;
  const { body } = read;

  const bot = looksAutomated(body, MIN_FILL_MS);
  if (bot === "honeypot") return json({ ok: true, user: null });
  if (bot === "too-fast") return json({ ok: false, error: "too-fast" }, 429);

  const ip = clientIp(request);
  if (!rateLimit(`register:${ip}`, 5, WINDOW_MS)) return json({ ok: false, error: "rate-limited" }, 429);

  const captcha = await verifyRecaptcha(body.recaptchaToken, "register", ip);
  if (!captcha.ok) return json({ ok: false, error: "captcha-failed" }, 403);

  const validated = validateRegister(body);
  if (!validated.ok) return json({ ok: false, error: "invalid", errors: validated.errors }, 422);
  const { name, email, phone, password } = validated.data;

  try {
    const tokens = await signUp(email, password);
    if (isFirestoreConfigured()) {
      // The login exists now; a profile hiccup must not stop the person getting in.
      await saveProfile(tokens.uid, { name, phone, email }).catch((error) =>
        console.error("[account] Could not save the profile:", error),
      );
    }
    return json({ ok: true, user: { uid: tokens.uid, email, name, phone } }, 200, loginCookies(request, tokens));
  } catch (error) {
    return identityFailure(error);
  }
}
