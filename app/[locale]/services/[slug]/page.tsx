import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/components/i18n/Link";
import { SiteShell } from "@/components/home/SiteShell";
import { PageHero } from "@/components/home/PageHero";
import { Services } from "@/components/home/Services";
import { ArrowIcon, ChevronDownIcon } from "@/components/home/icons";
import { getService, services } from "@/components/home/service-data";
import { siteConfig } from "@/config/site";
import { locales, resolveLocale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { pageMetadata } from "@/lib/i18n/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => services.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = resolveLocale(locale);
  const service = getService(slug);
  if (!service) return {};
  const t = getT(loc);
  return pageMetadata(loc, `/services/${service.slug}`, {
    title: t(`services.items.${service.slug}.name`),
    description: t("services.page.metaDescription", {
      lead: t(`services.items.${service.slug}.lead`),
      phone: siteConfig.phone.display,
    }),
  });
}

export default async function ServicePage({ params }: Props) {
  const { locale, slug } = await params;
  const loc = resolveLocale(locale);
  const service = getService(slug);
  if (!service) notFound();

  const t = getT(loc);
  const key = `services.items.${service.slug}`;
  const includes = t.list(`${key}.includes`);
  const faqs = t.raw<Array<{ q: string; a: string }>>(`${key}.faqs`);
  const steps = t.raw<Array<{ title: string; text: string }>>("services.page.steps");

  return (
    <SiteShell locale={loc}>
      <PageHero
        locale={loc}
        eyebrow={t("services.page.eyebrow")}
        title={t(`${key}.title`)}
        lead={t(`${key}.lead`)}
        photo={service.photo}
      />

      <section className="sec sec--light svc-intro">
        <div className="container intro__grid">
          <div>
            <p className="eyebrow" data-reveal>
              {t("services.page.nutshell")}
            </p>
            <p className="statement" data-reveal style={{ ["--d" as string]: "100ms" }}>
              {t(`${key}.statement`)}
            </p>
            <p data-reveal style={{ ["--d" as string]: "200ms" }} className="svc-intro__cta">
              <Link className="link-arrow" href="/#quote">
                {t("services.page.getEstimate")} <ArrowIcon width={18} height={18} />
              </Link>
            </p>
          </div>
          <div>
            <p className="eyebrow" data-reveal>
              {t("services.page.included")}
            </p>
            <ul className="incl">
              {includes.map((item, i) => (
                <li key={item} data-reveal style={{ ["--d" as string]: `${i * 70}ms` }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="sec sec--dark faq">
        <div className="container faq__grid">
          <div>
            <p className="eyebrow" data-reveal>
              {t("services.page.faqEyebrow")}
            </p>
            <h2 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>
              {t("services.page.faqTitle")}
            </h2>
          </div>
          <div className="faq__list">
            {faqs.map(({ q, a }, i) => (
              <details key={q} data-reveal style={{ ["--d" as string]: `${i * 80}ms` }}>
                <summary>
                  <span>{q}</span>
                  <ChevronDownIcon width={22} height={22} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec--light how">
        <div className="container">
          <p className="eyebrow" data-reveal>
            {t("services.page.howEyebrow")}
          </p>
          <ol className="how__steps">
            {steps.map((step, i) => (
              <li key={step.title} data-reveal style={{ ["--d" as string]: `${i * 110}ms` }}>
                <span className="steps__n">{String(i + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Services locale={loc} exclude={service.slug} heading={false} />
    </SiteShell>
  );
}
