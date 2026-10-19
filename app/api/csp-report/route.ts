import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Receives Content-Security-Policy violation reports while the policy is in test mode
 * (CSP_MODE not set to "enforce") and writes a short line to the Vercel logs, so a blocked
 * resource shows up there even if nobody had the browser console open.
 */
export async function POST(request: Request) {
  try {
    const text = (await request.text()).slice(0, 4000);
    const body = JSON.parse(text) as { "csp-report"?: Record<string, unknown> };
    const r = body["csp-report"] ?? {};
    const pick = (key: string) => String(r[key] ?? "").slice(0, 200);
    console.warn(
      `[csp] ${pick("violated-directive")} blocked ${pick("blocked-uri")} on ${pick("document-uri")} (${pick("source-file")})`,
    );
  } catch {
    // Not a real report – ignore.
  }
  return new NextResponse(null, { status: 204 });
}
