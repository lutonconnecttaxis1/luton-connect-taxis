import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { verifyRecaptcha } from "./recaptcha";

const realFetch = globalThis.fetch;
const token = "t".repeat(40);
function mockGoogle(answer: unknown, ok = true) {
  globalThis.fetch = (async () => {
    if (!ok) throw new Error("offline");
    return new Response(JSON.stringify(answer), { status: 200 });
  }) as typeof fetch;
}

beforeEach(() => {
  process.env.RECAPTCHA_SECRET_KEY = "secret";
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.RECAPTCHA_SECRET_KEY;
});

describe("verifyRecaptcha", () => {
  it("is switched off without a secret key", async () => {
    delete process.env.RECAPTCHA_SECRET_KEY;
    assert.deepEqual(await verifyRecaptcha(undefined, "booking"), { ok: true, skipped: true });
  });

  it("passes a good score for the right action", async () => {
    mockGoogle({ success: true, score: 0.9, action: "booking" });
    assert.deepEqual(await verifyRecaptcha(token, "booking"), { ok: true, skipped: false });
  });

  it("blocks low scores, wrong actions, failures and missing tokens", async () => {
    mockGoogle({ success: true, score: 0.1, action: "booking" });
    assert.equal((await verifyRecaptcha(token, "booking")).ok, false);
    mockGoogle({ success: true, score: 0.9, action: "contact" });
    assert.equal((await verifyRecaptcha(token, "booking")).ok, false);
    mockGoogle({ success: false });
    assert.equal((await verifyRecaptcha(token, "booking")).ok, false);
    assert.equal((await verifyRecaptcha(undefined, "booking")).ok, false);
    assert.equal((await verifyRecaptcha("short", "booking")).ok, false);
  });

  it("lets people through if Google is unreachable", async () => {
    mockGoogle({}, false);
    assert.deepEqual(await verifyRecaptcha(token, "booking"), { ok: true, skipped: true });
  });
});
