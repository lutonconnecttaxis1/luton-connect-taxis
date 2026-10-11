import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateBooking } from "./booking";
import { buildBookingRecord, generateReference } from "./booking-record";

const NOW = new Date("2026-10-05T09:00:00Z"); // Mon 5 Oct 2026, 10:00 London

const valid = () => ({
  pickup: { placeId: "ChIJluton_example_1", text: "Luton Airport" },
  dropoff: { placeId: "ChIJheathrow_example_2", text: "Heathrow Airport" },
  date: "2026-10-12",
  time: "09:30",
  passengers: 2,
  returnTrip: null,
  name: "Ann Lee",
  email: "Ann@Example.com",
  phone: "07700 900123",
  luggage: "1–2 bags",
  vehicle: "LEVC TX e",
  childSeats: 1,
  flightNumber: "ba 123",
  notes: "Please meet at arrivals.",
  termsAccepted: true,
});

function errorsFor(raw: unknown) {
  const r = validateBooking(raw, NOW);
  assert.equal(r.ok, false);
  return r.ok ? {} : r.errors;
}

describe("validateBooking", () => {
  it("accepts a good request and tidies the details", () => {
    const r = validateBooking(valid(), NOW);
    assert.ok(r.ok);
    assert.equal(r.data.details.email, "ann@example.com");
    assert.equal(r.data.details.flightNumber, "BA 123");
    assert.equal(r.data.details.childSeats, 1);
    assert.equal(r.data.journey.passengers, 2);
  });

  it("needs name, email, phone and the Terms tick-box", () => {
    const e = errorsFor({ ...valid(), name: "", email: "", phone: "", termsAccepted: false });
    assert.ok(e.name && e.email && e.phone && e.terms);
    assert.ok(errorsFor({ ...valid(), termsAccepted: "yes" }).terms, "must be literally true");
  });

  it("reports journey problems alongside field problems", () => {
    const e = errorsFor({ ...valid(), pickup: null, email: "nope" });
    assert.ok(e.pickup && e.email);
  });

  it("checks flight number, child seats and notes length", () => {
    assert.ok(errorsFor({ ...valid(), flightNumber: "<script>" }).flightNumber);
    assert.ok(errorsFor({ ...valid(), childSeats: 4 }).childSeats);
    assert.ok(errorsFor({ ...valid(), notes: "x".repeat(1001) }).notes);
    assert.ok(validateBooking({ ...valid(), flightNumber: "", notes: "" }, NOW).ok);
  });

  it("falls back to safe defaults for unknown luggage and vehicle values", () => {
    const r = validateBooking({ ...valid(), luggage: "a piano", vehicle: "Limousine" }, NOW);
    assert.ok(r.ok);
    assert.equal(r.data.details.luggage, "No luggage");
    assert.equal(r.data.details.vehicle, "No preference");
  });

  it("accepts a return journey", () => {
    const r = validateBooking({ ...valid(), returnTrip: { date: "2026-10-14", time: "18:00" } }, NOW);
    assert.ok(r.ok);
    assert.deepEqual(r.data.journey.returnTrip, { date: "2026-10-14", time: "18:00" });
  });
});

describe("references", () => {
  it("look like LCT-XXXXXX with no confusing characters, and rarely repeat", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const ref = generateReference();
      assert.match(ref, /^LCT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
      seen.add(ref);
    }
    assert.ok(seen.size > 495);
  });
});

describe("buildBookingRecord", () => {
  it("stores a request (not a confirmation) with the customer's details and no estimate when none was made", () => {
    const r = validateBooking(valid(), NOW);
    assert.ok(r.ok);
    const record = buildBookingRecord({
      reference: "LCT-ABC234",
      input: r.data,
      quote: null,
      estimateNote: "Distance lookup unavailable",
      now: NOW,
    });
    assert.equal(record.status, "requested");
    assert.equal(record.userId, null);
    assert.equal(record.customer.email, "ann@example.com");
    assert.equal(record.estimate, null);
    assert.equal(record.estimateNote, "Distance lookup unavailable");
    assert.equal(record.options.notes, "Please meet at arrivals.");
    assert.deepEqual(record.notifications, { business: "pending", customer: "pending" });
    assert.equal(record.locale, "en");
  });

  it("stores the language the customer was using", () => {
    const r = validateBooking(valid(), NOW);
    assert.ok(r.ok);
    const record = buildBookingRecord({
      reference: "LCT-ABC234",
      input: r.data,
      quote: null,
      estimateNote: null,
      now: NOW,
      locale: "ro",
    });
    assert.equal(record.locale, "ro");
  });
});
