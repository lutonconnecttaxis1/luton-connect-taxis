import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import { verifyIdToken } from "./token";

const mk = () =>
  generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
const { privateKey, publicKey } = mk();
const other = mk();

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const NOW = 1_800_000_000_000;
const sec = NOW / 1000;

function token(claims: Record<string, unknown> = {}, opts: { key?: string; header?: Record<string, unknown> } = {}) {
  const header = b64({ alg: "RS256", kid: "k1", typ: "JWT", ...opts.header });
  const payload = b64({
    aud: "demo",
    iss: "https://securetoken.google.com/demo",
    sub: "uid123",
    iat: sec - 60,
    exp: sec + 3000,
    email: "a@b.co",
    email_verified: false,
    ...claims,
  });
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${signer.sign(opts.key ?? privateKey).toString("base64url")}`;
}

const options = { now: NOW, projectId: "demo", getCerts: async () => ({ k1: publicKey }) };

describe("verifyIdToken", () => {
  it("accepts a valid token", async () => {
    const user = await verifyIdToken(token(), options);
    assert.deepEqual(user, { uid: "uid123", email: "a@b.co", emailVerified: false });
  });

  it("rejects a token signed with another key", async () => {
    assert.equal(await verifyIdToken(token({}, { key: other.privateKey }), options), null);
  });

  it("rejects a tampered payload", async () => {
    const parts = token().split(".");
    parts[1] = b64({ aud: "demo", iss: "https://securetoken.google.com/demo", sub: "someone-else", iat: sec - 60, exp: sec + 3000 });
    assert.equal(await verifyIdToken(parts.join("."), options), null);
  });

  it("rejects wrong audience, issuer, expiry and future issue time", async () => {
    assert.equal(await verifyIdToken(token({ aud: "other" }), options), null);
    assert.equal(await verifyIdToken(token({ iss: "https://securetoken.google.com/other" }), options), null);
    assert.equal(await verifyIdToken(token({ exp: sec - 1 }), options), null);
    assert.equal(await verifyIdToken(token({ iat: sec + 3600 }), options), null);
    assert.equal(await verifyIdToken(token({ sub: "" }), options), null);
  });

  it("rejects an unknown key id and non-RS256 tokens", async () => {
    assert.equal(await verifyIdToken(token({}, { header: { kid: "nope" } }), options), null);
    assert.equal(await verifyIdToken(token({}, { header: { alg: "none" } }), options), null);
  });

  it("rejects garbage without throwing", async () => {
    assert.equal(await verifyIdToken("", options), null);
    assert.equal(await verifyIdToken("a.b", options), null);
    assert.equal(await verifyIdToken("a.b.c", options), null);
    assert.equal(await verifyIdToken(undefined as unknown as string, options), null);
  });

  it("rejects everything when no project is configured", async () => {
    assert.equal(await verifyIdToken(token(), { ...options, projectId: "" }), null);
  });
});
