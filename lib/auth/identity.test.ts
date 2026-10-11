import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { deleteLogin, IdentityError, interpretError, refreshTokens, sendPasswordReset, signIn, signUp } from "./identity";

const realFetch = globalThis.fetch;
type Call = { url: string; init: RequestInit & { headers: Record<string, string> } };
let calls: Call[] = [];
let reply: { status: number; body: unknown } = { status: 200, body: {} };

beforeEach(() => {
  calls = [];
  reply = { status: 200, body: {} };
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "KEY123";
  globalThis.fetch = (async (url: string, init: Call["init"]) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const fail = (message: string, extra: Record<string, unknown> = {}) => ({ status: 400, body: { error: { code: 400, message, ...extra } } });

describe("interpretError", () => {
  const kind = (message: string, extra?: Record<string, unknown>) => interpretError(400, { error: { message, ...extra } }).kind;

  it("maps Firebase codes to our kinds", () => {
    assert.equal(kind("EMAIL_EXISTS"), "email-exists");
    assert.equal(kind("INVALID_LOGIN_CREDENTIALS"), "invalid-credentials");
    assert.equal(kind("INVALID_PASSWORD"), "invalid-credentials");
    assert.equal(kind("EMAIL_NOT_FOUND"), "invalid-credentials");
    assert.equal(kind("WEAK_PASSWORD : Password should be at least 6 characters"), "weak-password");
    assert.equal(kind("PASSWORD_DOES_NOT_MEET_REQUIREMENTS : Missing password requirements: [Password must contain a number]"), "weak-password");
    assert.equal(kind("TOO_MANY_ATTEMPTS_TRY_LATER"), "too-many-attempts");
    assert.equal(kind("USER_DISABLED"), "user-disabled");
    assert.equal(kind("TOKEN_EXPIRED"), "token-expired");
    assert.equal(kind("OPERATION_NOT_ALLOWED"), "sign-in-disabled");
  });

  it("explains key and service problems in plain English", () => {
    const referrer = interpretError(403, { error: { message: "Requests from referer <empty> are blocked.", details: [{ reason: "API_KEY_HTTP_REFERRER_BLOCKED" }] } });
    assert.equal(referrer.kind, "key-problem");
    assert.match(referrer.detail, /allowed websites/);
    assert.match(interpretError(400, { error: { message: "API key not valid. Please pass a valid API key." } }).detail, /NEXT_PUBLIC_FIREBASE_API_KEY/);
    assert.match(interpretError(403, { error: { message: "Identity Toolkit API has not been used in project 1 before or it is disabled." } }).detail, /Identity Toolkit/);
    assert.equal(interpretError(500, null).kind, "failed");
  });
});

describe("calls", () => {
  it("signs up with the key in the URL and a referer header", async () => {
    reply = { status: 200, body: { idToken: "ID", refreshToken: "RT", expiresIn: "3600", localId: "u1", email: "a@b.co" } };
    const tokens = await signUp("a@b.co", "secret123");
    assert.deepEqual(tokens, { idToken: "ID", refreshToken: "RT", expiresIn: 3600, uid: "u1", email: "a@b.co" });
    assert.match(calls[0].url, /accounts:signUp\?key=KEY123$/);
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { email: "a@b.co", password: "secret123", returnSecureToken: true });
    assert.match(calls[0].init.headers.Referer, /^https?:\/\/.+\/$/);
  });

  it("signs in and surfaces wrong-password as invalid-credentials", async () => {
    reply = fail("INVALID_LOGIN_CREDENTIALS");
    await assert.rejects(signIn("a@b.co", "x"), (e: unknown) => e instanceof IdentityError && e.kind === "invalid-credentials");
  });

  it("refreshes with a form post", async () => {
    reply = { status: 200, body: { id_token: "ID2", refresh_token: "RT2", expires_in: "3600", user_id: "u1" } };
    const tokens = await refreshTokens("RT");
    assert.equal(tokens.idToken, "ID2");
    assert.equal(tokens.uid, "u1");
    assert.match(calls[0].url, /securetoken\.googleapis\.com\/v1\/token\?key=KEY123$/);
    assert.equal(calls[0].init.headers["Content-Type"], "application/x-www-form-urlencoded");
    assert.equal((calls[0].init.body as URLSearchParams).get("grant_type"), "refresh_token");
  });

  it("password reset never reveals whether the address exists", async () => {
    reply = fail("EMAIL_NOT_FOUND");
    await sendPasswordReset("nobody@b.co");
    reply = { status: 200, body: { email: "a@b.co" } };
    await sendPasswordReset("a@b.co");
    assert.equal(JSON.parse(String(calls[1].init.body)).requestType, "PASSWORD_RESET");
  });

  it("password reset still reports a switched-off sign-in method", async () => {
    reply = fail("OPERATION_NOT_ALLOWED");
    await assert.rejects(sendPasswordReset("a@b.co"), (e: unknown) => e instanceof IdentityError && e.kind === "sign-in-disabled");
  });

  it("deletes a login with its id token", async () => {
    await deleteLogin("ID");
    assert.match(calls[0].url, /accounts:delete/);
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { idToken: "ID" });
  });

  it("says so when the key is missing, without calling Google", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "";
    await assert.rejects(signIn("a@b.co", "x"), (e: unknown) => e instanceof IdentityError && e.kind === "not-configured");
    assert.equal(calls.length, 0);
  });

  it("treats a network failure as a plain failure", async () => {
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    await assert.rejects(signIn("a@b.co", "x"), (e: unknown) => e instanceof IdentityError && e.kind === "failed");
  });
});
