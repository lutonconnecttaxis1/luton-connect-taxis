import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MyBooking } from "./customers";
import { createT } from "./i18n/translate";
import {
  accountMessage,
  accountMessageKey,
  canAskForChanges,
  isUpcoming,
  requestedOn,
  splitBookings,
  statusLabel,
  statusOf,
  whatsappLink,
} from "./account-view";

// The English wording of the keys these helpers use (the real table is messages/en.json).
const t = createT({
  common: { dateAt: "{date} at {time}" },
  account: {
    status: { requested: "Requested – awaiting our confirmation", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled" },
    whatsapp: {
      change: "Hello, I’d like to change booking {reference} ({pickup} to {dropoff}, {when}).",
      cancel: "Hello, I’d like to cancel booking {reference} ({pickup} to {dropoff}, {when}).",
    },
    errors: {
      invalidCredentials: "That email and password don’t match. Check them and try again, or reset your password.",
      accountsUnavailable: "Accounts aren’t available right now. You can still book as a guest on the homepage, or call {phone}.",
      storageUnavailable: "We couldn’t load that just now. Please try again in a moment.",
      generic: "Something went wrong. Please try again, or call {phone}.",
    },
  },
});

const booking = (over: Partial<MyBooking> & { date?: string; time?: string } = {}): MyBooking => ({
  reference: over.reference ?? "LCT-ABC234",
  status: over.status ?? "requested",
  createdAt: "2026-10-05T10:00:00Z",
  journey: { pickup: "Luton Airport", dropoff: "Heathrow", date: over.date ?? "2026-10-20", time: over.time ?? "10:30", passengers: 2, returnTrip: null },
  options: { luggage: "", vehicle: "", childSeats: 0, flightNumber: null, notes: null },
  estimate: null,
});

// 5 Oct 2026 12:00 UTC = 13:00 in London (BST)
const NOW = new Date("2026-10-05T12:00:00Z");

describe("upcoming vs past", () => {
  it("compares in London time", () => {
    assert.equal(isUpcoming(booking({ date: "2026-10-05", time: "13:30" }), NOW), true);
    assert.equal(isUpcoming(booking({ date: "2026-10-05", time: "12:30" }), NOW), false);
    assert.equal(isUpcoming(booking({ date: "2026-10-20" }), NOW), true);
    assert.equal(isUpcoming(booking({ date: "2026-09-01" }), NOW), false);
  });

  it("never treats cancelled or completed trips as upcoming", () => {
    assert.equal(isUpcoming(booking({ status: "cancelled" }), NOW), false);
    assert.equal(isUpcoming(booking({ status: "completed" }), NOW), false);
  });

  it("puts the soonest first for upcoming and keeps history order", () => {
    const list = [
      booking({ reference: "LCT-LATE22", date: "2026-12-01" }),
      booking({ reference: "LCT-SOON22", date: "2026-10-10" }),
      booking({ reference: "LCT-PAST22", date: "2026-09-01" }),
    ];
    const { upcoming, past } = splitBookings(list, NOW);
    assert.deepEqual(upcoming.map((b) => b.reference), ["LCT-SOON22", "LCT-LATE22"]);
    assert.deepEqual(past.map((b) => b.reference), ["LCT-PAST22"]);
  });

  it("offers change/cancel only for trips still ahead", () => {
    assert.equal(canAskForChanges(booking(), NOW), true);
    assert.equal(canAskForChanges(booking({ date: "2026-09-01" }), NOW), false);
  });
});

describe("labels and links", () => {
  it("knows the statuses and copes with new ones", () => {
    assert.equal(statusOf("confirmed").tone, "ok");
    assert.equal(statusOf("requested").key, "account.status.requested");
    assert.match(statusLabel("requested", t), /awaiting/);
    assert.equal(statusLabel("confirmed", t), "Confirmed");
    assert.equal(statusOf("on-hold").key, null);
    assert.equal(statusLabel("on-hold", t), "On-hold");
    assert.equal(statusOf("").tone, "wait");
    assert.equal(statusLabel("", t), "Requested – awaiting our confirmation");
  });

  it("formats the request date", () => {
    assert.equal(requestedOn("2026-10-05T10:00:00Z"), "5 Oct 2026");
    assert.equal(requestedOn("2026-10-05T10:00:00Z", "en"), "5 Oct 2026");
    assert.match(requestedOn("2026-10-05T10:00:00Z", "de"), /5\.? ?Okt/);
    assert.equal(requestedOn("nonsense"), "");
  });

  it("builds a WhatsApp message that quotes the booking", () => {
    const link = whatsappLink(booking(), "cancel", t, "en");
    assert.ok(link.startsWith("https://wa.me/441582353158?text="));
    const text = decodeURIComponent(link.split("text=")[1]);
    assert.match(text, /cancel booking LCT-ABC234/);
    assert.match(text, /Luton Airport to Heathrow, Tue 20 Oct 2026 at 10:30/);
    assert.match(decodeURIComponent(whatsappLink(booking(), "change", t, "en").split("text=")[1]), /change booking/);
  });

  it("writes the date in the visitor's language", () => {
    const text = decodeURIComponent(whatsappLink(booking(), "change", t, "de").split("text=")[1]);
    assert.doesNotMatch(text, /Tue 20 Oct 2026/);
    assert.match(text, /2026/);
  });
});

describe("messages", () => {
  it("only adds the developer note when there is one", () => {
    assert.ok(!accountMessage("accounts-unavailable", undefined, t).includes("Developer"));
    assert.match(accountMessage("accounts-unavailable", "key is empty", t), /call 01582 353158\. \(Developer note: key is empty\)$/);
    assert.match(accountMessage("storage-unavailable", "x", t), /moment\. \(Developer note: x\)$/);
    assert.ok(!accountMessage("invalid-credentials", "x", t).includes("Developer"));
    assert.match(accountMessage("invalid-credentials", undefined, t), /don’t match/);
    assert.match(accountMessage("whatever", undefined, t), /Something went wrong/);
  });

  it("maps every code the routes send to its own message key", () => {
    assert.equal(accountMessageKey("email-exists"), "account.errors.emailExists");
    assert.equal(accountMessageKey("captcha-failed"), "account.errors.captchaFailed");
    assert.equal(accountMessageKey("forbidden"), "account.errors.generic");
    assert.equal(accountMessageKey(undefined), "account.errors.generic");
  });
});
