/**
 * Contact form – shared rules.
 * Used by the browser (instant feedback) AND the API route (the real check:
 * never trust the browser).
 */

import { cleanLine, cleanText, isEmail, phoneProblem } from "@/lib/fields";

export const CONTACT_TOPICS = [
  "Get a quote",
  "Make a booking",
  "Corporate account",
  "Lost property",
  "Something else",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  phone: 30,
  messageMin: 10,
  message: 3000,
} as const;

export type ContactInput = {
  name: string;
  email: string;
  phone: string;
  topic: ContactTopic;
  message: string;
};

export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

export type ContactResult =
  | { ok: true; data: ContactInput }
  | { ok: false; errors: ContactErrors };

export function validateContact(raw: unknown): ContactResult {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: ContactErrors = {};

  const name = cleanLine(src.name);
  const email = cleanText(src.email).toLowerCase();
  const phone = cleanLine(src.phone);
  const topicRaw = cleanText(src.topic);
  const message = cleanText(src.message).replace(/\r\n/g, "\n");

  if (!name) errors.name = "Please tell us your name.";
  else if (name.length > CONTACT_LIMITS.name) errors.name = "That name is too long.";

  if (!email) errors.email = "Please enter your email address.";
  else if (!isEmail(email))
    errors.email = "That email address doesn’t look right.";

  if (phone) {
    const problem = phoneProblem(phone);
    if (problem) errors.phone = problem;
  }

  const topic = (CONTACT_TOPICS as readonly string[]).includes(topicRaw)
    ? (topicRaw as ContactTopic)
    : null;
  if (!topic) errors.topic = "Please choose what your message is about.";

  if (!message) errors.message = "Please write your message.";
  else if (message.length < CONTACT_LIMITS.messageMin)
    errors.message = "Please add a little more detail.";
  else if (message.length > CONTACT_LIMITS.message)
    errors.message = `Please keep your message under ${CONTACT_LIMITS.message} characters.`;

  if (Object.keys(errors).length > 0 || !topic) return { ok: false, errors };
  return { ok: true, data: { name, email, phone, topic, message } };
}
