import { createVerify } from "node:crypto";

/**
 * Checks a Firebase id token on our own server (no network call per request):
 * signature against Google's published certificates, plus audience, issuer and
 * expiry. SERVER ONLY.
 */

const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

export type VerifiedUser = { uid: string; email: string; emailVerified: boolean };

export type CertMap = Record<string, string>;

let certCache: { certs: CertMap; expiresAt: number } | null = null;

export function clearCertCache() {
  certCache = null;
}

/** Google's signing certificates, cached for as long as Google says. */
export async function fetchCerts(now = Date.now()): Promise<CertMap> {
  if (certCache && certCache.expiresAt > now) return certCache.certs;
  const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`certificate request failed (${res.status})`);
  const certs = (await res.json()) as CertMap;
  const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1];
  certCache = { certs, expiresAt: now + Math.max(60, Number(maxAge ?? 3600)) * 1000 };
  return certs;
}

export const firebaseProjectId = () =>
  (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_ADMIN_PROJECT_ID ?? "").trim();

const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;

type Options = { now?: number; projectId?: string; getCerts?: () => Promise<CertMap> };

/** Returns the user, or null for anything that is not a valid, unexpired token for this project. */
export async function verifyIdToken(token: string, options: Options = {}): Promise<VerifiedUser | null> {
  const projectId = options.projectId ?? firebaseProjectId();
  if (!projectId || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const header = decode(parts[0]);
    const claims = decode(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;

    const seconds = Math.floor((options.now ?? Date.now()) / 1000);
    if (claims.aud !== projectId) return null;
    if (claims.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (typeof claims.sub !== "string" || claims.sub === "" || claims.sub.length > 128) return null;
    if (typeof claims.exp !== "number" || claims.exp <= seconds) return null;
    if (typeof claims.iat !== "number" || claims.iat > seconds + 300) return null;

    const certs = await (options.getCerts ?? fetchCerts)();
    const cert = certs[header.kid];
    if (!cert) return null;

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${parts[0]}.${parts[1]}`);
    if (!verifier.verify(cert, Buffer.from(parts[2], "base64url"))) return null;

    return {
      uid: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
      emailVerified: claims.email_verified === true,
    };
  } catch {
    return null;
  }
}
