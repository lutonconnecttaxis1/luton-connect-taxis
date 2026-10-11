import type { AccountUser } from "@/lib/account";
import { deleteDocument, getDocument, queryByField, updateDocument, FirestoreError } from "@/lib/firestore";

/**
 * Customer profiles (collection "customers", id = Firebase user id) and the
 * "my bookings" lookup. SERVER ONLY – browsers never touch Firestore.
 */

const PROFILES = "customers";
const BOOKINGS = "bookings";

const str = (value: unknown): string => (typeof value === "string" ? value : "");

export async function readProfile(uid: string, email: string): Promise<AccountUser> {
  let data: Record<string, unknown> | null = null;
  try {
    data = await getDocument(PROFILES, uid);
  } catch (error) {
    // A profile problem must not lock someone out of their account.
    if (!(error instanceof FirestoreError)) throw error;
  }
  return { uid, email, name: str(data?.name), phone: str(data?.phone) };
}

export async function saveProfile(
  uid: string,
  fields: { name: string; phone: string; email?: string },
  now: Date = new Date(),
): Promise<void> {
  await updateDocument(PROFILES, uid, { ...fields, updatedAt: now });
}

/** `title` is the English label; the page translates by `kind`. */
export type MyLeg = { kind: "journey" | "outbound" | "return"; title: string; band: string; lines: { label: string; amount: number | null }[] };

/** A booking as shown on the account page: only what the customer needs, never internal fields. */
export type MyBooking = {
  reference: string;
  status: string;
  createdAt: string;
  journey: {
    pickup: string;
    dropoff: string;
    date: string;
    time: string;
    passengers: number;
    returnTrip: { date: string; time: string } | null;
  };
  options: { luggage: string; vehicle: string; childSeats: number; flightNumber: string | null; notes: string | null };
  estimate: {
    total: number;
    hasPendingFees: boolean;
    miles: number;
    legs: MyLeg[];
  } | null;
};

type Leg = { bandReason?: unknown; lines?: unknown };

/** Places are stored as { placeId, text }; older or hand-made records may hold plain text. */
const placeText = (value: unknown): string =>
  typeof value === "string" ? value : str((value as Record<string, unknown> | null)?.text);

function legOf(kind: MyLeg["kind"], title: string, leg: unknown): MyLeg {
  const data = (leg && typeof leg === "object" ? leg : {}) as Leg;
  const lines = Array.isArray(data.lines) ? data.lines : [];
  return {
    kind,
    title,
    band: str(data.bandReason),
    lines: lines.map((line) => {
      const l = (line && typeof line === "object" ? line : {}) as Record<string, unknown>;
      return { label: str(l.label), amount: typeof l.amount === "number" ? l.amount : null };
    }),
  };
}

/** Turns a stored Firestore booking into the customer-safe shape. Null if it is not a usable booking. */
export function toMyBooking(raw: Record<string, unknown>): MyBooking | null {
  const journey = (raw.journey ?? null) as Record<string, unknown> | null;
  const options = (raw.options ?? {}) as Record<string, unknown>;
  const estimate = (raw.estimate ?? null) as Record<string, unknown> | null;
  if (!journey || typeof raw.reference !== "string") return null;

  const returnTrip = journey.returnTrip as Record<string, unknown> | null;
  const hasReturn = !!estimate?.returnLeg;

  return {
    reference: raw.reference,
    status: str(raw.status) || "requested",
    createdAt: str(raw.createdAt),
    journey: {
      pickup: placeText(journey.pickup),
      dropoff: placeText(journey.dropoff),
      date: str(journey.date),
      time: str(journey.time),
      passengers: Number(journey.passengers) || 1,
      returnTrip: returnTrip ? { date: str(returnTrip.date), time: str(returnTrip.time) } : null,
    },
    options: {
      luggage: str(options.luggage),
      vehicle: str(options.vehicle),
      childSeats: Number(options.childSeats) || 0,
      flightNumber: str(options.flightNumber) || null,
      notes: str(options.notes) || null,
    },
    estimate: estimate
      ? {
          total: Number(estimate.total) || 0,
          hasPendingFees: estimate.hasPendingFees === true,
          miles: Number(estimate.miles) || 0,
          legs: [
            legOf(hasReturn ? "outbound" : "journey", hasReturn ? "Outbound" : "Journey", estimate.outbound),
            ...(hasReturn ? [legOf("return", "Return", estimate.returnLeg)] : []),
          ],
        }
      : null,
  };
}

/** The customer's bookings, newest request first. */
export async function listMyBookings(uid: string): Promise<MyBooking[]> {
  const rows = await queryByField(BOOKINGS, "userId", uid, 200);
  return rows
    .map(toMyBooking)
    .filter((b): b is MyBooking => b !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/**
 * After an account is deleted: remove the profile and detach the bookings from
 * the login. The bookings themselves stay (the business keeps its records).
 */
export async function eraseAccountData(uid: string): Promise<{ detached: number }> {
  const rows = await queryByField(BOOKINGS, "userId", uid, 500);
  let detached = 0;
  for (const row of rows) {
    if (typeof row.reference !== "string") continue;
    await updateDocument(BOOKINGS, row.reference, { userId: null });
    detached++;
  }
  await deleteDocument(PROFILES, uid);
  return { detached };
}
