/** Shared form-field helpers (contact form and booking form). */

/** Remove control characters; keeps tabs and new lines. Not a string → "". */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

/** One line: control characters out, runs of spaces collapsed. */
export function cleanLine(value: unknown): string {
  return cleanText(value).replace(/\s+/g, " ");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (value: string) => value.length <= 254 && EMAIL_RE.test(value);

/** Returns a problem description, or null when the number looks fine (7–15 digits, optional +). */
export function phoneProblem(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (value.length > 30 || !/^[+\d][\d\s()+-]*$/.test(value) || digits.length < 7 || digits.length > 15) {
    return "That phone number doesn’t look right.";
  }
  return null;
}

/** UK-friendly international form for wa.me / tel links: "07700 900123" → "447700900123". */
export function whatsappNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (value.trim().startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `44${digits.slice(1)}`;
  return digits;
}
