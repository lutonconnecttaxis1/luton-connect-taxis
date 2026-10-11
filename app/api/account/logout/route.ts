import { json } from "@/lib/auth/http";
import { logoutCookies } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/logout – clear the login cookies. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ ok: false, error: "forbidden" }, 403);
  return json({ ok: true }, 200, logoutCookies(request));
}
