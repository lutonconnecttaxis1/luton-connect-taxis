import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";

/** Endless ticker. The second group is a duplicate for the seamless loop, so it is hidden from assistive tech. */
export function Marquee({ locale }: { locale: Locale }) {
  const t = getT(locale);
  const items = t.list("home.marquee.items");
  return (
    <section className="marquee" aria-label={t("home.marquee.label")}>
      <div className="marquee__track">
        <ul className="marquee__group">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <ul className="marquee__group" aria-hidden="true">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
