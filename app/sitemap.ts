import type { MetadataRoute } from "next";
import { services } from "@/components/home/service-data";
import { posts } from "@/content/blog";
import { siteConfig } from "@/config/site";
import { absoluteUrl, alternateLanguages, locales } from "@/lib/i18n/config";

/** One entry per page per language; each entry lists the same page in every other language (hreflang). */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/fleet",
    "/contact",
    ...services.map((s) => `/services/${s.slug}`),
    "/terms",
    "/privacy",
    "/cookies",
  ];
  // The blog index and every article, in every language, each listing its other-language versions.
  const blog: MetadataRoute.Sitemap = [
    ...locales.map((locale) => ({
      url: absoluteUrl(siteConfig.url, locale, "/blog"),
      lastModified: posts[0]?.updated ?? posts[0]?.published,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: { languages: alternateLanguages(siteConfig.url, "/blog") },
    })),
    ...posts.flatMap((post) =>
      locales.map((locale) => ({
        url: absoluteUrl(siteConfig.url, locale, `/blog/${post.slug}`),
        lastModified: post.updated ?? post.published,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages: alternateLanguages(siteConfig.url, `/blog/${post.slug}`) },
      })),
    ),
  ];
  const pages = paths.flatMap((path) =>
    locales.map((locale) => ({
      url: absoluteUrl(siteConfig.url, locale, path),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path.startsWith("/services") || path === "/fleet" ? 0.8 : 0.5,
      alternates: { languages: alternateLanguages(siteConfig.url, path) },
    })),
  );
  return [...pages, ...blog];
}
