import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { posts, readingMinutes, wordCount, type Block } from "../content/blog";
import { services } from "../components/home/service-data";
import { linkKind, parseInline } from "./blog-inline";
import { blogTranslations, localizePost } from "./blog-i18n";

const texts = (blocks: readonly Block[]) => blocks.flatMap((b) => (typeof b.x === "string" ? [b.x] : b.x));
const linksOf = (source: string) => parseInline(source).filter((t) => t.kind === "link");
const allLinks = (post: (typeof posts)[number]) =>
  texts(post.blocks).flatMap((x) => linksOf(x).map((t) => (t.kind === "link" ? t : { href: "", text: "" })));

const knownPaths = new Set([
  "/fleet",
  "/contact",
  "/blog",
  "/terms",
  "/privacy",
  "/cookies",
  "/#quote",
  ...services.map((s) => `/services/${s.slug}`),
  ...posts.map((p) => `/blog/${p.slug}`),
]);

describe("parseInline", () => {
  it("splits text, bold and links", () => {
    assert.deepEqual(parseInline("a **b** [c](/d) e"), [
      { kind: "text", text: "a " },
      { kind: "bold", text: "b" },
      { kind: "text", text: " " },
      { kind: "link", text: "c", href: "/d" },
      { kind: "text", text: " e" },
    ]);
  });
  it("leaves plain text alone", () => {
    assert.deepEqual(parseInline("no markup, 5 > 3"), [{ kind: "text", text: "no markup, 5 > 3" }]);
  });
  it("tells internal, contact and external links apart", () => {
    assert.equal(linkKind("/fleet"), "internal");
    assert.equal(linkKind("/#quote"), "internal");
    assert.equal(linkKind("tel:+441582353158"), "contact");
    assert.equal(linkKind("mailto:a@b.co"), "contact");
    assert.equal(linkKind("https://example.com"), "external");
    assert.equal(linkKind("//evil.example"), "external");
  });
});

describe("blog articles", () => {
  it("have unique, tidy addresses", () => {
    const slugs = posts.map((p) => p.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("have a title, a description of a sensible length and valid dates", () => {
    for (const p of posts) {
      assert.ok(p.title.length >= 20 && p.title.length <= 90, `${p.slug}: title length ${p.title.length}`);
      assert.ok(p.description.length >= 110 && p.description.length <= 165, `${p.slug}: description length ${p.description.length}`);
      assert.ok(p.excerpt.length > 30, `${p.slug}: excerpt too short`);
      assert.match(p.published, /^\d{4}-\d{2}-\d{2}$/);
      if (p.updated) assert.ok(p.updated >= p.published);
    }
  });

  it("are long enough to be useful", () => {
    for (const p of posts) {
      assert.ok(wordCount(p) >= 650, `${p.slug}: only ${wordCount(p)} words`);
      assert.ok(readingMinutes(p) >= 3);
    }
  });

  it("only link to pages that exist", () => {
    for (const p of posts) {
      for (const link of allLinks(p)) {
        const kind = linkKind(link.href);
        if (kind === "internal") assert.ok(knownPaths.has(link.href), `${p.slug}: unknown internal link ${link.href}`);
        if (kind === "external") assert.match(link.href, /^https:\/\//, `${p.slug}: ${link.href} is not https`);
      }
    }
  });

  it("link to a service page and the booking form, and to other articles", () => {
    for (const p of posts) {
      const hrefs = allLinks(p).map((l) => l.href);
      assert.ok(hrefs.some((h) => h.startsWith("/services/")), `${p.slug}: no service link`);
      assert.ok(hrefs.includes("/#quote"), `${p.slug}: no booking-form link`);
      assert.ok(hrefs.includes("tel:+441582353158"), `${p.slug}: no phone link`);
    }
  });

  it("have related articles that exist and are not themselves", () => {
    for (const p of posts) {
      assert.ok(p.related.length >= 2, `${p.slug}: needs related articles`);
      for (const slug of p.related) {
        assert.ok(posts.some((o) => o.slug === slug), `${p.slug}: related ${slug} does not exist`);
        assert.notEqual(slug, p.slug);
      }
    }
  });

  it("have no empty headings, lists or paragraphs", () => {
    for (const p of posts) {
      for (const b of p.blocks) {
        const items = typeof b.x === "string" ? [b.x] : b.x;
        assert.ok(items.length > 0 && items.every((i) => i.trim().length > 0), `${p.slug}: empty ${b.t}`);
      }
    }
  });

  it("do not mention another company or promise things the site does not", () => {
    const banned = [/lutontaxis/i, /01582\s?73\s?55\s?55/, /735555/];
    for (const p of posts) {
      const text = [p.title, p.description, p.excerpt, ...texts(p.blocks)].join("\n");
      for (const re of banned) assert.doesNotMatch(text, re, `${p.slug}: ${re}`);
      // "fixed price" may only appear as "not a fixed price" / "not fixed prices".
      for (const m of text.matchAll(/fixed (price|fare|rate)s?/gi)) {
        const before = text.slice(Math.max(0, m.index - 12), m.index).toLowerCase();
        assert.match(before, /not (a )?$/, `${p.slug}: "${m[0]}" promised without "not"`);
      }
    }
  });

  it("have one first heading level only (the page title is the h1)", () => {
    for (const p of posts) assert.ok(p.blocks.every((b) => (b.t as string) !== "h1"));
  });
});

const hrefsOf = (source: string) => linksOf(source).map((l) => (l.kind === "link" ? l.href : ""));

describe("translated blog articles", () => {
  for (const [locale, translated] of Object.entries(blogTranslations)) {
    describe(locale, () => {
      it("cover every article, and nothing else", () => {
        assert.deepEqual(Object.keys(translated).sort(), posts.map((p) => p.slug).sort());
      });

      it("keep the structure of the English original", () => {
        for (const original of posts) {
          const tr = translated[original.slug];
          assert.equal(tr.blocks.length, original.blocks.length, `${original.slug}: block count`);
          original.blocks.forEach((block, i) => {
            const other = tr.blocks[i];
            assert.equal(other.t, block.t, `${original.slug}[${i}]: block type`);
            const a = typeof block.x === "string" ? [block.x] : block.x;
            const b = typeof other.x === "string" ? [other.x] : other.x;
            assert.equal(typeof other.x, typeof block.x, `${original.slug}[${i}]: text/list`);
            assert.equal(b.length, a.length, `${original.slug}[${i}]: item count`);
            a.forEach((text, j) => {
              assert.deepEqual(hrefsOf(b[j]), hrefsOf(text), `${original.slug}[${i}.${j}]: links must keep the same addresses`);
              assert.equal((b[j].match(/\*\*/g) ?? []).length, (text.match(/\*\*/g) ?? []).length, `${original.slug}[${i}.${j}]: bold markers`);
              assert.ok(b[j].trim().length > 0);
            });
          });
        }
      });

      it("are really translated and have good titles and descriptions", () => {
        for (const original of posts) {
          const tr = translated[original.slug];
          assert.notEqual(tr.title, original.title, `${original.slug}: title not translated`);
          assert.notEqual(tr.description, original.description);
          const length = tr.description.length;
          const [min, max] = locale === "zh" ? [45, 120] : [110, 170];
          assert.ok(length >= min && length <= max, `${original.slug}: description length ${length}`);
          const text = [tr.title, tr.description, tr.excerpt, ...texts(tr.blocks)].join("\n");
          assert.doesNotMatch(text, /lutontaxis/i);
          assert.ok(text.includes("01582 353158") || text.includes("+441582353158"), `${original.slug}: phone number missing`);
          // Prices and fees must survive translation untouched.
          for (const money of texts(original.blocks).join(" ").match(/£\d[\d,.]*/g) ?? []) {
            assert.ok(text.includes(money), `${original.slug}: ${money} missing`);
          }
        }
      });
    });
  }

  it("localizePost swaps the words but keeps the shared details", () => {
    const original = posts[0];
    const german = localizePost(original, "de");
    assert.notEqual(german.title, original.title);
    assert.equal(german.slug, original.slug);
    assert.equal(german.published, original.published);
    assert.deepEqual(german.related, original.related);
    assert.equal(localizePost(original, "en"), original);
  });
});
