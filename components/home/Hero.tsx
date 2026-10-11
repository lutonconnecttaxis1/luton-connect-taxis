import { images } from "@/config/images";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { QuoteCard } from "@/components/booking/QuoteCard";
import { Bg } from "./Bg";
import { PhoneIcon, WhatsAppIcon } from "./icons";

export function Hero({ locale }: { locale: Locale }) {
  const t = getT(locale);
  return (
    <section className="hero" id="top" data-hero>
      <Bg photo={images.hero} className="hero__bg" decorative />
      <div className="hero__shade" aria-hidden="true" />

      <div className="container hero__content">
        <p className="eyebrow" data-reveal>
          {t("home.hero.eyebrow")}
        </p>

        <h1 className="hero__title" data-reveal="lines">
          <span className="line">
            <span style={{ ["--d" as string]: "80ms" }}>{t("home.hero.line1")}</span>
          </span>
          <span className="line">
            <span style={{ ["--d" as string]: "200ms" }}>{t("home.hero.line2")}</span>
          </span>
          <span className="line">
            <span style={{ ["--d" as string]: "320ms" }}>
              <em className="grad">{t("home.hero.line3")}</em>
            </span>
          </span>
        </h1>

        <p className="hero__lead" data-reveal style={{ ["--d" as string]: "420ms" }}>
          {t("home.hero.lead")}
        </p>

        <div className="hero__cta" data-reveal style={{ ["--d" as string]: "520ms" }}>
          <a className="btn btn--brand btn--lg" href={`tel:${siteConfig.phone.tel}`}>
            <PhoneIcon width={20} height={20} />
            {t("common.callPhone", { phone: siteConfig.phone.display })}
          </a>
          <a className="btn btn--wa btn--lg" href={siteConfig.whatsapp.url}>
            <WhatsAppIcon width={22} height={22} />
            {t("common.whatsappUs")}
          </a>
        </div>

        <QuoteCard />
        <p className="book__note" data-reveal style={{ ["--d" as string]: "720ms" }}>
          {t("home.hero.note")}
        </p>
      </div>
    </section>
  );
}
