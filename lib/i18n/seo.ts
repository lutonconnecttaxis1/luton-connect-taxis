import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { absoluteUrl, alternateLanguages, localeInfo, type Locale } from "./config";

/** Canonical address + hreflang links for one page. `path` is the English path: "/fleet", "/services/airport-transfers", "/". */
export function baseAlternates(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: absoluteUrl(siteConfig.url, locale, path),
    languages: alternateLanguages(siteConfig.url, path),
  };
}

/**
 * Search results show about 160 characters of a description. Longer text is cut at a sentence or
 * word boundary so the visible part still reads well.
 */
export function fitDescription(text: string, max = 158): string {
  const s = text.trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("。"));
  if (sentence >= max * 0.6) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(" ");
  const base = (space >= max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, "");
  return `${base}…`;
}

/** Title, description and language links for a page's generateMetadata. */
export function pageMetadata(
  locale: Locale,
  path: string,
  { title, description: rawDescription }: { title: string; description: string },
): Metadata {
  const description = fitDescription(rawDescription);
  return {
    title,
    description,
    alternates: baseAlternates(locale, path),
    openGraph: {
      title,
      description,
      url: absoluteUrl(siteConfig.url, locale, path),
      siteName: siteConfig.name,
      locale: localeInfo[locale].og,
      type: "website",
    },
  };
}
