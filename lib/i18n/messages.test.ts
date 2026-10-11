import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { defaultLocale, locales } from "./config";
import { CLIENT_NAMESPACES } from "./messages";
import { flattenKeys, lookup, placeholdersOf, type Json, type Messages } from "./translate";

const root = process.cwd();
const readJson = (locale: string) =>
  JSON.parse(fs.readFileSync(path.join(root, "messages", `${locale}.json`), "utf8")) as Messages;
const english = readJson(defaultLocale);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".tmp-sync", "messages"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** t("a.b"), t.list("a.b"), t.raw<T>("a.b"), t(`a.${x}.b`) – returns the literal part. */
const CALL = /(?<![\w.])t(?:\.(?:raw|list|has))?(?:<[^()]*?>)?\(\s*([`"'])((?:(?!\1)[^\\])*)\1/g;

type Use = { file: string; key: string; dynamic: boolean };
function keyUses(): Use[] {
  const uses: Use[] = [];
  for (const file of [...sourceFiles(path.join(root, "app")), ...sourceFiles(path.join(root, "components")), ...sourceFiles(path.join(root, "lib"))]) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(CALL)) {
      const key = match[2];
      if (!/^[A-Za-z][\w-]*(\.[\w${}-]+)+$/.test(key)) continue; // not a message key (e.g. t("x") of another thing)
      uses.push({ file: path.relative(root, file), key, dynamic: key.includes("${") });
    }
  }
  return uses;
}

describe("messages: source ↔ en.json", () => {
  const uses = keyUses();

  it("finds the calls to check", () => {
    assert.ok(uses.length > 100, `only ${uses.length} key uses found`);
  });

  it("every static key used in code exists in English", () => {
    const missing = uses.filter((u) => !u.dynamic && lookup(english, u.key) === undefined);
    assert.deepEqual(missing.map((u) => `${u.file}: ${u.key}`), []);
  });

  it("the fixed part of every dynamic key exists in English", () => {
    const missing = uses
      .filter((u) => u.dynamic)
      .filter((u) => {
        const prefix = u.key.slice(0, u.key.indexOf("${")).replace(/\.$/, "");
        return prefix !== "" && lookup(english, prefix) === undefined;
      });
    assert.deepEqual(missing.map((u) => `${u.file}: ${u.key}`), []);
  });

  it("browser code only uses client namespaces", () => {
    const bad: string[] = [];
    for (const u of uses) {
      const text = fs.readFileSync(path.join(root, u.file), "utf8");
      if (!/^["']use client["']/.test(text.trimStart())) continue;
      const ns = u.key.split(".")[0];
      if (!(CLIENT_NAMESPACES as readonly string[]).includes(ns)) bad.push(`${u.file}: ${u.key}`);
    }
    assert.deepEqual(bad, []);
  });
});

describe("messages: every language matches English", () => {
  for (const locale of locales.filter((l) => l !== defaultLocale)) {
    describe(locale, () => {
      const messages = readJson(locale);

      it("has exactly the English keys", () => {
        const en = flattenKeys(english);
        const mine = flattenKeys(messages);
        assert.deepEqual(en.filter((k) => !mine.includes(k)), [], "missing keys");
        assert.deepEqual(mine.filter((k) => !en.includes(k)), [], "extra keys");
      });

      it("keeps the same {placeholders}, list lengths and object shapes", () => {
        const problems: string[] = [];
        const compare = (a: Json | undefined, b: Json | undefined, where: string) => {
          if (typeof a === "string") {
            if (typeof b !== "string") problems.push(`${where}: not a string`);
            else if (placeholdersOf(a).join() !== placeholdersOf(b).join()) {
              problems.push(`${where}: placeholders ${placeholdersOf(b)} ≠ ${placeholdersOf(a)}`);
            }
            if (typeof b === "string" && a.trim() !== "" && b.trim() === "") problems.push(`${where}: empty`);
          } else if (Array.isArray(a)) {
            if (!Array.isArray(b) || a.length !== b.length) problems.push(`${where}: list length`);
            else a.forEach((item, i) => compare(item, b[i], `${where}[${i}]`));
          } else if (a && typeof a === "object") {
            if (!b || typeof b !== "object" || Array.isArray(b)) problems.push(`${where}: not an object`);
            else for (const k of Object.keys(a)) compare(a[k], (b as Record<string, Json>)[k], `${where}.${k}`);
          }
        };
        compare(english, messages, locale);
        assert.deepEqual(problems, []);
      });

      it("allows only the safe rich-text tags", () => {
        const bad: string[] = [];
        const walk = (v: Json, where: string) => {
          if (typeof v === "string") {
            for (const m of v.matchAll(/<\/?([A-Za-z][\w-]*)/g)) {
              if (!["mark", "strong", "b", "em"].includes(m[1])) bad.push(`${where}: <${m[1]}>`);
            }
          } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
          else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
        };
        walk(messages, locale);
        assert.deepEqual(bad, []);
      });
    });
  }
});

describe("messages: English file", () => {
  it("allows only the safe rich-text tags", () => {
    const bad: string[] = [];
    const walk = (v: Json, where: string) => {
      if (typeof v === "string") {
        for (const m of v.matchAll(/<\/?([A-Za-z][\w-]*)/g)) if (!["mark", "strong", "b", "em"].includes(m[1])) bad.push(`${where}: <${m[1]}>`);
      } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
    };
    walk(english, "en");
    assert.deepEqual(bad, []);
  });
});
