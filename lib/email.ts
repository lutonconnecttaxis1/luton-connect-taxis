/**
 * Sends email through Resend's HTTPS API (no extra npm package needed).
 * Server only – only import this from route handlers / server code, so the
 * API key never reaches the browser.
 */

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

export type MailOutcome =
  | { status: "sent" }
  | { status: "not-configured" }
  | { status: "failed"; reason: string };

const DEFAULT_FROM = "Luton Connect Taxis <onboarding@resend.dev>";

export async function sendMail(message: MailMessage): Promise<MailOutcome> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { status: "not-configured" };

  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      // Log the provider's reason on the server only (never sent to the visitor).
      const detail = await res.text().catch(() => "");
      console.error(`[email] Resend rejected the message (${res.status}): ${detail.slice(0, 300)}`);
      return { status: "failed", reason: `provider-${res.status}` };
    }
    return { status: "sent" };
  } catch (error) {
    console.error("[email] Could not reach Resend:", error);
    return { status: "failed", reason: "network" };
  }
}

/** Escape text before placing it inside HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
