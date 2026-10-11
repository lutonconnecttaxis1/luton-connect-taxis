import { SIGNED_IN_FLAG } from "@/lib/account";
import { refreshTokens, IdentityError, type Tokens } from "./identity";
import { verifyIdToken, type VerifiedUser } from "./token";

/**
 * The login lives in two HTTP-only cookies, so page scripts can never read it:
 *   lct_id  – Firebase id token, about 1 hour
 *   lct_rt  – refresh token, 30 days (swaps for a new id token)
 * plus lct_in=1 (readable) so the header can say "My account" without a request.
 * SERVER ONLY.
 */

export const ID_COOKIE = "lct_id";
export const REFRESH_COOKIE = "lct_rt";
const REFRESH_DAYS = 30;

export type Session = {
  user: VerifiedUser | null;
  /** Set-Cookie lines to add to the response (new tokens after a refresh, or clearing a dead login). */
  cookies: string[];
};

export function readCookie(header: string | null, name: string): string {
  if (!header) return "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}

function isHttps(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function cookie(name: string, value: string, maxAge: number, secure: boolean, httpOnly = true): string {
  return [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
    httpOnly ? "HttpOnly" : "",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

/** Set-Cookie lines that sign the browser in. */
export function loginCookies(request: Request, tokens: Pick<Tokens, "idToken" | "refreshToken" | "expiresIn">): string[] {
  const secure = isHttps(request);
  return [
    cookie(ID_COOKIE, tokens.idToken, Math.max(60, tokens.expiresIn - 60), secure),
    cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_DAYS * 86400, secure),
    cookie(SIGNED_IN_FLAG, "1", REFRESH_DAYS * 86400, secure, false),
  ];
}

/** Set-Cookie lines that sign the browser out. */
export function logoutCookies(request: Request): string[] {
  const secure = isHttps(request);
  return [
    cookie(ID_COOKIE, "", 0, secure),
    cookie(REFRESH_COOKIE, "", 0, secure),
    cookie(SIGNED_IN_FLAG, "", 0, secure, false),
  ];
}

/**
 * Who is making this request? Uses the id token; if that is missing or expired,
 * quietly swaps the refresh token for a new one. Never throws.
 */
export async function readSession(request: Request): Promise<Session> {
  const header = request.headers.get("cookie");
  const idToken = readCookie(header, ID_COOKIE);
  const refreshToken = readCookie(header, REFRESH_COOKIE);

  if (idToken) {
    const user = await verifyIdToken(idToken);
    if (user) return { user, cookies: [] };
  }
  if (!refreshToken) return { user: null, cookies: idToken ? logoutCookies(request) : [] };

  try {
    const tokens = await refreshTokens(refreshToken);
    const user = await verifyIdToken(tokens.idToken);
    if (user) return { user, cookies: loginCookies(request, tokens) };
    return { user: null, cookies: logoutCookies(request) };
  } catch (error) {
    // A dead refresh token means the login is over; a network problem should not sign anyone out.
    const dead = error instanceof IdentityError && (error.kind === "token-expired" || error.kind === "user-disabled");
    return { user: null, cookies: dead ? logoutCookies(request) : [] };
  }
}

/** Adds the session's cookie changes to a response. */
export function applyCookies<T extends Response>(response: T, cookies: string[]): T {
  for (const line of cookies) response.headers.append("Set-Cookie", line);
  return response;
}
