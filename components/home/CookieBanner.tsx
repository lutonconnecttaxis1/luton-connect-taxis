"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/i18n/Link";
import { useT } from "@/components/i18n/I18nProvider";
import { OPEN_COOKIE_SETTINGS, readConsent, saveConsent } from "@/lib/consent";

type ViewProps = {
  manage: boolean;
  analytics: boolean;
  rootRef?: React.Ref<HTMLElement>;
  onAccept?: () => void;
  onReject?: () => void;
  onManage?: () => void;
  onBack?: () => void;
  onSave?: () => void;
  onToggle?: (value: boolean) => void;
};

/** Presentational banner – both panels are always rendered, one is hidden. */
export function CookieBannerView({
  manage,
  analytics,
  rootRef,
  onAccept,
  onReject,
  onManage,
  onBack,
  onSave,
  onToggle,
}: ViewProps) {
  const t = useT();
  return (
    <section
      className="cookie"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      tabIndex={-1}
      ref={rootRef}
      data-cookie
    >
      <div id="cookie-basic" hidden={manage}>
        <h2 id="cookie-title">{t("cookie.title")}</h2>
        <p>
          {t("cookie.text")} <Link href="/cookies">{t("cookie.policy")}</Link>
        </p>
        <div className="cookie__actions">
          <button type="button" className="btn btn--brand btn--sm" data-cookie-accept onClick={onAccept}>
            {t("cookie.acceptAll")}
          </button>
          <button type="button" className="btn btn--ghost-d btn--sm" data-cookie-reject onClick={onReject}>
            {t("cookie.rejectAll")}
          </button>
          <button type="button" className="cookie__link" data-cookie-manage onClick={onManage}>
            {t("cookie.manage")}
          </button>
        </div>
      </div>

      <div id="cookie-manage" hidden={!manage}>
        <h2>{t("cookie.manageTitle")}</h2>
        <ul className="cookie__opts">
          <li>
            <div>
              <strong>{t("cookie.essential")}</strong>
              <span>{t("cookie.essentialText")}</span>
            </div>
            <label className="switch">
              <input type="checkbox" checked disabled readOnly aria-label={t("cookie.essentialAria")} />
              <span aria-hidden="true" />
            </label>
          </li>
          <li>
            <div>
              <strong>{t("cookie.analytics")}</strong>
              <span>{t("cookie.analyticsText")}</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                id="cookie-analytics"
                checked={analytics}
                onChange={(e) => onToggle?.(e.target.checked)}
                aria-label={t("cookie.analyticsAria")}
              />
              <span aria-hidden="true" />
            </label>
          </li>
        </ul>
        <div className="cookie__actions">
          <button type="button" className="btn btn--brand btn--sm" data-cookie-save onClick={onSave}>
            {t("cookie.save")}
          </button>
          <button type="button" className="cookie__link" data-cookie-back onClick={onBack}>
            {t("cookie.back")}
          </button>
        </div>
      </div>
    </section>
  );
}

/** Shows until the visitor chooses; can be re-opened from "Cookie settings" in the footer. */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const root = useRef<HTMLElement>(null);
  const focusOnOpen = useRef(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) setVisible(true);
    else setAnalytics(existing.analytics);

    const reopen = () => {
      setAnalytics(readConsent()?.analytics === true);
      setManage(true);
      focusOnOpen.current = true;
      setVisible(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen);
  }, []);

  useEffect(() => {
    if (visible && focusOnOpen.current) {
      focusOnOpen.current = false;
      root.current?.focus();
    }
  }, [visible]);

  const decide = (value: boolean) => {
    saveConsent({ analytics: value });
    setAnalytics(value);
    setVisible(false);
    setManage(false);
  };

  if (!visible) return null;
  return (
    <CookieBannerView
      manage={manage}
      analytics={analytics}
      rootRef={root}
      onAccept={() => decide(true)}
      onReject={() => decide(false)}
      onManage={() => setManage(true)}
      onBack={() => setManage(false)}
      onSave={() => decide(analytics)}
      onToggle={setAnalytics}
    />
  );
}
