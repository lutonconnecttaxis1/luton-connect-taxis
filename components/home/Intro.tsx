import { Link } from "@/components/i18n/Link";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { rich } from "@/lib/i18n/rich";
import { steps } from "./data";
import { ArrowIcon } from "./icons";

export function Intro({ locale }: { locale: Locale }) {
  const t = getT(locale);
  return (
    <section className="sec sec--light intro" id="about">
      <div className="container intro__grid">
        <div>
          <p className="eyebrow" data-reveal>
            {t("home.intro.eyebrow")}
          </p>
          <p className="statement" data-reveal style={{ ["--d" as string]: "100ms" }}>
            {rich(t("home.intro.statement"))}
          </p>
        </div>

        <div className="steps-wrap">
          <p className="eyebrow" data-reveal>
            {t("home.intro.stepsTitle")}
          </p>
          <ol className="steps">
            {steps.map((step, i) => (
              <li key={step.n} data-reveal style={{ ["--d" as string]: `${i * 120}ms` }}>
                <span className="steps__n">{step.n}</span>
                <div>
                  <h3>{t(`home.steps.${step.key}.title`)}</h3>
                  <p>{t(`home.steps.${step.key}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link className="link-arrow" href="/#quote" data-reveal>
            {t("home.intro.getEstimate")} <ArrowIcon width={18} height={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
