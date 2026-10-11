import { formatDateLong } from "@/lib/pricing/dates";
import { defaultLocale, localeInfo, type Locale } from "./config";

/**
 * "2026-10-12" → "Mon 12 Oct 2026" in English, or the same date written the way
 * the visitor's language writes it. Works on the plain date (UTC), so the time
 * zone of the server or the visitor never shifts the day.
 */
export function formatDateFor(date: string, locale: Locale): string {
  if (locale === defaultLocale) return formatDateLong(date);
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat(localeInfo[locale].intl, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
