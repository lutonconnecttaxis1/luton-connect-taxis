import { json } from "@/lib/auth/http";
import { readSession } from "@/lib/auth/session";
import { readProfile } from "@/lib/customers";
import { isFirestoreConfigured } from "@/lib/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/account/me – who is signed in (user: null for a guest). */
export async function GET(request: Request) {
  const session = await readSession(request);
  if (!session.user) return json({ ok: true, user: null }, 200, session.cookies);

  const { uid, email } = session.user;
  const user = isFirestoreConfigured()
    ? await readProfile(uid, email).catch(() => ({ uid, email, name: "", phone: "" }))
    : { uid, email, name: "", phone: "" };
  return json({ ok: true, user }, 200, session.cookies);
}
