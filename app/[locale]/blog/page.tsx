import type { Metadata } from "next";
import { Bg } from "@/components/home/Bg";
import { ArrowIcon } from "@/components/home/icons";
import { PageHero } from "@/components/home/PageHero";
import { SiteShell } from "@/components/home/SiteShell";
import { Link } from "@/components/i18n/Link";
import { posts as englishPosts, readingMinutes } from "@/content/blog";
import { images } from "@/config/images";
import { blogIndexMetadata, formatPostDate } from "@/lib/blog-seo";
import { localizedPosts } from "@/lib/blog-i18n";
import { defaultLocale, resolveLocale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loc = resolveLocale((await params).locale);
  const t = getT(loc);
  return blogIndexMetadata(loc, t("pages.blog.metaTitle"), t("pages.blog.metaDescription"));
}

export default async function BlogPage({ params }: Props) {
  const loc = resolveLocale((await params).locale);
  const t = getT(loc);
  const posts = localizedPosts(loc);
  return (
    <SiteShell locale={loc}>
      <PageHero
        locale={loc}
        eyebrow={t("pages.blog.eyebrow")}
        title={t("pages.blog.title")}
        lead={t("pages.blog.lead")}
        photo={images.hero}
      />

      <section className="sec sec--light blog">
        <div className="container">
          {loc !== defaultLocale && (
            <p className="legal__notice" role="note">
              {t("pages.blog.translatedNotice")}
            </p>
          )}
          <ul className="blog__grid">
            {posts.map((post, i) => (
              <li key={post.slug} data-reveal style={{ ["--d" as string]: `${(i % 3) * 80}ms` }}>
                <Link className="pcard" href={`/blog/${post.slug}`}>
                  <Bg photo={post.photo} className="pcard__photo" decorative />
                  <span className="pcard__body">
                    <span className="pcard__meta">
                      {formatPostDate(post.published, loc)} · {t("pages.blog.minRead", { minutes: readingMinutes(englishPosts[i]) })}
                    </span>
                    <span className="pcard__title">
                      {post.title}
                    </span>
                    <span className="pcard__excerpt">
                      {post.excerpt}
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
    </SiteShell>
  );
}
