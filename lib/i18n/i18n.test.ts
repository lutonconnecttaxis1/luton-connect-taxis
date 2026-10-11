import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alternateLanguages, absoluteUrl, isLocale, localeHref, resolveLocale, splitLocale } from "./config";
import { formatDateFor } from "./format";
import { createMessageTranslator, createT, flattenStrings, interpolate, withFallback } from "./translate";

describe("localeHref / splitLocale", () => {
  it("leaves English unprefixed", () => {
    assert.equal(localeHref("en", "/fleet"), "/fleet");
    assert.equal(localeHref("en", "/"), "/");
    assert.equal(localeHref("en", "/#quote"), "/#quote");
  });
  it("prefixes other languages", () => {
    assert.equal(localeHref("ro", "/fleet"), "/ro/fleet");
    assert.equal(localeHref("zh", "/"), "/zh");
    assert.equal(localeHref("de", "/#quote"), "/de#quote");
    assert.equal(localeHref("fr", "/services/airport-transfers?x=1#y"), "/fr/services/airport-transfers?x=1#y");
  });
  it("swaps an existing prefix instead of stacking two", () => {
    assert.equal(localeHref("es", "/ro/fleet"), "/es/fleet");
    assert.equal(localeHref("en", "/ro/fleet"), "/fleet");
    assert.equal(localeHref("en", "/ro"), "/");
  });
  it("does not touch outside links, hashes, APIs or files", () => {
    for (const href of ["https://x.com/a", "tel:+441582353158", "mailto:a@b.c", "#top", "//cdn.x/a", "/api/quote", "/brand/logo.png", "/sitemap.xml"]) {
      assert.equal(localeHref("ro", href), href);
    }
  });
  it("splits a path", () => {
    assert.deepEqual(splitLocale("/ro/fleet"), { locale: "ro", rest: "/fleet", prefixed: true });
    assert.deepEqual(splitLocale("/zh"), { locale: "zh", rest: "/", prefixed: true });
    assert.deepEqual(splitLocale("/fleet"), { locale: "en", rest: "/fleet", prefixed: false });
    assert.deepEqual(splitLocale("/"), { locale: "en", rest: "/", prefixed: false });
    assert.equal(splitLocale("/rom/x").prefixed, false);
  });
  it("validates locales", () => {
    assert.ok(isLocale("de"));
    assert.ok(!isLocale("xx"));
    assert.equal(resolveLocale("xx"), "en");
    assert.equal(resolveLocale("it"), "it");
  });
  it("builds canonical and hreflang URLs", () => {
    assert.equal(absoluteUrl("https://a.com", "en", ""), "https://a.com");
    assert.equal(absoluteUrl("https://a.com", "ro", ""), "https://a.com/ro");
    assert.equal(absoluteUrl("https://a.com", "ro", "/fleet"), "https://a.com/ro/fleet");
    const alt = alternateLanguages("https://a.com", "/fleet");
    assert.equal(alt["x-default"], "https://a.com/fleet");
    assert.equal(alt["zh-Hans"], "https://a.com/zh/fleet");
    assert.equal(alt["en-GB"], "https://a.com/fleet");
    assert.equal(Object.keys(alt).length, 8);
  });
});

describe("translate", () => {
  const en = { a: { b: "Hello {name}", list: ["x", "y"], faq: [{ q: "Q", a: "A" }] }, only: "english" };
  const ro = { a: { b: "Salut {name}", list: ["x2", "y2"] } };
  it("interpolates and falls back to English", () => {
    const merged = withFallback(ro as never, en as never);
    const t = createT(merged);
    assert.equal(t("a.b", { name: "Ana" }), "Salut Ana");
    assert.equal(t("only"), "english");
    assert.deepEqual(t.list("a.list"), ["x2", "y2"]);
    assert.deepEqual(t.raw("a.faq"), [{ q: "Q", a: "A" }]);
    assert.ok(t.has("a.b"));
    assert.ok(!t.has("nope"));
  });
  it("returns the key (and reports it) when missing", () => {
    const missing: string[] = [];
    const t = createT(en as never, (k) => missing.push(k));
    assert.equal(t("a.zzz"), "a.zzz");
    assert.deepEqual(missing, ["a.zzz"]);
  });
  it("leaves unknown placeholders alone", () => {
    assert.equal(interpolate("a {x} {y}", { x: 1 }), "a 1 {y}");
  });
  it("does not mix lists of different length", () => {
    const merged = withFallback({ l: ["only one"] } as never, { l: ["a", "b"] } as never) as { l: string[] };
    assert.deepEqual(merged.l, ["a", "b"]);
  });
});

describe("validation message translator", () => {
  const english = flattenStrings({ a: { one: "Please enter your email address.", min: "Use at least {min} characters.", both: "From {a} to {b}." } });
  const german = flattenStrings({ a: { one: "Bitte E-Mail eingeben.", min: "Mindestens {min} Zeichen.", both: "Von {a} bis {b}." } });
  const tm = createMessageTranslator(english, german);
  it("translates exact and parameterised messages", () => {
    assert.equal(tm("Please enter your email address."), "Bitte E-Mail eingeben.");
    assert.equal(tm("Use at least 8 characters."), "Mindestens 8 Zeichen.");
    assert.equal(tm("From X to Y."), "Von X bis Y.");
  });
  it("passes unknown messages through", () => {
    assert.equal(tm("Something else"), "Something else");
  });
});

describe("formatDateFor", () => {
  it("keeps the English format and localises the others", () => {
    assert.equal(formatDateFor("2026-10-12", "en"), "Mon 12 Oct 2026");
    assert.match(formatDateFor("2026-10-12", "de"), /12/);
    assert.match(formatDateFor("2026-10-12", "de"), /2026/);
    assert.match(formatDateFor("2026-10-12", "zh"), /2026/);
    assert.equal(formatDateFor("nonsense", "fr"), "nonsense");
  });
});

import { routeRequest } from "./routing";

describe("routeRequest (middleware rules)", () => {
  it("serves English addresses from /en internally", () => {
    assert.deepEqual(routeRequest("/", "GET", undefined), { action: "rewrite", pathname: "/en", locale: "en" });
    assert.deepEqual(routeRequest("/fleet", "GET", undefined), { action: "rewrite", pathname: "/en/fleet", locale: "en" });
  });
  it("serves prefixed languages as they are", () => {
    assert.deepEqual(routeRequest("/ro/fleet", "GET", undefined), { action: "next", locale: "ro" });
    assert.deepEqual(routeRequest("/zh", "GET", "de"), { action: "next", locale: "zh" });
  });
  it("redirects /en/... to the unprefixed English address", () => {
    assert.deepEqual(routeRequest("/en/fleet", "GET", undefined), { action: "redirect", pathname: "/fleet", status: 308 });
    assert.deepEqual(routeRequest("/en", "GET", undefined), { action: "redirect", pathname: "/", status: 308 });
  });
  it("first-time visitors always get English", () => {
    assert.equal(routeRequest("/", "GET", undefined).action, "rewrite");
    assert.equal(routeRequest("/", "GET", "garbage").action, "rewrite");
  });
  it("sends a visitor who chose a language to it, but only for page loads", () => {
    assert.deepEqual(routeRequest("/", "GET", "fr"), { action: "redirect", pathname: "/fr", status: 307 });
    assert.deepEqual(routeRequest("/fleet", "HEAD", "de"), { action: "redirect", pathname: "/de/fleet", status: 307 });
    assert.equal(routeRequest("/fleet", "POST", "de").action, "rewrite");
  });
  it("lets a visitor who chose English stay on English", () => {
    assert.equal(routeRequest("/fleet", "GET", "en").action, "rewrite");
  });
  it("treats unknown prefixes as English paths (they 404 in English)", () => {
    assert.deepEqual(routeRequest("/xx/fleet", "GET", undefined), { action: "rewrite", pathname: "/en/xx/fleet", locale: "en" });
  });
});
