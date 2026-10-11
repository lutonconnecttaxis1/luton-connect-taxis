import { defaultLocale, isLocale, localeHref, splitLocale, type Locale } from "./config";

/** What the middleware should do with a request. Pure, so it can be unit tested. */
export type Route =
  | { action: "next"; locale: Locale }
  | { action: "redirect"; pathname: string; status: 307 | 308 }
  | { action: "rewrite"; pathname: string; locale: Locale };

/**
 * - /ro/fleet            → served as is (Romanian).
 * - /en/fleet            → permanent redirect to /fleet (one English address per page).
 * - /fleet               → English, served from /en/fleet internally – unless the visitor has chosen
 *                          another language with the language menu (cookie), then → /ro/fleet (temporary redirect).
 */
export function routeRequest(pathname: string, method: string, rememberedLanguage: string | undefined): Route {
  const { locale, rest, prefixed } = splitLocale(pathname);

  if (prefixed) {
    if (locale === defaultLocale) return { action: "redirect", pathname: rest, status: 308 };
    return { action: "next", locale };
  }

  if (isLocale(rememberedLanguage) && rememberedLanguage !== defaultLocale && (method === "GET" || method === "HEAD")) {
    return { action: "redirect", pathname: localeHref(rememberedLanguage, pathname), status: 307 };
  }

  return { action: "rewrite", pathname: `/${defaultLocale}${pathname === "/" ? "" : pathname}`, locale: defaultLocale };
}
