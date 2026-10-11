/**
 * Browser side of reCAPTCHA v3. Does nothing until NEXT_PUBLIC_RECAPTCHA_SITE_KEY
 * is set (launch step), so forms work on localhost without it.
 */
type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

let loading: Promise<void> | null = null;

export function loadRecaptcha(): Promise<void> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey || typeof document === "undefined") return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // the server decides what to do without a token
    document.head.appendChild(script);
  });
  return loading;
}

/** A token for the server to check, or undefined when reCAPTCHA is not switched on. */
export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return undefined;
  await loadRecaptcha();
  const g = (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
  if (!g) return undefined;
  return new Promise((resolve) => {
    g.ready(() => {
      g.execute(siteKey, { action }).then(resolve, () => resolve(undefined));
    });
  });
}
