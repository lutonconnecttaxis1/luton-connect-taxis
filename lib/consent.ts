/**
 * Cookie consent storage (client-side only).
 * Choice is kept in localStorage AND a first-party cookie for 12 months.
 * Only two categories exist: "essential" (always on) and "analytics" (opt-in, off by default).
 * Analytics scripts added later must check `analyticsAllowed()` / listen for CONSENT_CHANGED.
 */
export type Consent = { v: 1; analytics: boolean; decidedAt: string };

export const CONSENT_KEY = "lct_cookie_consent";
export const CONSENT_CHANGED = "lct:consent-changed";
export const OPEN_COOKIE_SETTINGS = "lct:open-cookie-settings";

export function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    return parsed && parsed.v === 1 && typeof parsed.analytics === "boolean" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: { analytics: boolean }): Consent {
  const consent: Consent = { v: 1, analytics: choice.analytics, decidedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    /* storage blocked – the cookie below still records the choice */
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_KEY}=${choice.analytics ? "analytics" : "essential"}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED, { detail: consent }));
  return consent;
}

export const analyticsAllowed = () => readConsent()?.analytics === true;
