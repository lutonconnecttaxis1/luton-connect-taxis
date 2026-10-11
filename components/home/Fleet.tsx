import { Link } from "@/components/i18n/Link";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { fleet } from "./data";
import { Bg } from "./Bg";
import { ArrowIcon } from "./icons";

export function Fleet({ locale, showHeading = true }: { locale: Locale; showHeading?: boolean }) {
  const t = getT(locale);
  return (
    <section className="sec sec--light fleet" id="fleet">
      <div className="container">
        {showHeading && (
          <>
            <p className="eyebrow" data-reveal>
              {t("home.fleet.eyebrow")}
            </p>
            <h2 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>
              {t("home.fleet.titleLine1")}
              <br />
              {t("home.fleet.titleLine2")}
            </h2>
          </>
        )}

        {fleet.map((car, i) => (
          <article key={car.id} className={`fleet-row${i % 2 === 1 ? " fleet-row--flip" : ""}`}>
            <div className="fleet-row__img" data-reveal="clip">
              <Bg photo={car.photo} locale={locale} />
              <span className="fleet-row__n" aria-hidden="true">
                {car.n}
              </span>
            </div>
            <div className="fleet-row__txt" data-reveal>
              <p className="eyebrow">{t(`home.fleet.items.${car.id}.kicker`)}</p>
              <h3>{car.name}</h3>
              <p className="fleet-row__lead">{t(`home.fleet.items.${car.id}.text`)}</p>
              <dl className="specs">
                {t.raw<Array<{ term: string; desc: string }>>(`home.fleet.items.${car.id}.specs`).map((spec) => (
                  <div key={spec.term}>
                    <dt>{spec.term}</dt>
                    <dd>{spec.desc}</dd>
                  </div>
                ))}
              </dl>
              <Link className="link-arrow" href="/#quote">
                {t("home.fleet.bookThis")} <ArrowIcon width={18} height={18} />
              </Link>
            </div>
          </article>
        ))}
        {showHeading && (
          <p className="fleet__more" data-reveal>
            <Link className="link-arrow" href="/fleet">
              {t("home.fleet.seeFull")} <ArrowIcon width={18} height={18} />
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
