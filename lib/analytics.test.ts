import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contactEventFor } from "./analytics";

describe("contactEventFor", () => {
  it("names the contact links worth counting", () => {
    assert.equal(contactEventFor("tel:+441582353158"), "phone_click");
    assert.equal(contactEventFor("mailto:admin@lutonconnecttaxis.com"), "email_click");
    assert.equal(contactEventFor("https://wa.me/441582353158"), "whatsapp_click");
    assert.equal(contactEventFor("/#quote"), "quote_click");
    assert.equal(contactEventFor("/fr/#quote"), "quote_click");
  });

  it("ignores every other link", () => {
    assert.equal(contactEventFor("/fleet"), "");
    assert.equal(contactEventFor("https://example.com/wa.me/"), "");
    assert.equal(contactEventFor("#main"), "");
  });
});
