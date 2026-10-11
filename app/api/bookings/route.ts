import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { validateBooking } from "@/lib/booking";
import {
  buildBookingRecord,
  generateReference,
  type BookingRecord,
  type NotificationState,
} from "@/lib/booking-record";
import { buildBusinessEmail, buildCustomerEmail } from "@/lib/booking-email";
import { sendMail, type MailOutcome } from "@/lib/email";
import { createDocument, FirestoreError, isFirestoreConfigured, updateDocument } from "@/lib/firestore";
import { RouteError } from "@/lib/maps/routes";
import { quoteJourney, type Quote } from "@/lib/quote";
import { applyCookies, readSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { clientIp, sameOrigin } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 20_000;
/** A person needs longer than this to fill in the booking form. */
const MIN_FILL_MS = 5_000;
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;
const COLLECTION = "bookings";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const toState = (outcome: MailOutcome): NotificationState =>
  outcome.status === "sent" ? "sent" : outcome.status === "not-configured" ? "skipped" : "failed";

/** Emails the business and the customer. Never throws – a mail problem must not lose a booking. */
async function notify(record: BookingRecord) {
  const business = buildBusinessEmail(record);
  const customer = buildCustomerEmail(record);
  const businessTo = process.env.BOOKING_NOTIFY_EMAIL?.trim() || siteConfig.email;

  const [businessOutcome, customerOutcome] = await Promise.all([
    sendMail({ to: businessTo, replyTo: record.customer.email, ...business }),
    sendMail({ to: record.customer.email, replyTo: siteConfig.email, ...customer }),
  ]);

  if (businessOutcome.status === "not-configured" && process.env.NODE_ENV !== "production") {
    console.log(
      `\n[booking ${record.reference} – email not configured, nothing was sent]\nTo: ${businessTo}\nSubject: ${business.subject}\n\n${business.text}\n`,
    );
  }
  return { business: toState(businessOutcome), customer: toState(customerOutcome) };
}

/** POST /api/bookings – save a booking request and email it. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ ok: false, error: "forbidden" }, 403);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: "too-large" }, 413);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("bad body");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "bad-request" }, 400);
  }

  // Honeypot: people never see this field. Pretend it worked.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true, reference: "LCT-000000", stored: true, quote: null });
  }
  const openedAt = Number(body.openedAt);
  if (Number.isFinite(openedAt) && Date.now() - openedAt < MIN_FILL_MS) {
    return json({ ok: false, error: "too-fast" }, 429);
  }

  const ip = clientIp(request);
  if (!rateLimit(`booking:${ip}`, MAX_PER_WINDOW, WINDOW_MS)) {
    return json({ ok: false, error: "rate-limited" }, 429);
  }

  const captcha = await verifyRecaptcha(body.recaptchaToken, "booking", ip);
  if (!captcha.ok) return json({ ok: false, error: "captcha-failed" }, 403);

  const validated = validateBooking(body);
  if (!validated.ok) return json({ ok: false, error: "invalid", errors: validated.errors }, 422);
  const input = validated.data;
  // The language the visitor was using (stored with the booking; staff emails stay in English).
  const locale = isLocale(body.locale) ? body.locale : defaultLocale;

  // Signed in? Then the booking is saved to their account. Guests are welcome too.
  const session = await readSession(request);
  const userId = session.user?.uid ?? null;

  // Price it again on the server – never trust an estimate sent by the browser.
  let quote: Quote | null = null;
  let estimateNote: string | null = null;
  try {
    const result = await quoteJourney(input.journey);
    if (result.ok) quote = result.quote;
    else estimateNote = result.message;
  } catch (error) {
    if (error instanceof RouteError && error.kind === "no-route") {
      return json({ ok: false, error: "no-route" }, 422);
    }
    // Maps unavailable: still take the booking; the office quotes it by hand.
    console.error("[booking] Estimate unavailable:", error);
    estimateNote = "The distance lookup was unavailable when this was booked";
  }

  // Save it. The reference is the document id, so a clash is detected for free.
  const now = new Date();
  let record: BookingRecord | null = null;
  let stored = false;
  if (isFirestoreConfigured()) {
    for (let attempt = 0; attempt < 5 && !stored; attempt++) {
      const candidate = buildBookingRecord({ reference: generateReference(), input, quote, estimateNote, now, userId, locale });
      try {
        await createDocument(COLLECTION, candidate.reference, candidate);
        record = candidate;
        stored = true;
      } catch (error) {
        if (!(error instanceof FirestoreError && error.kind === "exists")) {
          console.error("[booking] Could not save the booking:", error);
          break;
        }
      }
    }
  }
  if (!record) record = buildBookingRecord({ reference: generateReference(), input, quote, estimateNote, now, userId, locale });

  const notifications = await notify(record);

  if (stored) {
    // Remember what was emailed so the office can see it in Firestore. Best effort.
    updateDocument(COLLECTION, record.reference, { notifications }).catch((error) =>
      console.error("[booking] Could not record the email status:", error),
    );
  } else if (process.env.NODE_ENV === "production" && notifications.business !== "sent") {
    // Neither saved nor emailed to the office: tell the customer honestly so they call.
    console.error(`[booking ${record.reference}] LOST – not stored and the office was not emailed.`);
    return json({ ok: false, error: "storage-unavailable" }, 503);
  } else if (!stored) {
    console.warn(
      `[booking ${record.reference}] Not saved to Firestore (${isFirestoreConfigured() ? "save failed" : "not configured"}).`,
    );
  }

  if (stored && notifications.business !== "sent") {
    console.warn(
      `[booking ${record.reference}] Saved, but the office was NOT emailed (${notifications.business}). Check Firestore → bookings.`,
    );
  }

  return applyCookies(
    json({
      ok: true,
      reference: record.reference,
      stored,
      quote,
      estimateNote,
      emailed: notifications.business === "sent",
      savedToAccount: stored && userId !== null,
    }),
    session.cookies,
  );
}
