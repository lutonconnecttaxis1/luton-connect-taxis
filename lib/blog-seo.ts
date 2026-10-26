import type { Metadata } from "next";
import type { BlogPost } from "@/content/blog";
import { siteConfig } from "@/config/site";
import { absoluteUrl, alternateLanguages, localeInfo, type Locale } from "@/lib/i18n/config";

/** Address of the blog index or of one article in a given language. */
export const blogUrl = (locale: Locale, slug?: string) => absoluteUrl(siteConfig.url, locale, slug ? `/blog/${slug}` : "/blog");

const blogAlternates = (locale: Locale, slug?: string): NonNullable<Metadata["alternates"]> => ({
  canonical: blogUrl(locale, slug),
  languages: alternateLanguages(siteConfig.url, slug ? `/blog/${slug}` : "/blog"),
});

export function blogIndexMetadata(locale: Locale, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: blogAlternates(locale),
    openGraph: { title, description, url: blogUrl(locale), siteName: siteConfig.name, locale: localeInfo[locale].og, type: "website" },
  };
}

export function postMetadata(post: BlogPost, locale: Locale): Metadata {
  const image = `${siteConfig.url.replace(/\/$/, "")}${post.photo.src}`;
  return {
    title: post.title,
    description: post.description,
    alternates: blogAlternates(locale, post.slug),
    openGraph: {
      title: post.title,
      description: post.description,
      url: blogUrl(locale, post.slug),
      siteName: siteConfig.name,
      locale: localeInfo[locale].og,
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
      authors: [siteConfig.name],
      images: [{ url: image }],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description, images: [image] },
  };
}

/** schema.org data for one article (BlogPosting + breadcrumbs), as a JSON string safe to place in a <script>. */
export function postJsonLd(post: BlogPost, locale: Locale, labels: { home: string; blog: string }): string {
  const site = siteConfig.url.replace(/\/$/, "");
  const url = blogUrl(locale, post.slug);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.published,
        dateModified: post.updated ?? post.published,
        inLanguage: localeInfo[locale].htmlLang,
        image: `${site}${post.photo.src}`,
        mainEntityOfPage: url,
        author: { "@type": "Organization", name: siteConfig.name, url: site },
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
          url: site,
          logo: { "@type": "ImageObject", url: `${site}/brand/logo-on-dark.png` },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: labels.home, item: absoluteUrl(siteConfig.url, locale, "") },
          { "@type": "ListItem", position: 2, name: labels.blog, item: blogUrl(locale) },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };
  // "<" is escaped so the text can never close the script tag early.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** "26 October 2026" / "26 octobre 2026" / "2026年10月26日" – written the way the visitor's language writes dates. */
export function formatPostDate(date: string, locale: Locale): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat(localeInfo[locale].intl, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(d);
}
