import { cleanLine, cleanText, isEmail, phoneProblem } from "@/lib/fields";

/** Shared by the account forms (browser) and the account routes (server). No Node-only imports here. */

export const ACCOUNT_LIMITS = { name: 100, passwordMin: 8, passwordMax: 128 } as const;

export type RegisterErrors = Partial<Record<"name" | "email" | "phone" | "password" | "terms", string>>;
export type LoginErrors = Partial<Record<"email" | "password", string>>;
export type ProfileErrors = Partial<Record<"name" | "phone", string>>;

export type RegisterInput = { name: string; email: string; phone: string; password: string };
export type LoginInput = { email: string; password: string };
export type ProfileInput = { name: string; phone: string };

type Result<T, E> = { ok: true; data: T } | { ok: false; errors: E };

function src(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

/** Passwords are never trimmed or altered – only checked. */
function passwordOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function emailProblem(email: string): string | null {
  if (!email) return "Please enter your email address.";
  if (!isEmail(email)) return "That email address doesn’t look right.";
  return null;
}

function nameProblem(name: string): string | null {
  if (!name) return "Please tell us your name.";
  if (name.length > ACCOUNT_LIMITS.name) return "That name is too long.";
  return null;
}

/** Phone is optional on the account, but if it is given it must look like a number. */
function optionalPhoneProblem(phone: string): string | null {
  return phone ? phoneProblem(phone) : null;
}

export function validateRegister(raw: unknown): Result<RegisterInput, RegisterErrors> {
  const body = src(raw);
  const name = cleanLine(body.name);
  const email = cleanText(body.email).toLowerCase();
  const phone = cleanLine(body.phone);
  const password = passwordOf(body.password);
  const errors: RegisterErrors = {};

  const n = nameProblem(name);
  if (n) errors.name = n;
  const e = emailProblem(email);
  if (e) errors.email = e;
  const p = optionalPhoneProblem(phone);
  if (p) errors.phone = p;

  if (!password) errors.password = "Please choose a password.";
  else if (password.length < ACCOUNT_LIMITS.passwordMin) {
    errors.password = `Use at least ${ACCOUNT_LIMITS.passwordMin} characters.`;
  } else if (password.length > ACCOUNT_LIMITS.passwordMax) {
    errors.password = "That password is too long.";
  }
  if (body.termsAccepted !== true) {
    errors.terms = "Please tick the box to agree to the Terms and Privacy Policy.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, email, phone, password } };
}

export function validateLogin(raw: unknown): Result<LoginInput, LoginErrors> {
  const body = src(raw);
  const email = cleanText(body.email).toLowerCase();
  const password = passwordOf(body.password);
  const errors: LoginErrors = {};

  const e = emailProblem(email);
  if (e) errors.email = e;
  if (!password) errors.password = "Please enter your password.";
  else if (password.length > ACCOUNT_LIMITS.passwordMax) errors.password = "That password is too long.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { email, password } };
}

export function validateResetEmail(raw: unknown): Result<{ email: string }, { email?: string }> {
  const email = cleanText(src(raw).email).toLowerCase();
  const problem = emailProblem(email);
  return problem ? { ok: false, errors: { email: problem } } : { ok: true, data: { email } };
}

export function validateProfile(raw: unknown): Result<ProfileInput, ProfileErrors> {
  const body = src(raw);
  const name = cleanLine(body.name);
  const phone = cleanLine(body.phone);
  const errors: ProfileErrors = {};

  const n = nameProblem(name);
  if (n) errors.name = n;
  const p = optionalPhoneProblem(phone);
  if (p) errors.phone = p;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, phone } };
}

/** What the browser is told about the signed-in person. */
export type AccountUser = { uid: string; email: string; name: string; phone: string };

/** The cookie the browser can read (and nothing else): "a login exists", so the header can say "My account". */
export const SIGNED_IN_FLAG = "lct_in";

export function hasSignedInFlag(cookieString: string): boolean {
  return cookieString.split(";").some((part) => part.trim() === `${SIGNED_IN_FLAG}=1`);
}
