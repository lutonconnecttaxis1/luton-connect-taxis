import type { Metadata } from "next";
import { AccountApp } from "@/components/account/AccountApp";
import { PageHero } from "@/components/home/PageHero";
import { SiteShell } from "@/components/home/SiteShell";
import { images } from "@/config/images";
import { resolveLocale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { pageMetadata } from "@/lib/i18n/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getT(locale);
  return {
    ...pageMetadata(locale, "/account", {
      title: t("account.page.metaTitle"),
      description: t("account.page.metaDescription"),
    }),
    // Private page: never in search results, whatever the site-wide indexing switch says.
    robots: { index: false, follow: false },
  };
}

export default async function AccountPage({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  const t = getT(locale);
  return (
    <SiteShell locale={locale} cta={false}>
      <PageHero
        locale={locale}
        eyebrow={t("account.page.eyebrow")}
        title={t("account.page.title")}
        lead={t("account.page.lead")}
        photo={images.hero}
        actions={false}
      />
      <section className="sec sec--light acctsec" aria-label={t("account.page.sectionLabel")}>
        <div className="container acctsec__in">
          <AccountApp />
        </div>
      </section>
    </SiteShell>
  );
}
