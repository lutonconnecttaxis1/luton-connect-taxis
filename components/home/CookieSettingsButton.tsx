"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { OPEN_COOKIE_SETTINGS } from "@/lib/consent";

/** Footer link that re-opens the cookie banner's settings panel. */
export function CookieSettingsButton() {
  const t = useT();
  return (
    <button
      type="button"
      className="footer__linkbtn"
      data-cookie-open
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))}
    >
      {t("cookie.settings")}
    </button>
  );
}
