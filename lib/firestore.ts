import { createSign } from "node:crypto";

/**
 * Minimal Firestore client for server code, using Google's REST API and a
 * service-account key from environment variables. No extra npm package.
 * SERVER ONLY – never import this from a component that runs in the browser.
 *
 * Browsers never write bookings (see firestore.rules): only this server code does.
 */

const SCOPE = "https://www.googleapis.com/auth/datastore";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type Credentials = { projectId: string; clientEmail: string; privateKey: string };

export class FirestoreError extends Error {
  constructor(
    public kind: "not-configured" | "exists" | "failed",
    message: string,
  ) {
    super(message);
  }
}

export function readCredentials(env: NodeJS.ProcessEnv = process.env): Credentials | null {
  const projectId = env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  let privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY?.trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  // .env files store the key on one line with literal \n, sometimes wrapped in quotes.
  privateKey = privateKey.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  if (!privateKey.includes("BEGIN PRIVATE KEY")) return null;
  return { projectId, clientEmail, privateKey };
}

export const isFirestoreConfigured = () => readCredentials() !== null;

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

/** Signs the short-lived JWT Google asks for in exchange for an access token. */
export function signServiceAccountJwt(creds: Credentials, nowSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${signer.sign(creds.privateKey).toString("base64url")}`;
}

let tokenCache: { token: string; expiresAt: number; email: string } | null = null;

async function accessToken(creds: Credentials): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.email === creds.clientEmail && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.token;
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signServiceAccountJwt(creds, Math.floor(now / 1000)),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[firestore] Could not get an access token (${res.status}): ${detail.slice(0, 300)}`);
    throw new FirestoreError("failed", "token request failed");
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
    email: creds.clientEmail,
  };
  return data.access_token;
}

/** Firestore's typed JSON format. */
export type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
  throw new FirestoreError("failed", `Unsupported value type: ${typeof value}`);
}

export function toFirestoreFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) fields[key] = toFirestoreValue(value);
  }
  return fields;
}

function documentsUrl(creds: Credentials) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(creds.projectId)}/databases/(default)/documents`;
}

/** Creates a document with a chosen id. Throws kind "exists" if the id is taken. */
export async function createDocument(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
  const creds = readCredentials();
  if (!creds) throw new FirestoreError("not-configured", "Firebase admin credentials are not set");
  const token = await accessToken(creds);
  const res = await fetch(`${documentsUrl(creds)}/${collection}?documentId=${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 409) throw new FirestoreError("exists", "document id already exists");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[firestore] Create failed (${res.status}): ${detail.slice(0, 400)}`);
    throw new FirestoreError("failed", `create failed (${res.status})`);
  }
}

/** Updates only the named top-level fields of an existing document. */
export async function updateDocument(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
  const creds = readCredentials();
  if (!creds) throw new FirestoreError("not-configured", "Firebase admin credentials are not set");
  const token = await accessToken(creds);
  const mask = Object.keys(data)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const res = await fetch(`${documentsUrl(creds)}/${collection}/${encodeURIComponent(id)}?${mask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[firestore] Update failed (${res.status}): ${detail.slice(0, 400)}`);
    throw new FirestoreError("failed", `update failed (${res.status})`);
  }
}

/** Reads Firestore's typed JSON back into plain values (timestamps become ISO strings). */
export function fromFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields ?? {});
  return null;
}

export function fromFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) data[key] = fromFirestoreValue(value);
  return data;
}

/** Reads one document, or null when it does not exist. */
export async function getDocument(collection: string, id: string): Promise<Record<string, unknown> | null> {
  const creds = readCredentials();
  if (!creds) throw new FirestoreError("not-configured", "Firebase admin credentials are not set");
  const token = await accessToken(creds);
  const res = await fetch(`${documentsUrl(creds)}/${collection}/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[firestore] Read failed (${res.status}): ${detail.slice(0, 400)}`);
    throw new FirestoreError("failed", `read failed (${res.status})`);
  }
  const doc = (await res.json()) as { fields?: Record<string, FirestoreValue> };
  return fromFirestoreFields(doc.fields ?? {});
}

/**
 * Documents whose top-level `field` equals a string. A single equality filter
 * needs no composite index, so sort the result in code.
 */
export async function queryByField(
  collection: string,
  field: string,
  value: string,
  limit = 200,
): Promise<Record<string, unknown>[]> {
  const creds = readCredentials();
  if (!creds) throw new FirestoreError("not-configured", "Firebase admin credentials are not set");
  const token = await accessToken(creds);
  const res = await fetch(`${documentsUrl(creds)}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } } },
        limit,
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[firestore] Query failed (${res.status}): ${detail.slice(0, 400)}`);
    throw new FirestoreError("failed", `query failed (${res.status})`);
  }
  const rows = (await res.json()) as { document?: { fields?: Record<string, FirestoreValue> } }[];
  return rows.filter((row) => row.document).map((row) => fromFirestoreFields(row.document?.fields ?? {}));
}

/** Deletes a document. Deleting one that does not exist is not an error. */
export async function deleteDocument(collection: string, id: string): Promise<void> {
  const creds = readCredentials();
  if (!creds) throw new FirestoreError("not-configured", "Firebase admin credentials are not set");
  const token = await accessToken(creds);
  const res = await fetch(`${documentsUrl(creds)}/${collection}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok && res.status !== 404) {
    const detail = await res.text().catch(() => "");
    console.error(`[firestore] Delete failed (${res.status}): ${detail.slice(0, 400)}`);
    throw new FirestoreError("failed", `delete failed (${res.status})`);
  }
}

/** For tests. */
export function clearTokenCache() {
  tokenCache = null;
}
