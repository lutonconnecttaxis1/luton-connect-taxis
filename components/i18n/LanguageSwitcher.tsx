"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronDownIcon } from "@/components/home/icons";
import {
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  localeHref,
  localeInfo,
  locales,
  splitLocale,
  type Locale,
} from "@/lib/i18n/config";
import { useLocale, useT } from "./I18nProvider";

/** Remembers the visitor's own choice (a preference cookie, set only when they pick a language). */
function rememberChoice(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANG_COOKIE}=${locale}; Max-Age=${LANG_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

/** The menu lists languages A–Z by the name shown (Deutsch, English, Español …); Chinese, written in its own script, comes last. */
const menuOrder = [...locales].sort((a, b) => {
  const aLatin = /^[\p{Script=Latin}]/u.test(localeInfo[a].name);
  const bLatin = /^[\p{Script=Latin}]/u.test(localeInfo[b].name);
  if (aLatin !== bLatin) return aLatin ? -1 : 1;
  return localeInfo[a].name.localeCompare(localeInfo[b].name, "en");
});

/** The language menu in the header. Plain links, so it also works without JavaScript. */
export function LanguageSwitcher() {
  const t = useT();
  const current = useLocale();
  const pathname = usePathname() ?? "/";
  const { rest } = splitLocale(pathname);
  const ref = useRef<HTMLDetailsElement>(null);

  // Close when clicking elsewhere or pressing Escape.
  useEffect(() => {
    const close = (event: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && el.contains(event.target as Node)) return;
      el.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details className="lang" ref={ref}>
      <summary aria-label={t("header.chooseLanguage")}>
        {localeInfo[current].short} <ChevronDownIcon width={16} height={16} />
      </summary>
      <ul>
        {menuOrder.map((code) => (
          <li key={code}>
            <a
              href={localeHref(code, rest)}
              lang={localeInfo[code].htmlLang}
              hrefLang={localeInfo[code].htmlLang}
              aria-current={code === current ? "true" : undefined}
              onClick={(event) => {
                rememberChoice(code);
                // Keep ?query and #hash when switching language.
                event.currentTarget.href = `${localeHref(code, rest)}${window.location.search}${window.location.hash}`;
              }}
            >
              {localeInfo[code].name}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
