import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, LOCALE_HEADER } from "@/lib/i18n/config";
import { routeRequest } from "@/lib/i18n/routing";
import { NONCE_HEADER, buildCsp, cspHeaderName, cspMode, generateNonce } from "@/lib/security/csp";

/**
 * Language routing (rules in lib/i18n/routing.ts).
 * English has no prefix and is rewritten internally to /en/…; other languages are prefixed (/ro/…).
 * A first-time visitor always gets English; a visitor who picked another language (cookie lct_lang) is taken to it.
 */
export function middleware(request: NextRequest) {
  const route = routeRequest(request.nextUrl.pathname, request.method, request.cookies.get(LANG_COOKIE)?.value);
  const url = request.nextUrl.clone();

  if (route.action === "redirect") {
    url.pathname = route.pathname;
    return NextResponse.redirect(url, route.status);
  }

  // The 404 page is not given the route params, so it reads the language from this request header.
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, route.locale);

  // Content-Security-Policy with a fresh nonce per request (rules in lib/security/csp.ts).
  // Next.js reads the nonce from the request header below and stamps it on its own scripts.
  const mode = cspMode();
  let cspName: string | null = null;
  let csp = "";
  if (mode !== "off") {
    const nonce = generateNonce();
    cspName = cspHeaderName(mode);
    csp = buildCsp({
      nonce,
      isDev: process.env.NODE_ENV !== "production",
      isPreview: process.env.VERCEL_ENV === "preview",
      reportUri: mode === "report-only" ? "/api/csp-report" : undefined,
      reportOnly: mode === "report-only",
    });
    headers.set(NONCE_HEADER, nonce);
    headers.set(cspName, csp);
  }

  const response =
    route.action === "rewrite"
      ? NextResponse.rewrite(Object.assign(url, { pathname: route.pathname }), { request: { headers } })
      : NextResponse.next({ request: { headers } });
  if (cspName) response.headers.set(cspName, csp);
  return response;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension (images, sitemap.xml …).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
