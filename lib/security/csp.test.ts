import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCsp, cspHeaderName, cspMode, generateNonce } from "./csp";

const directive = (csp: string, name: string) =>
  csp.split("; ").find((d) => d === name || d.startsWith(`${name} `)) ?? "";

describe("buildCsp", () => {
  const csp = buildCsp({ nonce: "abc123" });

  it("allows scripts only from this site, the nonce and trusted children", () => {
    const script = directive(csp, "script-src");
    assert.match(script, /'self'/);
    assert.match(script, /'nonce-abc123'/);
    assert.match(script, /'strict-dynamic'/);
    assert.doesNotMatch(script, /unsafe-inline|unsafe-eval/);
  });

  it("never allows eval or inline scripts in production", () => {
    assert.doesNotMatch(csp, /unsafe-eval/);
    assert.doesNotMatch(directive(csp, "script-src"), /unsafe-inline/);
  });

  it("allows the Google services the site really uses", () => {
    assert.match(directive(csp, "connect-src"), /https:\/\/places\.googleapis\.com/);
    assert.match(directive(csp, "frame-src"), /https:\/\/www\.google\.com\/recaptcha\//);
  });

  it("blocks plugins, clickjacking and base-tag tricks", () => {
    assert.equal(directive(csp, "object-src"), "object-src 'none'");
    assert.equal(directive(csp, "frame-ancestors"), "frame-ancestors 'self'");
    assert.equal(directive(csp, "base-uri"), "base-uri 'self'");
    assert.equal(directive(csp, "form-action"), "form-action 'self'");
    assert.ok(csp.includes("upgrade-insecure-requests"));
  });

  it("only widens for development and previews when asked", () => {
    const dev = buildCsp({ nonce: "n", isDev: true });
    assert.match(directive(dev, "script-src"), /'unsafe-eval'/);
    assert.doesNotMatch(dev, /upgrade-insecure-requests/);
    assert.doesNotMatch(csp, /vercel\.live/);
    assert.match(buildCsp({ nonce: "n", isPreview: true }), /vercel\.live/);
  });

  it("leaves out directives that only work when enforcing while in test mode", () => {
    const test = buildCsp({ nonce: "n", reportOnly: true });
    assert.doesNotMatch(test, /frame-ancestors|upgrade-insecure-requests/);
  });

  it("adds the report address only when given", () => {
    assert.doesNotMatch(csp, /report-uri/);
    assert.match(buildCsp({ nonce: "n", reportUri: "/api/csp-report" }), /report-uri \/api\/csp-report$/);
  });
});

describe("cspMode / cspHeaderName / generateNonce", () => {
  it("defaults to report-only so a mistake cannot break the live site", () => {
    assert.equal(cspMode(undefined), "report-only");
    assert.equal(cspMode(""), "report-only");
    assert.equal(cspMode("nonsense"), "report-only");
    assert.equal(cspMode(" ENFORCE "), "enforce");
    assert.equal(cspMode("off"), "off");
  });
  it("uses the right header for each mode", () => {
    assert.equal(cspHeaderName("enforce"), "Content-Security-Policy");
    assert.equal(cspHeaderName("report-only"), "Content-Security-Policy-Report-Only");
  });
  it("makes a different nonce each time, safe to put in a header", () => {
    const a = generateNonce();
    assert.notEqual(a, generateNonce());
    assert.match(a, /^[A-Za-z0-9+/=]+$/);
  });
});
