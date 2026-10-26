import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostBody } from "@/components/blog/PostBody";
import { Bg } from "@/components/home/Bg";
import { ArrowIcon } from "@/components/home/icons";
import { SiteShell } from "@/components/home/SiteShell";
import { Link } from "@/components/i18n/Link";
import { getPost, posts, readingMinutes } from "@/content/blog";
import { getLocalizedPost } from "@/lib/blog-i18n";
import { siteConfig } from "@/config/site";
import { formatPostDate, postJsonLd, postMetadata } from "@/lib/blog-seo";
import { defaultLocale, locales, resolveLocale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => posts.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = resolveLocale(locale);
  const post = getLocalizedPost(slug, loc);
  return post ? postMetadata(post, loc) : {};
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const loc = resolveLocale(locale);
  const post = getLocalizedPost(slug, loc);
  const original = getPost(slug); // English original: the reading time is counted from it for every language
  if (!post || !original) notFound();

  const t = getT(loc);
  const related = post.related.map((s) => getLocalizedPost(s, loc)).filter((p) => p !== undefined);

  return (
    <SiteShell locale={loc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: postJsonLd(post, loc, { home: siteConfig.name, blog: t("header.nav.blog") }) }} />

      <section className="sec sec--dark page-head" id="top">
        <div className="container">
          <p className="eyebrow" data-reveal>
            <Link href="/blog">{t("pages.blog.allArticles")}</Link>
          </p>
          <h1 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>
            {post.title}
          </h1>
          <p className="post__byline" data-reveal style={{ ["--d" as string]: "160ms" }}>
            {t("pages.blog.byline", { name: siteConfig.name })} · {formatPostDate(post.published, loc)} ·{" "}
            {t("pages.blog.minRead", { minutes: readingMinutes(original) })}
          </p>
        </div>
      </section>

      <article className="sec sec--light post">
        <div className="container post__in">
          {loc !== defaultLocale && (
            <p className="legal__notice" role="note">
              {t("pages.blog.translatedNotice")}
            </p>
          )}
          <Bg photo={post.photo} className="post__photo" decorative />
          <div className="post__text">
            <PostBody blocks={post.blocks} />
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="sec sec--light blog blog--related">
          <div className="container">
            <h2 className="display" data-reveal>
              {t("pages.blog.keepReading")}
            </h2>
            <ul className="blog__grid">
              {related.map((item) => (
                <li key={item.slug} data-reveal>
                  <Link className="pcard" href={`/blog/${item.slug}`}>
                    <Bg photo={item.photo} className="pcard__photo" decorative />
                    <span className="pcard__body">
                      <span className="pcard__meta">
                        {formatPostDate(item.published, loc)} · {t("pages.blog.minRead", { minutes: readingMinutes(getPost(item.slug)!) })}
                      </span>
                      <span className="pcard__title">
                        {item.title}
                      </span>
                      <span className="pcard__go">
                        {t("pages.blog.readMore")} <ArrowIcon width={18} height={18} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </SiteShell>
  );
}
