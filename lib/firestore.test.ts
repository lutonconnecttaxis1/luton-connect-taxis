import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  clearTokenCache,
  createDocument,
  FirestoreError,
  readCredentials,
  signServiceAccountJwt,
  toFirestoreFields,
  toFirestoreValue,
  updateDocument,
} from "./firestore";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const realFetch = globalThis.fetch;
type Call = { url: string; init: RequestInit & { headers: Record<string, string> } };
let calls: Call[] = [];
let firestoreStatus = 200;

beforeEach(() => {
  clearTokenCache();
  calls = [];
  firestoreStatus = 200;
  process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-project";
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "svc@demo-project.iam.gserviceaccount.com";
  // how a .env file stores it: one line, literal \n, wrapped in quotes
  process.env.FIREBASE_ADMIN_PRIVATE_KEY = `"${privateKey.replace(/\n/g, "\\n")}"`;
  globalThis.fetch = (async (url: string, init: Call["init"]) => {
    calls.push({ url, init });
    if (url === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "tok-123", expires_in: 3600 }), { status: 200 });
    }
    return new Response("{}", { status: firestoreStatus });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("credentials", () => {
  it("reads the key the way .env files store it", () => {
    const creds = readCredentials();
    assert.ok(creds);
    assert.ok(creds.privateKey.startsWith("-----BEGIN PRIVATE KEY-----\n"));
    assert.equal(creds.projectId, "demo-project");
  });

  it("is not configured when anything is missing or the key is garbage", () => {
    delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    assert.equal(readCredentials(), null);
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "svc@x";
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = "not a key";
    assert.equal(readCredentials(), null);
  });
});

describe("service-account JWT", () => {
  it("is a valid RS256 token with the claims Google expects", () => {
    const creds = readCredentials()!;
    const jwt = signServiceAccountJwt(creds, 1_800_000_000);
    const [h, c, s] = jwt.split(".");
    assert.deepEqual(JSON.parse(Buffer.from(h, "base64url").toString()), { alg: "RS256", typ: "JWT" });
    const claims = JSON.parse(Buffer.from(c, "base64url").toString());
    assert.equal(claims.iss, "svc@demo-project.iam.gserviceaccount.com");
    assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
    assert.equal(claims.scope, "https://www.googleapis.com/auth/datastore");
    assert.equal(claims.exp - claims.iat, 3600);
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${h}.${c}`);
    assert.equal(verifier.verify(publicKey, Buffer.from(s, "base64url")), true);
  });
});

describe("value encoding", () => {
  it("converts JS values to Firestore's typed format", () => {
    assert.deepEqual(toFirestoreValue("hi"), { stringValue: "hi" });
    assert.deepEqual(toFirestoreValue(7), { integerValue: "7" });
    assert.deepEqual(toFirestoreValue(7.5), { doubleValue: 7.5 });
    assert.deepEqual(toFirestoreValue(true), { booleanValue: true });
    assert.deepEqual(toFirestoreValue(null), { nullValue: null });
    assert.deepEqual(toFirestoreValue(new Date("2026-10-05T09:00:00Z")), { timestampValue: "2026-10-05T09:00:00.000Z" });
    assert.deepEqual(toFirestoreValue([1, "a"]), {
      arrayValue: { values: [{ integerValue: "1" }, { stringValue: "a" }] },
    });
    assert.deepEqual(toFirestoreValue({ a: { b: 1 } }), {
      mapValue: { fields: { a: { mapValue: { fields: { b: { integerValue: "1" } } } } } },
    });
  });

  it("skips undefined fields", () => {
    assert.deepEqual(toFirestoreFields({ a: 1, b: undefined }), { a: { integerValue: "1" } });
  });
});

describe("createDocument / updateDocument", () => {
  it("gets a token once, then creates the document with the chosen id", async () => {
    await createDocument("bookings", "LCT-ABC234", { reference: "LCT-ABC234", total: 54.8 });
    await createDocument("bookings", "LCT-XYZ789", { reference: "LCT-XYZ789" });
    assert.equal(calls.filter((c) => c.url.includes("oauth2")).length, 1, "token is cached");
    const create = calls.find((c) => c.url.includes("firestore.googleapis.com"))!;
    assert.equal(
      create.url,
      "https://firestore.googleapis.com/v1/projects/demo-project/databases/(default)/documents/bookings?documentId=LCT-ABC234",
    );
    assert.equal(create.init.headers.Authorization, "Bearer tok-123");
    assert.deepEqual(JSON.parse(create.init.body as string), {
      fields: { reference: { stringValue: "LCT-ABC234" }, total: { doubleValue: 54.8 } },
    });
  });

  it("reports an id clash as 'exists' and other failures as 'failed'", async () => {
    firestoreStatus = 409;
    await assert.rejects(
      () => createDocument("bookings", "LCT-ABC234", {}),
      (e: unknown) => e instanceof FirestoreError && e.kind === "exists",
    );
    firestoreStatus = 403;
    await assert.rejects(
      () => createDocument("bookings", "LCT-ABC234", {}),
      (e: unknown) => e instanceof FirestoreError && e.kind === "failed",
    );
  });

  it("refuses to run without credentials", async () => {
    delete process.env.FIREBASE_ADMIN_PROJECT_ID;
    await assert.rejects(
      () => createDocument("bookings", "x", {}),
      (e: unknown) => e instanceof FirestoreError && e.kind === "not-configured",
    );
  });

  it("updates only the named fields", async () => {
    await updateDocument("bookings", "LCT-ABC234", { notifications: { business: "sent" } });
    const patch = calls.find((c) => c.init.method === "PATCH")!;
    assert.match(patch.url, /bookings\/LCT-ABC234\?updateMask\.fieldPaths=notifications$/);
  });
});
