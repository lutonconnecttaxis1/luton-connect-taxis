import { json, identityFailure, readJsonBody, requireSession, WINDOW_MS } from "@/lib/auth/http";
import { deleteLogin, signIn } from "@/lib/auth/identity";
import { logoutCookies } from "@/lib/auth/session";
import { eraseAccountData } from "@/lib/customers";
import { isFirestoreConfigured } from "@/lib/firestore";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/delete – the person types their password again, then the
 * login and profile are deleted. Their bookings stay (the business keeps its
 * records) but are no longer linked to anyone's login.
 */
export async function POST(request: Request) {
  const read = await readJsonBody(request);
  if (!read.ok) return read.response;
  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const password = typeof read.body.password === "string" ? read.body.password : "";
  if (!password) return json({ ok: false, error: "invalid", errors: { password: "Please enter your password to confirm." } }, 422, session.cookies);
  if (!rateLimit(`delete:${session.user.uid}`, 5, WINDOW_MS)) return json({ ok: false, error: "rate-limited" }, 429, session.cookies);

  try {
    // A fresh sign-in proves it is really them (and Firebase requires a recent one to delete).
    const fresh = await signIn(session.user.email, password);
    await deleteLogin(fresh.idToken);
  } catch (error) {
    return identityFailure(error, session.cookies);
  }

  // The login is gone. Clear what we kept about them; if this fails, say so loudly for the office.
  if (isFirestoreConfigured()) {
    try {
      const { detached } = await eraseAccountData(session.user.uid);
      console.info(`[account] Deleted account ${session.user.uid}; detached ${detached} booking(s).`);
    } catch (error) {
      console.error(`[account] Login ${session.user.uid} deleted but its Firestore data could not be cleared:`, error);
    }
  }
  return json({ ok: true }, 200, logoutCookies(request));
}
