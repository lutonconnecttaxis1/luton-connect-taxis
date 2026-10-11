import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { clearCertCache } from "./token";
import { ID_COOKIE, loginCookies, logoutCookies, readCookie, readSession, REFRESH_COOKIE } from "./session";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

function token(expOffset = 3000, sub = "uid1") {
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: "RS256", kid: "k1" });
  const payload = b64({ aud: "demo", iss: "https://securetoken.google.com/demo", sub, iat: now - 10, exp: now + expOffset, email: "a@b.co" });
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${signer.sign(privateKey).toString("base64url")}`;
}

const realFetch = globalThis.fetch;
let refreshReply: { status: number; body: unknown } = { status: 200, body: {} };
let refreshCalls = 0;

beforeEach(() => {
  clearCertCache();
  refreshCalls = 0;
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "KEY";
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo";
  globalThis.fetch = (async (url: string) => {
    if (String(url).includes("x509")) return new Response(JSON.stringify({ k1: publicKey }), { status: 200, headers: { "cache-control": "max-age=3600" } });
    refreshCalls++;
    return new Response(JSON.stringify(refreshReply.body), { status: refreshReply.status });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const req = (cookie?: string, url = "http://localhost:3000/api/account/me", headers: Record<string, string> = {}) =>
  new Request(url, { headers: { ...(cookie ? { cookie } : {}), ...headers } });

describe("cookies", () => {
  it("reads a named cookie from the header", () => {
    assert.equal(readCookie("a=1; lct_id=abc.def; b=2", "lct_id"), "abc.def");
    assert.equal(readCookie("a=1", "lct_id"), "");
    assert.equal(readCookie(null, "lct_id"), "");
    assert.equal(readCookie("xlct_id=1", "lct_id"), "");
  });

  it("login cookies are HttpOnly except the readable flag, and Secure only over https", () => {
    const tokens = { idToken: "I", refreshToken: "R", expiresIn: 3600 };
    const http = loginCookies(req(), tokens);
    assert.equal(http.length, 3);
    assert.ok(http[0].startsWith("lct_id=I;") && http[0].includes("HttpOnly") && !http[0].includes("Secure"));
    assert.ok(http[1].startsWith("lct_rt=R;") && http[1].includes("HttpOnly") && http[1].includes("Max-Age=2592000"));
    assert.ok(http[2].startsWith("lct_in=1;") && !http[2].includes("HttpOnly"));
    assert.ok(http.every((c) => c.includes("SameSite=Lax") && c.includes("Path=/")));
    const https = loginCookies(req(undefined, "https://example.com/x"), tokens);
    assert.ok(https.every((c) => c.includes("Secure")));
    const proxied = loginCookies(req(undefined, "http://internal/x", { "x-forwarded-proto": "https" }), tokens);
    assert.ok(proxied.every((c) => c.includes("Secure")));
  });

  it("logout cookies expire all three", () => {
    const out = logoutCookies(req());
    assert.equal(out.length, 3);
    assert.ok(out.every((c) => c.includes("Max-Age=0")));
  });
});

describe("readSession", () => {
  it("is a guest with no cookies", async () => {
    const s = await readSession(req());
    assert.deepEqual(s, { user: null, cookies: [] });
  });

  it("accepts a valid id token without calling Firebase", async () => {
    const s = await readSession(req(`${ID_COOKIE}=${token()}`));
    assert.equal(s.user?.uid, "uid1");
    assert.deepEqual(s.cookies, []);
    assert.equal(refreshCalls, 0);
  });

  it("swaps the refresh token for new cookies when the id token has expired", async () => {
    refreshReply = { status: 200, body: { id_token: token(3000, "uid1"), refresh_token: "RT2", expires_in: "3600", user_id: "uid1" } };
    const s = await readSession(req(`${ID_COOKIE}=${token(-100)}; ${REFRESH_COOKIE}=RT1`));
    assert.equal(s.user?.uid, "uid1");
    assert.equal(refreshCalls, 1);
    assert.ok(s.cookies.some((c) => c.startsWith("lct_rt=RT2;")));
  });

  it("works from the refresh token alone (id cookie already gone)", async () => {
    refreshReply = { status: 200, body: { id_token: token(), refresh_token: "RT2", expires_in: "3600", user_id: "uid1" } };
    const s = await readSession(req(`${REFRESH_COOKIE}=RT1`));
    assert.equal(s.user?.uid, "uid1");
  });

  it("signs out (clears cookies) when Firebase says the refresh token is dead", async () => {
    refreshReply = { status: 400, body: { error: { message: "TOKEN_EXPIRED" } } };
    const s = await readSession(req(`${REFRESH_COOKIE}=RT1`));
    assert.equal(s.user, null);
    assert.ok(s.cookies.every((c) => c.includes("Max-Age=0")));
  });

  it("does NOT sign anyone out because of a temporary Firebase problem", async () => {
    refreshReply = { status: 500, body: {} };
    const s = await readSession(req(`${REFRESH_COOKIE}=RT1`));
    assert.equal(s.user, null);
    assert.deepEqual(s.cookies, []);
  });

  it("rejects a forged id token and clears it", async () => {
    const good = token();
    const at = good.length - 10; // inside the signature (the very last character only holds padding bits)
    const forged = `${good.slice(0, at)}${good[at] === "A" ? "B" : "A"}${good.slice(at + 1)}`;
    const s = await readSession(req(`${ID_COOKIE}=${forged}`));
    assert.equal(s.user, null);
    assert.ok(s.cookies.length > 0);
  });
});
