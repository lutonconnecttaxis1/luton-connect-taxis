import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { PhoneIcon, WhatsAppIcon } from "./icons";

/** Thumb-reach action bar – phone screens only. */
export function MobileBar({ locale }: { locale: Locale }) {
  const t = getT(locale);
  return (
    <div className="mbar" role="region" aria-label={t("mobileBar.label")}>
      <a className="btn btn--brand" href={`tel:${siteConfig.phone.tel}`}>
        <PhoneIcon width={20} height={20} />
        {t("mobileBar.call")}
      </a>
      <a className="btn btn--wa" href={siteConfig.whatsapp.url}>
        <WhatsAppIcon width={22} height={22} />
        {t("mobileBar.whatsapp")}
      </a>
    </div>
  );
}
