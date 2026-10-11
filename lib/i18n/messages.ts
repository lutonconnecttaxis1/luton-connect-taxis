import { defaultLocale, type Locale } from "./config";
import { createMessageTranslator, createT, flattenStrings, withFallback, type Messages, type TFunction } from "./translate";

/**
 * Loads messages/<locale>.json (all bundled with the server code). English is always loaded too and fills any gap.
 * (Server side only: pages, layouts and API routes. Client components get their
 * text from the provider – see components/i18n/I18nProvider.tsx.)
 */
import en from "@/messages/en.json";
import ro from "@/messages/ro.json";
import es from "@/messages/es.json";
import it from "@/messages/it.json";
import fr from "@/messages/fr.json";
import zh from "@/messages/zh.json";
import de from "@/messages/de.json";

const all: Record<Locale, Messages> = {
  en: en as unknown as Messages,
  ro: ro as unknown as Messages,
  es: es as unknown as Messages,
  it: it as unknown as Messages,
  fr: fr as unknown as Messages,
  zh: zh as unknown as Messages,
  de: de as unknown as Messages,
};

const merged = new Map<Locale, Messages>();

export function loadMessages(locale: Locale): Messages {
  const cached = merged.get(locale);
  if (cached) return cached;
  const result = locale === defaultLocale ? all.en : withFallback(all[locale], all.en);
  merged.set(locale, result);
  return result;
}

/**
 * Namespaces (top-level keys of the JSON) that browser code needs. Everything else
 * (long page copy, legal text …) stays on the server and is never sent to the visitor.
 * If a client component uses t("something.…"), "something" must be listed here –
 * a unit test checks this.
 */
export const CLIENT_NAMESPACES = [
  "common",
  "header",
  "cookie",
  "contactFab",
  "mobileBar",
  "quote",
  "estimate",
  "booking",
  "account",
  "contactForm",
  "validation",
] as const;

export function pickClientMessages(messages: Messages): Messages {
  const out: Messages = {};
  for (const ns of CLIENT_NAMESPACES) if (messages[ns] !== undefined) out[ns] = messages[ns];
  return out;
}

function warnMissing(key: string) {
  if (process.env.NODE_ENV !== "production") console.warn(`[i18n] missing message: ${key}`);
}

/** For server components and routes: `const { t } = getI18n(locale)`. Synchronous – the messages are bundled. */
export function getI18n(locale: Locale): { t: TFunction; tm: (text: string) => string; messages: Messages } {
  const messages = loadMessages(locale);
  return {
    t: createT(messages, warnMissing),
    tm: createMessageTranslator(flattenStrings(all.en.validation), flattenStrings(messages.validation)),
    messages,
  };
}

export const getT = (locale: Locale): TFunction => getI18n(locale).t;

/** The English validation table (the provider needs it to translate the validators' English messages). */
export const englishValidation = (): Record<string, string> => flattenStrings(all.en.validation);
export const validationFor = (locale: Locale): Record<string, string> => flattenStrings(loadMessages(locale).validation);
