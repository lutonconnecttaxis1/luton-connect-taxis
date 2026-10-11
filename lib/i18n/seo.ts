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

/** Title, description and language links for a page's generateMetadata. */
export function pageMetadata(
  locale: Locale,
  path: string,
  { title, description }: { title: string; description: string },
): Metadata {
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
