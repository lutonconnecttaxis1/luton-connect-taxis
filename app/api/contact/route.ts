import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { validateContact } from "@/lib/contact";
import { escapeHtml, sendMail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, sameOrigin } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 20_000;
/** A real person needs more than this to fill the form in. */
const MIN_FILL_MS = 2_000;
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

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

  // Honeypot: real visitors never see or fill this field. Pretend it worked.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true, delivered: true });
  }

  // Too fast to be a person.
  const openedAt = Number(body.openedAt);
  if (Number.isFinite(openedAt) && Date.now() - openedAt < MIN_FILL_MS) {
    return json({ ok: false, error: "too-fast" }, 429);
  }

  if (!rateLimit(`contact:${clientIp(request)}`, MAX_PER_WINDOW, WINDOW_MS)) {
    return json({ ok: false, error: "rate-limited" }, 429);
  }

  const result = validateContact(body);
  if (!result.ok) return json({ ok: false, error: "invalid", errors: result.errors }, 422);
  const { name, email, phone, topic, message } = result.data;

  const subject = `Website enquiry – ${topic} – ${name}`.replace(/[\r\n]+/g, " ");
  const plain = [
    "New message from the Luton Connect Taxis website",
    "",
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Phone:   ${phone || "(not given)"}`,
    `Topic:   ${topic}`,
    "",
    "Message:",
    message,
    "",
    "Reply to this email to answer the customer directly.",
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top">${label}</td><td style="padding:6px 0">${value}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f5f6;font-family:Arial,Helvetica,sans-serif;color:#0b0f14">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:28px;border-radius:8px">
<h2 style="margin:0 0 4px;font-size:20px">New website message</h2>
<p style="margin:0 0 18px;color:#666;font-size:14px">${escapeHtml(siteConfig.name)} · contact form</p>
<table style="border-collapse:collapse;font-size:15px">
${row("Name", escapeHtml(name))}
${row("Email", `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`)}
${row("Phone", phone ? `<a href="tel:${escapeHtml(phone.replace(/[^\d+]/g, ""))}">${escapeHtml(phone)}</a>` : "(not given)")}
${row("Topic", escapeHtml(topic))}
</table>
<p style="margin:20px 0 6px;color:#666;font-size:14px">Message</p>
<div style="white-space:pre-wrap;font-size:15px;line-height:1.55;border-left:3px solid #20a8b4;padding-left:14px">${escapeHtml(message)}</div>
<p style="margin:24px 0 0;color:#666;font-size:13px">Press Reply to answer the customer directly.</p>
</div></body></html>`;

  const outcome = await sendMail({
    to: siteConfig.email,
    subject,
    text: plain,
    html,
    replyTo: email,
  });

  if (outcome.status === "sent") return json({ ok: true, delivered: true });

  if (outcome.status === "not-configured") {
    // Local development without an email key: show the message in the terminal
    // so the form can be tested. On a live site this is a real error.
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[contact form – email not configured, nothing was sent]\nTo: ${siteConfig.email}\nSubject: ${subject}\n\n${plain}\n`);
      return json({ ok: true, delivered: false });
    }
    console.error("[contact] RESEND_API_KEY is not set – message could not be emailed.");
  }

  return json({ ok: false, error: "send-failed" }, 502);
}
