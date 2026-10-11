import { pricingConfig } from "@/config/pricing";
import { daysBetween, isValidDate, isValidTime, londonNow, toMinutes } from "@/lib/pricing/dates";

/**
 * A journey as sent by the browser: two Google places (by id), a pickup time
 * and the number of passengers. Shared by /api/quote and /api/bookings, and by
 * the form for instant feedback. The server always re-checks.
 */
export type PlaceRef = { placeId: string; text: string };

export type JourneyInput = {
  pickup: PlaceRef;
  dropoff: PlaceRef;
  /** London wall-clock "YYYY-MM-DD" / "HH:MM". */
  date: string;
  time: string;
  passengers: number;
  returnTrip: { date: string; time: string } | null;
};

export type JourneyErrors = Partial<
  Record<"pickup" | "dropoff" | "date" | "time" | "passengers" | "returnDate" | "returnTime", string>
>;

export type JourneyResult = { ok: true; data: JourneyInput } | { ok: false; errors: JourneyErrors };

const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/;

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function parsePlace(raw: unknown): PlaceRef | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const placeId = typeof src.placeId === "string" ? src.placeId.trim() : "";
  const text = cleanText(src.text, 300);
  if (!PLACE_ID_RE.test(placeId) || !text) return null;
  return { placeId, text };
}

/** Minutes since 1970-01-01 00:00 London wall-clock – only used to compare two bookings or "now". */
const epochMinutes = (date: string, time: string) => daysBetween("1970-01-01", date) * 1440 + toMinutes(time);

export function validateJourney(raw: unknown, now: Date = new Date()): JourneyResult {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: JourneyErrors = {};

  const pickup = parsePlace(src.pickup);
  const dropoff = parsePlace(src.dropoff);
  if (!pickup) errors.pickup = "Choose a pickup from the suggestions.";
  if (!dropoff) errors.dropoff = "Choose a drop-off from the suggestions.";
  if (pickup && dropoff && pickup.placeId === dropoff.placeId) {
    errors.dropoff = "Pickup and drop-off can’t be the same place.";
  }

  const date = typeof src.date === "string" ? src.date : "";
  const time = typeof src.time === "string" ? src.time : "";
  const london = londonNow(now);
  const nowMinutes = epochMinutes(london.date, london.time);

  if (!isValidDate(date)) errors.date = "Choose a pickup date.";
  if (!isValidTime(time)) errors.time = "Choose a pickup time.";
  if (!errors.date && !errors.time) {
    const when = epochMinutes(date, time);
    if (when < nowMinutes + pricingConfig.minLeadMinutes) {
      errors.time =
        when < nowMinutes
          ? "That time has already passed."
          : "For pickups within the hour, please call us.";
    } else if (daysBetween(london.date, date) > pricingConfig.maxAdvanceDays) {
      errors.date = "That date is too far ahead – please call us.";
    }
  }

  const passengers = typeof src.passengers === "number" ? src.passengers : Number(src.passengers);
  if (!Number.isInteger(passengers) || passengers < 1) {
    errors.passengers = "Choose how many people are travelling.";
  } else if (passengers > pricingConfig.maxPassengers) {
    errors.passengers = `For more than ${pricingConfig.maxPassengers} people, please call us for a quote.`;
  }

  let returnTrip: JourneyInput["returnTrip"] = null;
  if (src.returnTrip !== null && src.returnTrip !== undefined && src.returnTrip !== false) {
    const rt = (typeof src.returnTrip === "object" ? src.returnTrip : {}) as Record<string, unknown>;
    const rDate = typeof rt.date === "string" ? rt.date : "";
    const rTime = typeof rt.time === "string" ? rt.time : "";
    if (!isValidDate(rDate)) errors.returnDate = "Choose a return date.";
    if (!isValidTime(rTime)) errors.returnTime = "Choose a return time.";
    if (!errors.returnDate && !errors.returnTime) {
      if (!errors.date && !errors.time && epochMinutes(rDate, rTime) <= epochMinutes(date, time)) {
        errors.returnTime = "The return must be after your outbound pickup.";
      } else if (daysBetween(london.date, rDate) > pricingConfig.maxAdvanceDays) {
        errors.returnDate = "That date is too far ahead – please call us.";
      } else {
        returnTrip = { date: rDate, time: rTime };
      }
    }
  }

  if (Object.keys(errors).length > 0 || !pickup || !dropoff) return { ok: false, errors };
  return { ok: true, data: { pickup, dropoff, date, time, passengers, returnTrip } };
}
