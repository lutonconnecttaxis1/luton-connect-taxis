import type { Metadata } from "next";
import { SiteShell } from "@/components/home/SiteShell";
import { PageHero } from "@/components/home/PageHero";
import { images } from "@/config/images";
import { resolveLocale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { pageMetadata } from "@/lib/i18n/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loc = resolveLocale((await params).locale);
  const t = getT(loc);
  return pageMetadata(loc, "/blog", { title: t("pages.blog.metaTitle"), description: t("pages.blog.metaDescription") });
}

/** Placeholder – articles are added in a later milestone. */
export default async function BlogPage({ params }: Props) {
  const loc = resolveLocale((await params).locale);
  const t = getT(loc);
  return (
    <SiteShell locale={loc}>
      <PageHero
        locale={loc}
        eyebrow={t("pages.blog.eyebrow")}
        title={t("pages.blog.title")}
        lead={t("pages.blog.lead")}
        photo={images.nightCab}
      />
    </SiteShell>
  );
}
