import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { connections } from "./data";

/** Typographic 2×2 – the whole tile is the interaction, no boxes. */
export function Connections({ locale }: { locale: Locale }) {
  const t = getT(locale);
  return (
    <section className="sec sec--dark conn" id="connections">
      <div className="container">
        <p className="eyebrow" data-reveal>
          {t("home.connections.eyebrow")}
        </p>
        <h2 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>
          {t("home.connections.title")}
        </h2>

        <div className="conn__grid">
          {connections.map((item, i) => (
            <a key={item.key} className="conn__item" href="#quote" data-reveal style={{ ["--d" as string]: `${i * 90}ms` }}>
              <span className="conn__title">
                {t(`home.connections.items.${item.key}.title`)} <span className="conn__swap" aria-hidden="true">⇄</span>{" "}
                <span className="grad">{t("home.connections.taxi")}</span>
              </span>
              <span className="conn__text">{t(`home.connections.items.${item.key}.text`)}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
