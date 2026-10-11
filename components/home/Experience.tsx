import { images } from "@/config/images";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { features } from "./data";
import { Bg } from "./Bg";
import { featureIcons } from "./icons";

export function Experience({ locale }: { locale: Locale }) {
  const t = getT(locale);
  return (
    <section className="sec sec--dark exp" id="service">
      <Bg photo={images.nightCab} className="exp__bg" decorative />
      <div className="exp__shade" aria-hidden="true" />
      <div className="container exp__in">
        <p className="eyebrow" data-reveal>
          {t("home.experience.eyebrow")}
        </p>
        <h2 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>
          {t("home.experience.titleLine1")}
          <br />
          <em className="grad">{t("home.experience.titleLine2")}</em>
        </h2>

        <ul className="feats">
          {features.map((feature, i) => {
            const Icon = featureIcons[feature.key];
            return (
              <li key={feature.key} className="feat" data-reveal style={{ ["--d" as string]: `${i * 110}ms` }}>
                <Icon width={44} height={44} strokeWidth={1.4} className="feat__icon" />
                <h3>{t(`home.features.${feature.key}.title`)}</h3>
                <p>{t(`home.features.${feature.key}.text`)}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
