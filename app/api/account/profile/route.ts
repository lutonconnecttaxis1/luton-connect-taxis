import { validateProfile } from "@/lib/account";
import { json, readJsonBody, requireSession } from "@/lib/auth/http";
import { saveProfile } from "@/lib/customers";
import { isFirestoreConfigured } from "@/lib/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/profile – save the name and phone used to pre-fill the booking card. */
export async function POST(request: Request) {
  const read = await readJsonBody(request);
  if (!read.ok) return read.response;
  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const validated = validateProfile(read.body);
  if (!validated.ok) return json({ ok: false, error: "invalid", errors: validated.errors }, 422, session.cookies);
  if (!isFirestoreConfigured()) return json({ ok: false, error: "storage-unavailable" }, 503, session.cookies);

  try {
    await saveProfile(session.user.uid, { ...validated.data, email: session.user.email });
    return json(
      { ok: true, user: { uid: session.user.uid, email: session.user.email, ...validated.data } },
      200,
      session.cookies,
    );
  } catch (error) {
    console.error("[account] Could not save the profile:", error);
    return json({ ok: false, error: "storage-unavailable" }, 503, session.cookies);
  }
}
