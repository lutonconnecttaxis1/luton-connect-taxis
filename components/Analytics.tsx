"use client";

import { useEffect } from "react";
import { contactEventFor } from "@/lib/analytics";
import { CONSENT_CHANGED, analyticsAllowed } from "@/lib/consent";

type Gtag = (...args: unknown[]) => void;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag } & Record<string, unknown>;

/** Deletes Google's cookies (_ga, _ga_XXXX …) when a visitor turns analytics off. */
function clearGoogleCookies() {
  const names = document.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((n) => n === "_ga" || n === "_gid" || n.startsWith("_ga_") || n.startsWith("_gat"));
  const host = window.location.hostname;
  const parts = host.split(".");
  const domains = ["", `; Domain=${host}`, ...(parts.length > 2 ? [`; Domain=.${parts.slice(-2).join(".")}`] : [`; Domain=.${host}`])];
  for (const name of names) for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/${domain}`;
}

/**
 * Google Analytics 4. Nothing is loaded, and no cookie is set, until the visitor accepts analytics
 * cookies in the banner. Turning analytics off again stops tracking and removes Google's cookies.
 * Page views (including moving between pages) come from GA4's built-in measurement; this adds
 * events for taps on call, WhatsApp, email and quote links so bookings can be counted.
 */
export function Analytics({ id }: { id: string }) {
  useEffect(() => {
    const w = window as unknown as AnalyticsWindow;
    const disableFlag = `ga-disable-${id}`;
    let started = false;

    const start = () => {
      w[disableFlag] = false;
      if (started) return;
      started = true;
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag() {
        // Google's tag needs the real `arguments` object, not an array.
        // eslint-disable-next-line prefer-rest-params
        (w.dataLayer as unknown[]).push(arguments);
      };
      w.gtag("js", new Date());
      w.gtag("config", id);
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
    };

    const stop = () => {
      w[disableFlag] = true;
      clearGoogleCookies();
    };

    const apply = () => (analyticsAllowed() ? start() : stop());

    const onClick = (event: MouseEvent) => {
      if (!analyticsAllowed() || !w.gtag) return;
      const link = (event.target as Element | null)?.closest?.("a");
      const href = link?.getAttribute("href") ?? "";
      const name = href ? contactEventFor(href) : "";
      if (name) w.gtag("event", name, { link_url: href });
    };

    apply();
    window.addEventListener(CONSENT_CHANGED, apply);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener(CONSENT_CHANGED, apply);
      document.removeEventListener("click", onClick);
    };
  }, [id]);

  return null;
}
