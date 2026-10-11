import { json, requireSession } from "@/lib/auth/http";
import { listMyBookings } from "@/lib/customers";
import { isFirestoreConfigured } from "@/lib/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/account/bookings – the signed-in customer's own bookings, newest first. */
export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  if (!isFirestoreConfigured()) return json({ ok: false, error: "storage-unavailable" }, 503, session.cookies);
  try {
    const bookings = await listMyBookings(session.user.uid);
    return json({ ok: true, bookings }, 200, session.cookies);
  } catch (error) {
    console.error("[account] Could not load bookings:", error);
    return json({ ok: false, error: "storage-unavailable" }, 503, session.cookies);
  }
}
