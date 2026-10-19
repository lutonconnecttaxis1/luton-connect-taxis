/**
 * Content-Security-Policy – tells the browser exactly where the site may load scripts, styles,
 * images and connections from, so injected code from anywhere else is refused.
 *
 * Scripts use a fresh random "nonce" on every request (set in middleware.ts). Next.js adds that
 * nonce to its own scripts automatically; 'strict-dynamic' lets those trusted scripts load the
 * ones they need (for example reCAPTCHA).
 *
 * When a third-party tool is added later (Google Analytics, a map embed …) allow its address
 * HERE – nothing else needs to change.
 */

/** Request header that carries the nonce from middleware.ts to app/[locale]/layout.tsx. */
export const NONCE_HEADER = "x-nonce";

export type CspMode = "off" | "report-only" | "enforce";

/** CSP_MODE on Vercel: "enforce" (blocks), "report-only" (only logs, the default), "off". */
export function cspMode(value = process.env.CSP_MODE): CspMode {
  const v = value?.trim().toLowerCase();
  if (v === "enforce" || v === "off") return v;
  return "report-only";
}

export function cspHeaderName(mode: Exclude<CspMode, "off">): string {
  return mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

/** A new unguessable value for every request. */
export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}

type Options = {
  nonce: string;
  /** `next dev` needs eval and a websocket for hot reload. Never true in production. */
  isDev?: boolean;
  /** Vercel preview deployments add a feedback toolbar from vercel.live. */
  isPreview?: boolean;
  /** Where the browser posts violation reports (only used while testing). */
  reportUri?: string;
  /** Test mode: leave out the two directives browsers ignore (with a warning) outside enforcing mode. */
  reportOnly?: boolean;
};

export function buildCsp({ nonce, isDev = false, isPreview = false, reportUri, reportOnly = false }: Options): string {
  const vercelLive = isPreview ? ["https://vercel.live", "https://*.pusher.com", "wss://*.pusher.com"] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Fallback for very old browsers that ignore 'strict-dynamic' (newer browsers skip these).
      "https://www.google.com/recaptcha/",
      "https://www.gstatic.com/recaptcha/",
      ...(isDev ? ["'unsafe-eval'"] : []),
      ...(isPreview ? ["https://vercel.live"] : []),
    ],
    // <style> tags need the nonce; the small style="" values used for animation delays
    // (style-src-attr) cannot carry one, so they are allowed on their own.
    "style-src": ["'self'", ...(isDev ? ["'unsafe-inline'"] : [`'nonce-${nonce}'`]), ...(isPreview ? ["https://vercel.live"] : [])],
    "style-src-attr": ["'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...(isPreview ? ["https://vercel.live", "https://vercel.com"] : [])],
    // Fonts are self-hosted by next/font – nothing is fetched from Google Fonts.
    "font-src": ["'self'", ...(isPreview ? ["https://vercel.live", "https://assets.vercel.com"] : [])],
    "connect-src": [
      "'self'",
      // Address suggestions in the booking form are requested straight from the browser.
      "https://places.googleapis.com",
      "https://www.google.com/recaptcha/",
      ...(isDev ? ["ws://localhost:*", "ws://127.0.0.1:*"] : []),
      ...vercelLive,
    ],
    "frame-src": ["https://www.google.com/recaptcha/", "https://recaptcha.google.com/recaptcha/", ...(isPreview ? ["https://vercel.live"] : [])],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    ...(reportOnly ? {} : { "frame-ancestors": ["'self'"] }),
  };

  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev && !reportOnly) parts.push("upgrade-insecure-requests");
  if (reportUri) parts.push(`report-uri ${reportUri}`);
  return parts.join("; ");
}
