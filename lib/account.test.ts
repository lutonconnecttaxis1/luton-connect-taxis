import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasSignedInFlag, validateLogin, validateProfile, validateRegister, validateResetEmail } from "./account";

const good = { name: "  Sam   Taylor ", email: " SAM@Example.com ", phone: "07700 900123", password: "correct horse", termsAccepted: true };

describe("validateRegister", () => {
  it("cleans the details and keeps the password exactly as typed", () => {
    const r = validateRegister({ ...good, password: "  spaced pass  " });
    assert.ok(r.ok);
    assert.equal(r.data.name, "Sam Taylor");
    assert.equal(r.data.email, "sam@example.com");
    assert.equal(r.data.password, "  spaced pass  ");
  });

  it("makes the phone optional but checks it when given", () => {
    assert.ok(validateRegister({ ...good, phone: "" }).ok);
    const r = validateRegister({ ...good, phone: "abc" });
    assert.ok(!r.ok);
    assert.ok(r.errors.phone);
  });

  it("reports every problem at once", () => {
    const r = validateRegister({});
    assert.ok(!r.ok);
    assert.deepEqual(Object.keys(r.errors).sort(), ["email", "name", "password", "terms"]);
  });

  it("enforces password length and the terms tick-box", () => {
    const short = validateRegister({ ...good, password: "short" });
    assert.ok(!short.ok && short.errors.password?.includes("8"));
    const long = validateRegister({ ...good, password: "x".repeat(129) });
    assert.ok(!long.ok && long.errors.password);
    const terms = validateRegister({ ...good, termsAccepted: "yes" });
    assert.ok(!terms.ok && terms.errors.terms);
  });

  it("is safe with junk input", () => {
    assert.ok(!validateRegister(null).ok);
    assert.ok(!validateRegister("hello").ok);
    assert.ok(!validateRegister({ name: 5, email: [], password: {} }).ok);
  });
});

describe("validateLogin / reset / profile", () => {
  it("login needs a valid email and a password", () => {
    assert.ok(validateLogin({ email: "a@b.co", password: "x" }).ok);
    const r = validateLogin({ email: "nope", password: "" });
    assert.ok(!r.ok && r.errors.email && r.errors.password);
  });

  it("reset needs just an email", () => {
    const ok = validateResetEmail({ email: " A@B.co " });
    assert.ok(ok.ok && ok.data.email === "a@b.co");
    assert.ok(!validateResetEmail({ email: "" }).ok);
  });

  it("profile needs a name; phone optional", () => {
    assert.ok(validateProfile({ name: "Sam", phone: "" }).ok);
    assert.ok(!validateProfile({ name: "", phone: "" }).ok);
    assert.ok(!validateProfile({ name: "Sam", phone: "12" }).ok);
  });
});

describe("signed-in flag", () => {
  it("is read from a cookie string", () => {
    assert.equal(hasSignedInFlag("a=1; lct_in=1; b=2"), true);
    assert.equal(hasSignedInFlag("lct_in=0"), false);
    assert.equal(hasSignedInFlag(""), false);
    assert.equal(hasSignedInFlag("xlct_in=1"), false);
  });
});
