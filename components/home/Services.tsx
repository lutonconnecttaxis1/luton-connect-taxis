import { Link } from "@/components/i18n/Link";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { Bg } from "./Bg";
import { ArrowIcon } from "./icons";
import { services } from "./service-data";

/**
 * Every journey we cover, as a large typographic index – a photo peeks out on hover and each
 * row opens its own in-depth page. `exclude` hides the current service on a service page.
 * Card name and one-liner come from the messages `services.items.<slug>.name` / `.meta`.
 */
export function Services({
  locale,
  exclude,
  heading = true,
}: {
  locale: Locale;
  exclude?: string;
  heading?: boolean;
}) {
  const t = getT(locale);
  const list = services.filter((s) => s.slug !== exclude);
  return (
    <section className="sec sec--dark routes" id="services">
      <div className="container">
        <div className="routes__head">
          <p className="eyebrow" data-reveal>
            {heading ? t("home.services.eyebrow") : t("home.services.eyebrowMore")}
          </p>
          <h2 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>
            {heading ? t("home.services.title") : t("home.services.titleMore")}
          </h2>
          {heading && (
            <p className="routes__sub" data-reveal style={{ ["--d" as string]: "160ms" }}>
              {t("home.services.sub")}
            </p>
          )}
        </div>

        <ul className="routes__list">
          {list.map((service, i) => (
            <li key={service.slug} data-reveal style={{ ["--d" as string]: `${i * 70}ms` }}>
              <Link className="route" href={`/services/${service.slug}`}>
                <span className="route__n">{service.n}</span>
                <span className="route__body">
                  <span className="route__name">{t(`services.items.${service.slug}.name`)}</span>
                  <span className="route__meta">{t(`services.items.${service.slug}.meta`)}</span>
                </span>
                <span className="route__go" aria-hidden="true">
                  <ArrowIcon width={22} height={22} />
                </span>
                <Bg photo={service.photo} className="route__peek" decorative />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
