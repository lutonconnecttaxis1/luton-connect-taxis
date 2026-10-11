import { siteConfig } from "@/config/site";
import { defaultLocale, localeInfo, type Locale } from "@/lib/i18n/config";
import { formatDateFor } from "@/lib/i18n/format";
import type { TFunction } from "@/lib/i18n/translate";
import { formatDateLong, londonNow } from "@/lib/pricing/dates";
import type { MyBooking } from "@/lib/customers";

/** Pure helpers for the account page (kept out of the components so they can be tested). */

type Tone = "wait" | "ok" | "done" | "off";

/** Known statuses: the message key for the label (see `account.status.*`) and the chip colour. */
export const STATUS_LABELS: Record<string, { key: string; tone: Tone }> = {
  requested: { key: "account.status.requested", tone: "wait" },
  confirmed: { key: "account.status.confirmed", tone: "ok" },
  completed: { key: "account.status.completed", tone: "done" },
  cancelled: { key: "account.status.cancelled", tone: "off" },
};

/**
 * A booking status for display. Known statuses come back with a message `key`; an unknown
 * status (set by hand in the database) has no key and shows its own text, capitalised.
 */
export function statusOf(status: string): { key: string | null; label: string; tone: Tone } {
  const known = STATUS_LABELS[status];
  if (known) return { key: known.key, label: "", tone: known.tone };
  const text = status ? status.charAt(0).toUpperCase() + status.slice(1) : "";
  return text ? { key: null, label: text, tone: "wait" } : { key: STATUS_LABELS.requested.key, label: "", tone: "wait" };
}

/** The text of a status chip. */
export function statusLabel(status: string, t: TFunction): string {
  const { key, label } = statusOf(status);
  return key ? t(key) : label;
}

/** Is the (first) pickup still ahead, in London time? Cancelled and completed trips are never "upcoming". */
export function isUpcoming(booking: Pick<MyBooking, "status" | "journey">, now: Date = new Date()): boolean {
  if (booking.status === "cancelled" || booking.status === "completed") return false;
  const current = londonNow(now);
  const nowKey = `${current.date} ${current.time}`;
  return `${booking.journey.date} ${booking.journey.time}` >= nowKey;
}

export function splitBookings(list: MyBooking[], now: Date = new Date()) {
  const upcoming = list.filter((b) => isUpcoming(b, now));
  // soonest first for what is coming; newest first for history (the API order)
  upcoming.sort((a, b) => `${a.journey.date} ${a.journey.time}`.localeCompare(`${b.journey.date} ${b.journey.time}`));
  const past = list.filter((b) => !upcoming.includes(b));
  return { upcoming, past };
}

/** "5 Oct 2026" (the day the booking was requested, London time) in the visitor's language. */
export function requestedOn(iso: string, locale: Locale = defaultLocale): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const { date } = londonNow(new Date(time));
  if (locale === defaultLocale) return formatDateLong(date).replace(/^\w{3} /, "");
  return new Intl.DateTimeFormat(localeInfo[locale].intl, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export type ChangeKind = "change" | "cancel";

/**
 * A WhatsApp link to the office, with the booking already quoted in the message. The text is built from the
 * `account.whatsapp.change|cancel` templates in the visitor's language.
 */
export function whatsappLink(booking: MyBooking, kind: ChangeKind, t: TFunction, locale: Locale = defaultLocale): string {
  const when = t("common.dateAt", { date: formatDateFor(booking.journey.date, locale), time: booking.journey.time });
  const text = t(kind === "cancel" ? "account.whatsapp.cancel" : "account.whatsapp.change", {
    reference: booking.reference,
    pickup: booking.journey.pickup,
    dropoff: booking.journey.dropoff,
    when,
  });
  return `${siteConfig.whatsapp.url}?text=${encodeURIComponent(text)}`;
}

/** Can the customer still ask for a change or cancellation? */
export const canAskForChanges = (b: Pick<MyBooking, "status" | "journey">, now: Date = new Date()) =>
  isUpcoming(b, now);

/** The message key (`account.errors.*`) for an error code sent by the account routes. */
export function accountMessageKey(code: unknown): string {
  switch (code) {
    case "email-exists":
      return "account.errors.emailExists";
    case "invalid-credentials":
      return "account.errors.invalidCredentials";
    case "rate-limited":
      return "account.errors.rateLimited";
    case "too-fast":
      return "account.errors.tooFast";
    case "captcha-failed":
      return "account.errors.captchaFailed";
    case "disabled":
      return "account.errors.disabled";
    case "signed-out":
      return "account.errors.signedOut";
    case "storage-unavailable":
      return "account.errors.storageUnavailable";
    case "accounts-unavailable":
      return "account.errors.accountsUnavailable";
    default:
      return "account.errors.generic";
  }
}

/**
 * Messages for the account forms, in the visitor's language. `hint` is the developer note (development only,
 * always English) and is only added to the two "unavailable" messages.
 */
export function accountMessage(code: unknown, hint: unknown, t: TFunction): string {
  const developer = typeof hint === "string" && hint ? ` (Developer note: ${hint})` : "";
  const text = t(accountMessageKey(code), { phone: siteConfig.phone.display });
  return code === "storage-unavailable" || code === "accounts-unavailable" ? `${text}${developer}` : text;
}
