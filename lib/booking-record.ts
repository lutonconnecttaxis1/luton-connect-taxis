import { randomInt } from "node:crypto";
import type { BookingInput } from "@/lib/booking";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Quote } from "@/lib/quote";

/** Server-only half of the booking module (uses node:crypto). The form imports lib/booking.ts instead. */

/** No 0/O/1/I/L, so a reference read over the phone is never ambiguous. */
const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateReference(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `LCT-${code}`;
}

export type NotificationState = "pending" | "sent" | "failed" | "skipped";

/** The document stored in Firestore (collection "bookings", id = reference). */
export function buildBookingRecord(args: {
  reference: string;
  input: BookingInput;
  quote: Quote | null;
  estimateNote: string | null;
  now: Date;
  /** Firebase user id of the signed-in customer; null/omitted for guests. */
  userId?: string | null;
  /** The language the customer was using on the website (staff emails stay in English). */
  locale?: Locale;
}) {
  const { reference, input, quote, estimateNote, now, userId = null, locale = defaultLocale } = args;
  const { journey, details } = input;
  return {
    reference,
    status: "requested",
    source: "website",
    locale: locale as Locale,
    createdAt: now,
    // The signed-in customer's Firebase user id (shown in their account history); guests stay null.
    userId: userId as string | null,
    customer: { name: details.name, email: details.email, phone: details.phone },
    journey: {
      pickup: journey.pickup,
      dropoff: journey.dropoff,
      date: journey.date,
      time: journey.time,
      passengers: journey.passengers,
      returnTrip: journey.returnTrip,
    },
    options: {
      luggage: details.luggage,
      vehicle: details.vehicle,
      childSeats: details.childSeats,
      flightNumber: details.flightNumber || null,
      notes: details.notes || null,
    },
    estimate: quote
      ? {
          total: quote.total,
          hasPendingFees: quote.hasPendingFees,
          miles: quote.miles,
          durationMinutes: quote.durationMinutes,
          pickupAirport: quote.pickup.airport,
          dropoffAirport: quote.dropoff.airport,
          outbound: quote.outbound,
          returnLeg: quote.returnLeg,
          notFixedPrice: true,
        }
      : null,
    estimateNote,
    termsAccepted: true,
    notifications: { business: "pending" as NotificationState, customer: "pending" as NotificationState },
  };
}

export type BookingRecord = ReturnType<typeof buildBookingRecord>;
