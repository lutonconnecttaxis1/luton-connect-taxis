/**
 * Languages and address helpers. No React, no Node-only imports – safe in the
 * browser, on the server and in the middleware.
 *
 * English is the default and has NO prefix (/fleet). Every other language is
 * prefixed (/ro/fleet, /zh/fleet …). To add a language later: add it here,
 * add messages/<code>.json, run `npm test`.
 */
export const locales = ["en", "ro", "es", "it", "fr", "zh", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export type LocaleInfo = {
  /** Name written in its own language (shown in the language menu). */
  name: string;
  /** Short label for the menu button. */
  short: string;
  /** Value for <html lang> and hreflang. */
  htmlLang: string;
  /** Locale passed to Intl (dates, numbers). */
  intl: string;
  /** Open Graph locale. */
  og: string;
};

export const localeInfo: Record<Locale, LocaleInfo> = {
  en: { name: "English", short: "EN", htmlLang: "en-GB", intl: "en-GB", og: "en_GB" },
  ro: { name: "Română", short: "RO", htmlLang: "ro", intl: "ro-RO", og: "ro_RO" },
  es: { name: "Español", short: "ES", htmlLang: "es", intl: "es-ES", og: "es_ES" },
  it: { name: "Italiano", short: "IT", htmlLang: "it", intl: "it-IT", og: "it_IT" },
  fr: { name: "Français", short: "FR", htmlLang: "fr", intl: "fr-FR", og: "fr_FR" },
  zh: { name: "中文（简体）", short: "中文", htmlLang: "zh-Hans", intl: "zh-CN", og: "zh_CN" },
  de: { name: "Deutsch", short: "DE", htmlLang: "de", intl: "de-DE", og: "de_DE" },
};

/** The visitor's chosen language is remembered in this cookie (set only when they pick one). */
export const LANG_COOKIE = "lct_lang";
/** Set by the middleware on every request so pages without route params (the 404 page) know the language. */
export const LOCALE_HEADER = "x-lct-locale";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Splits "/ro/fleet" into { locale: "ro", rest: "/fleet" }. Unprefixed paths are English. */
export function splitLocale(pathname: string): { locale: Locale; rest: string; prefixed: boolean } {
  const match = /^\/([^/]+)(\/.*)?$/.exec(pathname);
  if (match && isLocale(match[1])) {
    return { locale: match[1], rest: match[2] || "/", prefixed: true };
  }
  return { locale: defaultLocale, rest: pathname || "/", prefixed: false };
}

/** Paths that must never get a language prefix (API routes, files, Next internals). */
function isUnprefixable(path: string): boolean {
  if (path.startsWith("/api/") || path === "/api" || path.startsWith("/_next/")) return true;
  const last = path.split(/[?#]/)[0].split("/").pop() ?? "";
  return last.includes("."); // /brand/logo.png, /sitemap.xml …
}

/**
 * Makes an internal link point at the right language.
 *   localeHref("ro", "/fleet")   → "/ro/fleet"
 *   localeHref("ro", "/#quote")  → "/ro#quote"
 *   localeHref("en", "/fleet")   → "/fleet"
 * Anything that is not an internal path (https:, tel:, mailto:, #hash, ?query) is returned unchanged.
 */
export function localeHref(locale: Locale, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (isUnprefixable(href)) return href;
  // Already prefixed? Swap the language rather than stacking two.
  const { rest, prefixed } = splitLocale(href.split(/[?#]/)[0]);
  const tail = href.slice(href.split(/[?#]/)[0].length); // "?x=1#y"
  const clean = prefixed ? rest : href.split(/[?#]/)[0];
  if (locale === defaultLocale) return `${clean}${tail}` || "/";
  return `/${locale}${clean === "/" ? "" : clean}${tail}`;
}

/** Absolute URL of a page in a given language (for canonical links, hreflang and the sitemap). */
export function absoluteUrl(siteUrl: string, locale: Locale, path: string): string {
  return `${siteUrl.replace(/\/$/, "")}${localeHref(locale, path === "" ? "/" : path)}`.replace(/\/$/, "") || siteUrl;
}

/** hreflang map: every language plus x-default (English). */
export function alternateLanguages(siteUrl: string, path: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const l of locales) map[localeInfo[l].htmlLang] = absoluteUrl(siteUrl, l, path);
  map["x-default"] = absoluteUrl(siteUrl, defaultLocale, path);
  return map;
}

/** For route params (always a string): the language, or English if it is somehow not one of ours. */
export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}
