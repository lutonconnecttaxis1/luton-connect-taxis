import { NextResponse } from "next/server";

/** Simple uptime check: GET /api/health */
export function GET() {
  return NextResponse.json({ ok: true, service: "luton-connect-taxis-website" });
}
