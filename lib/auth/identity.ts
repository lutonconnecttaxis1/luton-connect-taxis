import { siteConfig } from "@/config/site";

/**
 * Firebase Authentication over Google's REST API (Identity Toolkit + Secure
 * Token). No extra npm package, and the browser never talks to Firebase: the
 * account routes call this, then keep the login in HTTP-only cookies.
 * SERVER ONLY.
 */

const IDENTITY = "https://identitytoolkit.googleapis.com/v1";
const SECURETOKEN = "https://securetoken.googleapis.com/v1/token";

export type IdentityErrorKind =
  | "not-configured"
  | "email-exists"
  | "invalid-credentials"
  | "weak-password"
  | "too-many-attempts"
  | "user-disabled"
  | "token-expired"
  | "sign-in-disabled"
  | "key-problem"
  | "failed";

export class IdentityError extends Error {
  constructor(
    public kind: IdentityErrorKind,
    /** Plain-English explanation for the developer (shown only while developing). */
    public detail = "",
  ) {
    super(`${kind}${detail ? `: ${detail}` : ""}`);
  }
}

export type Tokens = {
  idToken: string;
  refreshToken: string;
  /** Seconds the id token is valid for. */
  expiresIn: number;
  uid: string;
  email: string;
};

export const firebaseApiKey = () => process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? "";
export const isAuthConfigured = () => firebaseApiKey() !== "";

type GoogleError = {
  error?: { code?: number; message?: string; status?: string; details?: { reason?: string }[] };
};

/** Turns Google's error reply into one of our kinds, with a hint for the developer. */
export function interpretError(status: number, body: unknown): IdentityError {
  const err = (body as GoogleError | null)?.error;
  const message = String(err?.message ?? "");
  const reason = err?.details?.find((d) => d.reason)?.reason ?? "";
  const code = message.split(/[\s:]/)[0];

  switch (code) {
    case "EMAIL_EXISTS":
      return new IdentityError("email-exists");
    case "INVALID_LOGIN_CREDENTIALS":
    case "INVALID_PASSWORD":
    case "EMAIL_NOT_FOUND":
      return new IdentityError("invalid-credentials");
    case "WEAK_PASSWORD":
    case "PASSWORD_DOES_NOT_MEET_REQUIREMENTS": // a stricter password policy set in the Firebase console
      return new IdentityError("weak-password");
    case "USER_DISABLED":
      return new IdentityError("user-disabled");
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return new IdentityError("too-many-attempts");
    case "TOKEN_EXPIRED":
    case "INVALID_REFRESH_TOKEN":
    case "MISSING_REFRESH_TOKEN":
    case "USER_NOT_FOUND":
    case "INVALID_ID_TOKEN":
    case "CREDENTIAL_TOO_OLD_LOGIN_AGAIN":
      return new IdentityError("token-expired");
    case "OPERATION_NOT_ALLOWED":
    case "PASSWORD_LOGIN_DISABLED":
      return new IdentityError(
        "sign-in-disabled",
        "Email/Password sign-in is switched off. In Firebase → Authentication → Sign-in method, enable Email/Password.",
      );
    default:
  }

  if (reason === "API_KEY_HTTP_REFERRER_BLOCKED" || /referer .* are blocked/i.test(message)) {
    return new IdentityError(
      "key-problem",
      `The Firebase API key only allows certain websites. Add ${siteConfig.url}/* to its allowed websites (Google Cloud → Credentials), or remove the website restriction.`,
    );
  }
  if (reason === "API_KEY_INVALID" || /api key not valid/i.test(message)) {
    return new IdentityError(
      "key-problem",
      "NEXT_PUBLIC_FIREBASE_API_KEY is not a valid key. Copy it again from Firebase → Project settings → Your apps, then restart npm run dev.",
    );
  }
  if (reason === "API_KEY_SERVICE_BLOCKED" || /are blocked/i.test(message)) {
    return new IdentityError(
      "key-problem",
      "The Firebase API key is restricted to other APIs. Allow “Identity Toolkit API” and “Token Service API” on it (Google Cloud → Credentials).",
    );
  }
  if (/has not been used in project|is disabled|SERVICE_DISABLED/i.test(message) || reason === "SERVICE_DISABLED") {
    return new IdentityError(
      "key-problem",
      "The Identity Toolkit API is switched off for this Google Cloud project. Enable it (Google Cloud → APIs & Services), or switch on Authentication in Firebase.",
    );
  }
  return new IdentityError("failed", `${status} ${message || "no message"}`.trim());
}

async function call(url: string, init: RequestInit): Promise<unknown> {
  if (!isAuthConfigured()) {
    throw new IdentityError(
      "not-configured",
      "NEXT_PUBLIC_FIREBASE_API_KEY is empty. Add it to .env.local, then stop and restart npm run dev.",
    );
  }
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": init.body instanceof URLSearchParams ? "application/x-www-form-urlencoded" : "application/json",
        // A key limited to certain websites checks this; a server call has none of its own.
        Referer: `${siteConfig.url.replace(/\/$/, "")}/`,
        ...(init.headers as Record<string, string> | undefined),
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[auth] Could not reach Firebase:", error);
    throw new IdentityError("failed", "Could not reach Firebase.");
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const problem = interpretError(res.status, body);
    if (problem.kind === "failed" || problem.kind === "key-problem" || problem.kind === "sign-in-disabled") {
      console.error(`[auth] Firebase refused the request (${res.status}):`, problem.detail || JSON.stringify(body)?.slice(0, 300));
    }
    throw problem;
  }
  return body;
}

type SignInReply = { idToken: string; refreshToken: string; expiresIn: string; localId: string; email: string };

const toTokens = (reply: SignInReply): Tokens => ({
  idToken: reply.idToken,
  refreshToken: reply.refreshToken,
  expiresIn: Number(reply.expiresIn) || 3600,
  uid: reply.localId,
  email: reply.email,
});

const withKey = (path: string) => `${IDENTITY}/${path}?key=${encodeURIComponent(firebaseApiKey())}`;

export async function signUp(email: string, password: string): Promise<Tokens> {
  const reply = await call(withKey("accounts:signUp"), {
    method: "POST",
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return toTokens(reply as SignInReply);
}

export async function signIn(email: string, password: string): Promise<Tokens> {
  const reply = await call(withKey("accounts:signInWithPassword"), {
    method: "POST",
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return toTokens(reply as SignInReply);
}

/** Firebase emails the person a reset link. Resolves quietly for unknown addresses. */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await call(withKey("accounts:sendOobCode"), {
      method: "POST",
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
    });
  } catch (error) {
    // Never reveal whether an address has an account.
    if (error instanceof IdentityError && (error.kind === "invalid-credentials" || error.kind === "token-expired")) return;
    throw error;
  }
}

/** Swaps a refresh token for a fresh id token. */
export async function refreshTokens(refreshToken: string): Promise<Tokens> {
  const reply = (await call(`${SECURETOKEN}?key=${encodeURIComponent(firebaseApiKey())}`, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  })) as { id_token: string; refresh_token: string; expires_in: string; user_id: string };
  return {
    idToken: reply.id_token,
    refreshToken: reply.refresh_token,
    expiresIn: Number(reply.expires_in) || 3600,
    uid: reply.user_id,
    email: "",
  };
}

/** Deletes the login behind this id token (it must be freshly issued). */
export async function deleteLogin(idToken: string): Promise<void> {
  await call(withKey("accounts:delete"), { method: "POST", body: JSON.stringify({ idToken }) });
}
