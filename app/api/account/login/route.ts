import { validateLogin } from "@/lib/account";
import { json, identityFailure, readJsonBody, WINDOW_MS } from "@/lib/auth/http";
import { signIn } from "@/lib/auth/identity";
import { loginCookies } from "@/lib/auth/session";
import { readProfile } from "@/lib/customers";
import { isFirestoreConfigured } from "@/lib/firestore";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/login – check the password with Firebase and sign the browser in. */
export async function POST(request: Request) {
  const read = await readJsonBody(request);
  if (!read.ok) return read.response;

  const validated = validateLogin(read.body);
  if (!validated.ok) return json({ ok: false, error: "invalid", errors: validated.errors }, 422);
  const { email, password } = validated.data;

  // Slow down guessing, both from one place and against one address.
  if (!rateLimit(`login-ip:${clientIp(request)}`, 15, WINDOW_MS) || !rateLimit(`login-email:${email}`, 8, WINDOW_MS)) {
    return json({ ok: false, error: "rate-limited" }, 429);
  }

  try {
    const tokens = await signIn(email, password);
    const user = isFirestoreConfigured()
      ? await readProfile(tokens.uid, tokens.email || email).catch(() => ({ uid: tokens.uid, email, name: "", phone: "" }))
      : { uid: tokens.uid, email, name: "", phone: "" };
    return json({ ok: true, user }, 200, loginCookies(request, tokens));
  } catch (error) {
    return identityFailure(error);
  }
}
