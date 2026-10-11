import type { MetadataRoute } from "next";
import { services } from "@/components/home/service-data";
import { siteConfig } from "@/config/site";
import { absoluteUrl, alternateLanguages, locales } from "@/lib/i18n/config";

/** One entry per page per language; each entry lists the same page in every other language (hreflang). */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/fleet",
    "/contact",
    "/blog",
    ...services.map((s) => `/services/${s.slug}`),
    "/terms",
    "/privacy",
    "/cookies",
  ];
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: absoluteUrl(siteConfig.url, locale, path),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path.startsWith("/services") || path === "/fleet" ? 0.8 : 0.5,
      alternates: { languages: alternateLanguages(siteConfig.url, path) },
    })),
  );
}
