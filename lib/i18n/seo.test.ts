import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fitDescription } from "./seo";

describe("fitDescription", () => {
  it("leaves a description that already fits", () => {
    const text = "Taxis to and from Luton. Call us.";
    assert.equal(fitDescription(text), text);
  });

  it("cuts at the end of a sentence when there is one in range", () => {
    const first = "A".repeat(100) + ".";
    const out = fitDescription(`${first} ${"B".repeat(120)}`);
    assert.equal(out, first);
  });

  it("otherwise cuts at a word and adds an ellipsis, never exceeding the limit", () => {
    const text = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const out = fitDescription(text);
    assert.ok(out.length <= 158, `length ${out.length}`);
    assert.ok(out.endsWith("…"));
    assert.ok(!out.slice(0, -1).endsWith(" "));
  });

  it("handles text with no spaces (Chinese) without exceeding the limit", () => {
    const out = fitDescription("卢".repeat(300));
    assert.ok(out.length <= 158);
  });
});
