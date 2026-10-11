import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, LOCALE_HEADER } from "@/lib/i18n/config";
import { routeRequest } from "@/lib/i18n/routing";

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

  if (route.action === "rewrite") {
    url.pathname = route.pathname;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except API routes, Next internals and files with an extension (images, sitemap.xml …).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
