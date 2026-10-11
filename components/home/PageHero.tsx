import type { Photo } from "@/config/images";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { Bg } from "./Bg";
import { PhoneIcon, WhatsAppIcon } from "./icons";

/** Dark photo header used by inner pages (services, blog). */
export function PageHero({
  locale,
  eyebrow,
  title,
  lead,
  photo,
  actions = true,
}: {
  locale: Locale;
  eyebrow: string;
  title: string;
  lead: string;
  photo: Photo;
  actions?: boolean;
}) {
  const t = getT(locale);
  return (
    <section className="hero hero--page" id="top" data-hero>
      <Bg photo={photo} className="hero__bg" decorative locale={locale} />
      <div className="hero__shade" aria-hidden="true" />
      <div className="container hero__content">
        <p className="eyebrow" data-reveal>
          {eyebrow}
        </p>
        <h1 className="hero__title" data-reveal="lines">
          <span className="line">
            <span style={{ ["--d" as string]: "80ms" }}>{title}</span>
          </span>
        </h1>
        <p className="hero__lead" data-reveal style={{ ["--d" as string]: "240ms" }}>
          {lead}
        </p>
        {actions && (
          <div className="hero__cta" data-reveal style={{ ["--d" as string]: "340ms" }}>
            <a className="btn btn--brand btn--lg" href={`tel:${siteConfig.phone.tel}`}>
              <PhoneIcon width={20} height={20} />
              {t("common.callPhone", { phone: siteConfig.phone.display })}
            </a>
            <a className="btn btn--wa btn--lg" href={siteConfig.whatsapp.url}>
              <WhatsAppIcon width={22} height={22} />
              {t("common.whatsappUs")}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
