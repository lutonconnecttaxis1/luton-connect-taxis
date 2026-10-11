import type { Metadata } from "next";
import { LegalPage } from "@/components/pages/LegalPage";
import { resolveLocale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { pageMetadata } from "@/lib/i18n/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loc = resolveLocale((await params).locale);
  const t = getT(loc);
  return pageMetadata(loc, "/cookies", { title: t("legal.cookies.title"), description: t("legal.cookies.lead") });
}

export default async function Page({ params }: Props) {
  const loc = resolveLocale((await params).locale);
  return <LegalPage slug="cookies" locale={loc} />;
}
