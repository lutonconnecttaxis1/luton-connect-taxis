import { cleanLine, cleanText, isEmail, phoneProblem } from "@/lib/fields";
import { validateJourney, type JourneyErrors, type JourneyInput } from "@/lib/journey";

export const LUGGAGE_OPTIONS = [
  "No luggage",
  "1–2 bags",
  "3–4 bags",
  "5 or more (tell us in the notes)",
] as const;
export const VEHICLE_OPTIONS = ["No preference", "LEVC TX e", "Mercedes Vito 114"] as const;
export const MAX_CHILD_SEATS = 3;

export const BOOKING_LIMITS = { name: 100, flight: 12, notes: 1000 } as const;

export type BookingDetails = {
  name: string;
  email: string;
  phone: string;
  luggage: (typeof LUGGAGE_OPTIONS)[number];
  vehicle: (typeof VEHICLE_OPTIONS)[number];
  childSeats: number;
  flightNumber: string;
  notes: string;
};

export type BookingInput = { journey: JourneyInput; details: BookingDetails };

export type BookingErrors = JourneyErrors &
  Partial<Record<keyof BookingDetails | "terms", string>>;

export type BookingResult = { ok: true; data: BookingInput } | { ok: false; errors: BookingErrors };

/** Validates the whole booking request (journey + customer details + tick-box). */
export function validateBooking(raw: unknown, now: Date = new Date()): BookingResult {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: BookingErrors = {};

  const journey = validateJourney(src, now);
  if (!journey.ok) Object.assign(errors, journey.errors);

  const name = cleanLine(src.name);
  const email = cleanText(src.email).toLowerCase();
  const phone = cleanLine(src.phone);
  const luggageRaw = cleanText(src.luggage);
  const vehicleRaw = cleanText(src.vehicle);
  const flightNumber = cleanLine(src.flightNumber).toUpperCase();
  const notes = cleanText(src.notes).replace(/\r\n/g, "\n");
  const childSeats = typeof src.childSeats === "number" ? src.childSeats : Number(src.childSeats ?? 0);

  if (!name) errors.name = "Please tell us your name.";
  else if (name.length > BOOKING_LIMITS.name) errors.name = "That name is too long.";

  if (!email) errors.email = "Please enter your email address.";
  else if (!isEmail(email)) errors.email = "That email address doesn’t look right.";

  if (!phone) errors.phone = "Please enter a phone number we can reach you on.";
  else {
    const problem = phoneProblem(phone);
    if (problem) errors.phone = problem;
  }

  const luggage = (LUGGAGE_OPTIONS as readonly string[]).includes(luggageRaw)
    ? (luggageRaw as BookingDetails["luggage"])
    : "No luggage";
  const vehicle = (VEHICLE_OPTIONS as readonly string[]).includes(vehicleRaw)
    ? (vehicleRaw as BookingDetails["vehicle"])
    : "No preference";

  if (!Number.isInteger(childSeats) || childSeats < 0 || childSeats > MAX_CHILD_SEATS) {
    errors.childSeats = `Choose between 0 and ${MAX_CHILD_SEATS} child seats.`;
  }
  if (flightNumber && !/^[A-Z0-9 ]{2,12}$/.test(flightNumber)) {
    errors.flightNumber = "Flight numbers look like BA123 or U2 4567.";
  }
  if (notes.length > BOOKING_LIMITS.notes) {
    errors.notes = `Please keep notes under ${BOOKING_LIMITS.notes} characters.`;
  }
  if (src.termsAccepted !== true) {
    errors.terms = "Please tick the box to agree to the Terms and Privacy Policy.";
  }

  if (Object.keys(errors).length > 0 || !journey.ok) return { ok: false, errors };
  return {
    ok: true,
    data: {
      journey: journey.data,
      details: { name, email, phone, luggage, vehicle, childSeats, flightNumber, notes },
    },
  };
}
