import type { Metadata } from "next";
import { SiteShell } from "@/components/home/SiteShell";
import { PageHero } from "@/components/home/PageHero";
import { Fleet } from "@/components/home/Fleet";
import { images } from "@/config/images";
import { resolveLocale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { pageMetadata } from "@/lib/i18n/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loc = resolveLocale((await params).locale);
  const t = getT(loc);
  return pageMetadata(loc, "/fleet", { title: t("pages.fleet.metaTitle"), description: t("pages.fleet.metaDescription") });
}

export default async function FleetPage({ params }: Props) {
  const loc = resolveLocale((await params).locale);
  const t = getT(loc);
  const compare = t.raw<Array<{ label: string; levc: string; vito: string }>>("pages.fleet.compare");
  const everyJourney = t.raw<Array<{ title: string; text: string }>>("pages.fleet.every");

  return (
    <SiteShell locale={loc}>
      <PageHero
        locale={loc}
        eyebrow={t("pages.fleet.eyebrow")}
        title={t("pages.fleet.title")}
        lead={t("pages.fleet.lead")}
        photo={images.taxi}
      />

      <Fleet locale={loc} showHeading={false} />

      <section className="sec sec--dark which">
        <div className="container">
          <p className="eyebrow" data-reveal>
            {t("pages.fleet.whichEyebrow")}
          </p>
          <h2 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>
            {t("pages.fleet.whichTitleLine")}
            <br />
            <em className="grad">{t("pages.fleet.whichTitleAccent")}</em>
          </h2>
          <table className="compare" data-reveal>
            <thead>
              <tr>
                <td />
                <th scope="col">LEVC TX e</th>
                <th scope="col">Mercedes Vito 114</th>
              </tr>
            </thead>
            <tbody>
              {compare.map(({ label, levc, vito }) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td data-label="LEVC TX e">{levc}</td>
                  <td data-label="Mercedes Vito 114">{vito}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="which__note" data-reveal>
            {t("pages.fleet.whichNote")}
          </p>
        </div>
      </section>

      <section className="sec sec--light every">
        <div className="container">
          <p className="eyebrow" data-reveal>
            {t("pages.fleet.everyEyebrow")}
          </p>
          <ul className="every__list">
            {everyJourney.map(({ title, text }, i) => (
              <li key={title} data-reveal style={{ ["--d" as string]: `${i * 90}ms` }}>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </SiteShell>
  );
}
