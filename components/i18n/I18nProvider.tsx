"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { createMessageTranslator, createT, flattenStrings, type Messages, type TFunction } from "@/lib/i18n/translate";

type I18n = { locale: Locale; t: TFunction; tm: (text: string) => string };
const Ctx = createContext<I18n | null>(null);

/**
 * Wraps the page once (in app/[locale]/layout.tsx). `messages` is only the part the
 * browser needs. `validationSource` is the English validation table, used to find and
 * translate the English error messages the shared validators produce.
 */
export function I18nProvider({
  locale,
  messages,
  validationSource,
  children,
}: {
  locale: Locale;
  messages: Messages;
  validationSource: Record<string, string>;
  children: ReactNode;
}) {
  const value = useMemo<I18n>(() => {
    const warn = (key: string) => {
      if (process.env.NODE_ENV !== "production") console.warn(`[i18n] missing message: ${key}`);
    };
    return {
      locale,
      t: createT(messages, warn),
      tm:
        locale === defaultLocale
          ? (text: string) => text
          : createMessageTranslator(validationSource, flattenStrings(messages.validation)),
    };
  }, [locale, messages, validationSource]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(Ctx);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>.");
  return value;
}

/** The translate function for the current language: `const t = useT()`. */
export const useT = (): TFunction => useI18n().t;
export const useLocale = (): Locale => useI18n().locale;
/** Translates an English validation message produced by the shared validators. */
export const useMessageTranslator = (): ((text: string) => string) => useI18n().tm;
