import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { PhoneIcon, WhatsAppIcon } from "./icons";

export function CtaBand({ locale }: { locale: Locale }) {
  const t = getT(locale);
  return (
    <section className="cta" id="call">
      <span className="cta__watermark" aria-hidden="true">
        {t("home.ctaBand.watermark")}
      </span>
      <div className="container cta__in">
        <h2 className="display" data-reveal>
          {t("home.ctaBand.titleLine1")}
          <br />
          {t("home.ctaBand.titleLine2")}
        </h2>
        <div className="cta__actions" data-reveal style={{ ["--d" as string]: "120ms" }}>
          <a className="btn btn--ink btn--lg" href={`tel:${siteConfig.phone.tel}`}>
            <PhoneIcon width={20} height={20} />
            {siteConfig.phone.display}
          </a>
          <a className="btn btn--wa btn--lg" href={siteConfig.whatsapp.url}>
            <WhatsAppIcon width={22} height={22} />
            {t("common.whatsappUs")}
          </a>
        </div>
      </div>
    </section>
  );
}
