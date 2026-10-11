import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateBooking } from "./booking";
import { buildBookingRecord } from "./booking-record";
import { buildBusinessEmail, buildCustomerEmail } from "./booking-email";
import { buildQuote } from "./quote";

const NOW = new Date("2026-10-05T09:00:00Z");
const raw = {
  pickup: { placeId: "ChIJluton_example_1", text: "Luton <b>Airport</b>" },
  dropoff: { placeId: "ChIJheathrow_example_2", text: "Heathrow Airport" },
  date: "2026-10-12",
  time: "09:30",
  passengers: 2,
  returnTrip: null,
  name: 'Ann "<i>Lee</i>"',
  email: "ann@example.com",
  phone: "07700 900123",
  luggage: "1–2 bags",
  vehicle: "No preference",
  childSeats: 0,
  flightNumber: "BA123",
  notes: "<script>alert(1)</script>\nSecond line",
  termsAccepted: true,
};

function record(withQuote: boolean) {
  const v = validateBooking(raw, NOW);
  assert.ok(v.ok);
  const quote = withQuote
    ? buildQuote(v.data.journey, {
        miles: 25,
        durationMinutes: 40,
        start: { lat: 51.8787, lng: -0.42 },
        end: { lat: 51.4723, lng: -0.4885 },
        path: [],
      })
    : null;
  return buildBookingRecord({
    reference: "LCT-ABC234",
    input: v.data,
    quote: quote && quote.ok ? quote.quote : null,
    estimateNote: withQuote ? null : "Distance lookup unavailable",
    now: NOW,
  });
}

describe("business email", () => {
  it("has the reference, customer, journey and a WhatsApp link, and says it is not confirmed", () => {
    const mail = buildBusinessEmail(record(true));
    assert.match(mail.subject, /LCT-ABC234/);
    assert.match(mail.text, /Not confirmed yet/);
    assert.match(mail.text, /07700 900123/);
    assert.match(mail.text, /https:\/\/wa\.me\/447700900123/);
    assert.match(mail.text, /not a fixed price/);
    assert.match(mail.text, /£75\.00/);
    assert.match(mail.text, /Excluding Dart charges/);
    assert.match(mail.text, /pays the driver in the car/);
  });

  it("escapes everything the customer typed", () => {
    const mail = buildBusinessEmail(record(true));
    assert.ok(!mail.html.includes("<script>"));
    assert.ok(!mail.html.includes("<i>Lee</i>"));
    assert.ok(!mail.html.includes("<b>Airport</b>"));
    assert.ok(mail.html.includes("&lt;script&gt;"));
  });

  it("asks for a manual quote when there is no estimate", () => {
    const mail = buildBusinessEmail(record(false));
    assert.match(mail.text, /NO ESTIMATE/);
    assert.match(mail.text, /quote manually/);
  });
});

describe("customer email", () => {
  it("is a receipt for a request, never a confirmation, with the not-fixed-price wording", () => {
    const mail = buildCustomerEmail(record(true));
    assert.match(mail.subject, /received your booking request LCT-ABC234/);
    assert.match(mail.text, /not a confirmed booking yet/);
    assert.match(mail.text, /not a fixed price/i);
    assert.match(mail.text, /pay your driver in the car/i);
    assert.match(mail.text, /01582 353158/);
    assert.ok(!/confirmed\.\s*$/m.test(mail.text));
  });

  it("escapes the customer's own text", () => {
    const mail = buildCustomerEmail(record(true));
    assert.ok(!mail.html.includes("<i>Lee</i>"));
    assert.ok(!mail.html.includes("<b>Airport</b>"));
  });

  it("omits the estimate when there was none", () => {
    const mail = buildCustomerEmail(record(false));
    assert.ok(!mail.text.includes("Estimate:"));
  });
});
