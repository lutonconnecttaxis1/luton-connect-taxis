import { siteConfig } from "@/config/site";
import { pricingConfig } from "@/config/pricing";
import { whatsappNumber } from "@/lib/fields";
import { escapeHtml } from "@/lib/email";
import { formatDateLong } from "@/lib/pricing/dates";
import type { BookingRecord } from "@/lib/booking-record";
import type { Estimate } from "@/lib/pricing/types";

type Mail = { subject: string; text: string; html: string };

const gbp = (n: number) => `£${n.toFixed(2)}`;
const e = escapeHtml;

function journeyWhen(date: string, time: string) {
  return `${formatDateLong(date)} at ${time}`;
}

function estimateText(label: string, est: Estimate): string[] {
  const rows = est.lines.map(
    (l) => `   ${l.label}${l.detail ? ` (${l.detail})` : ""}: ${l.amount === null ? "confirmed on quote" : gbp(l.amount)}`,
  );
  return [`${label} – ${est.bandReason}`, ...rows, `   Subtotal: ${gbp(est.total)}${est.hasPendingFees ? " + fees to be confirmed" : ""}`];
}

function estimateHtml(label: string, est: Estimate): string {
  const rows = est.lines
    .map(
      (l) =>
        `<tr><td style="padding:3px 12px 3px 0;color:#444">${e(l.label)}${l.detail ? ` <span style="color:#888">(${e(l.detail)})</span>` : ""}</td><td style="padding:3px 0;text-align:right;white-space:nowrap">${l.amount === null ? "confirmed on quote" : gbp(l.amount)}</td></tr>`,
    )
    .join("");
  return `<p style="margin:14px 0 4px"><strong>${e(label)}</strong> <span style="color:#888">– ${e(est.bandReason)}</span></p><table style="border-collapse:collapse;font-size:14px;width:100%">${rows}<tr><td style="padding:6px 12px 0 0;border-top:1px solid #ddd"><strong>Subtotal</strong></td><td style="padding:6px 0 0;border-top:1px solid #ddd;text-align:right"><strong>${gbp(est.total)}</strong>${est.hasPendingFees ? " + fees to be confirmed" : ""}</td></tr></table>`;
}

function shell(title: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f5f6;font-family:Arial,Helvetica,sans-serif;color:#0b0f14">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:28px;border-radius:8px;font-size:15px;line-height:1.5">
<h2 style="margin:0 0 16px;font-size:21px">${e(title)}</h2>${inner}
<p style="margin:26px 0 0;padding-top:14px;border-top:1px solid #eee;color:#777;font-size:12px">${e(siteConfig.name)} · ${e(siteConfig.phone.display)} · ${e(siteConfig.email)}</p>
</div></body></html>`;
}

function detailRows(rows: Array<[string, string]>): string {
  return `<table style="border-collapse:collapse;font-size:15px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 18px 4px 0;color:#666;vertical-align:top;white-space:nowrap">${e(k)}</td><td style="padding:4px 0">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

/** The email the BUSINESS receives for every booking request. */
export function buildBusinessEmail(booking: BookingRecord): Mail {
  const { reference, customer, journey, options, estimate } = booking;
  const subject = `New booking request ${reference} – ${journeyWhen(journey.date, journey.time)} – ${customer.name}`;
  const wa = `https://wa.me/${whatsappNumber(customer.phone)}`;

  const lines = [
    `NEW BOOKING REQUEST ${reference}`,
    "Not confirmed yet – confirm with the customer by WhatsApp, phone or email.",
    "",
    `Customer: ${customer.name}`,
    `Phone:    ${customer.phone}  (WhatsApp: ${wa})`,
    `Email:    ${customer.email}`,
    "",
    `Pickup:   ${journey.pickup.text}`,
    `Drop-off: ${journey.dropoff.text}`,
    `When:     ${journeyWhen(journey.date, journey.time)}`,
    ...(journey.returnTrip ? [`Return:   ${journeyWhen(journey.returnTrip.date, journey.returnTrip.time)}`] : []),
    `People:   ${journey.passengers}`,
    `Luggage:  ${options.luggage}`,
    `Vehicle:  ${options.vehicle}`,
    `Child seats: ${options.childSeats}`,
    `Flight:   ${options.flightNumber ?? "(none given)"}`,
    `Notes:    ${options.notes ?? "(none)"}`,
    "",
  ];
  if (estimate) {
    lines.push(
      `ESTIMATE (not a fixed price): ${gbp(estimate.total)}${estimate.hasPendingFees ? " + airport fee to confirm" : ""}`,
      `${estimate.miles} miles, about ${estimate.durationMinutes} min. ${pricingConfig.chargesNotice.short}.`,
      ...estimateText("Outbound", estimate.outbound),
      ...(estimate.returnLeg ? estimateText("Return", estimate.returnLeg) : []),
    );
  } else {
    lines.push(`NO ESTIMATE – ${booking.estimateNote ?? "the price could not be worked out"}. Please quote manually.`);
  }
  lines.push("", "Customer pays the driver in the car.");

  const html = shell(
    `New booking request ${reference}`,
    `<p style="margin:0 0 16px;padding:10px 14px;background:#fff7e0;border-radius:6px">Not confirmed yet – please confirm with the customer by WhatsApp, phone or email.</p>` +
      detailRows([
        ["Customer", e(customer.name)],
        ["Phone", `<a href="tel:${e(customer.phone.replace(/[^\d+]/g, ""))}">${e(customer.phone)}</a> · <a href="${e(wa)}">WhatsApp</a>`],
        ["Email", `<a href="mailto:${e(customer.email)}">${e(customer.email)}</a>`],
        ["Pickup", e(journey.pickup.text)],
        ["Drop-off", e(journey.dropoff.text)],
        ["When", e(journeyWhen(journey.date, journey.time))],
        ...(journey.returnTrip ? ([["Return", e(journeyWhen(journey.returnTrip.date, journey.returnTrip.time))]] as Array<[string, string]>) : []),
        ["People", String(journey.passengers)],
        ["Luggage", e(options.luggage)],
        ["Vehicle", e(options.vehicle)],
        ["Child seats", String(options.childSeats)],
        ["Flight", e(options.flightNumber ?? "(none given)")],
        ["Notes", options.notes ? `<span style="white-space:pre-wrap">${e(options.notes)}</span>` : "(none)"],
      ]) +
      (estimate
        ? `<h3 style="margin:22px 0 4px;font-size:16px">Estimate – not a fixed price: ${gbp(estimate.total)}${estimate.hasPendingFees ? " + airport fee to confirm" : ""}</h3><p style="margin:0;color:#666;font-size:13px">${estimate.miles} miles, about ${estimate.durationMinutes} min. ${e(pricingConfig.chargesNotice.short)}.</p>${estimateHtml("Outbound", estimate.outbound)}${estimate.returnLeg ? estimateHtml("Return", estimate.returnLeg) : ""}`
        : `<p style="margin:18px 0 0;padding:10px 14px;background:#fdecea;border-radius:6px"><strong>No estimate</strong> – ${e(booking.estimateNote ?? "the price could not be worked out")}. Please quote manually.</p>`) +
      `<p style="margin:18px 0 0;color:#666;font-size:13px">The customer pays the driver in the car.</p>`,
  );

  return { subject, text: lines.join("\n"), html };
}

/** The email the CUSTOMER receives: a receipt for the request, never a confirmation. */
export function buildCustomerEmail(booking: BookingRecord): Mail {
  const { reference, customer, journey, estimate } = booking;
  const subject = `We’ve received your booking request ${reference} – ${siteConfig.name}`;

  const lines = [
    `Hello ${customer.name},`,
    "",
    `Thank you – we’ve received your booking request. Your reference is ${reference}.`,
    "",
    "This is a request, not a confirmed booking yet. We’ll confirm with you by WhatsApp, phone or email.",
    "",
    `Pickup:   ${journey.pickup.text}`,
    `Drop-off: ${journey.dropoff.text}`,
    `When:     ${journeyWhen(journey.date, journey.time)}`,
    ...(journey.returnTrip ? [`Return:   ${journeyWhen(journey.returnTrip.date, journey.returnTrip.time)}`] : []),
    `People:   ${journey.passengers}`,
    "",
  ];
  if (estimate) {
    lines.push(
      `Estimate: ${gbp(estimate.total)}${estimate.hasPendingFees ? " plus an airport fee we’ll confirm" : ""}`,
      pricingConfig.disclaimer,
      pricingConfig.chargesNotice.short + ".",
      "",
    );
  }
  lines.push(
    "You pay your driver in the car.",
    "",
    `To change or cancel, call ${siteConfig.phone.display} or WhatsApp ${siteConfig.whatsapp.display}, quoting ${reference}.`,
    `Terms: ${siteConfig.url}/terms`,
    "",
    siteConfig.name,
  );

  const html = shell(
    `We’ve received your request`,
    `<p style="margin:0 0 12px">Hello ${e(customer.name)},</p>` +
      `<p style="margin:0 0 12px">Thank you – we’ve received your booking request. Your reference is <strong style="font-size:18px">${e(reference)}</strong>.</p>` +
      `<p style="margin:0 0 16px;padding:10px 14px;background:#fff7e0;border-radius:6px">This is a request, not a confirmed booking yet. We’ll confirm with you by WhatsApp, phone or email.</p>` +
      detailRows([
        ["Pickup", e(journey.pickup.text)],
        ["Drop-off", e(journey.dropoff.text)],
        ["When", e(journeyWhen(journey.date, journey.time))],
        ...(journey.returnTrip ? ([["Return", e(journeyWhen(journey.returnTrip.date, journey.returnTrip.time))]] as Array<[string, string]>) : []),
        ["People", String(journey.passengers)],
      ]) +
      (estimate
        ? `<p style="margin:18px 0 4px"><strong>Estimate: ${gbp(estimate.total)}</strong>${estimate.hasPendingFees ? " plus an airport fee we’ll confirm" : ""}</p><p style="margin:0;color:#666;font-size:13px">${e(pricingConfig.disclaimer)} ${e(pricingConfig.chargesNotice.short)}.</p>`
        : "") +
      `<p style="margin:18px 0 0">You pay your driver in the car.</p>` +
      `<p style="margin:14px 0 0">To change or cancel, call <a href="tel:${e(siteConfig.phone.tel)}">${e(siteConfig.phone.display)}</a> or <a href="${e(siteConfig.whatsapp.url)}">WhatsApp us</a>, quoting ${e(reference)}.</p>` +
      `<p style="margin:14px 0 0;font-size:13px"><a href="${e(siteConfig.url)}/terms">Terms &amp; Conditions</a></p>`,
  );

  return { subject, text: lines.join("\n"), html };
}
