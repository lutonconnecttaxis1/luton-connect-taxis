import { posts as englishPosts, type BlogPost, type PostText } from "@/content/blog";
import { posts as de } from "@/content/blog-i18n/de";
import { posts as es } from "@/content/blog-i18n/es";
import { posts as fr } from "@/content/blog-i18n/fr";
import { posts as it } from "@/content/blog-i18n/it";
import { posts as ro } from "@/content/blog-i18n/ro";
import { posts as zh } from "@/content/blog-i18n/zh";
import { defaultLocale, type Locale } from "@/lib/i18n/config";

/** Translated article text per language, keyed by article slug. English is the original in content/blog.ts. */
export const blogTranslations: Record<Exclude<Locale, "en">, Record<string, PostText>> = { ro, es, it, fr, zh, de };

/** An article in the visitor's language. Falls back to English for any article not yet translated. */
export function localizePost(post: BlogPost, locale: Locale): BlogPost {
  if (locale === defaultLocale) return post;
  const text = blogTranslations[locale as Exclude<Locale, "en">]?.[post.slug];
  return text ? { ...post, ...text } : post;
}

export const localizedPosts = (locale: Locale): BlogPost[] => englishPosts.map((post) => localizePost(post, locale));

export function getLocalizedPost(slug: string, locale: Locale): BlogPost | undefined {
  const post = englishPosts.find((p) => p.slug === slug);
  return post ? localizePost(post, locale) : undefined;
}
