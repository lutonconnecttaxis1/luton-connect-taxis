// Compares a translated JSON file with the English one.
// Usage: node scripts/check-translation.mjs <english.json> <translated.json>
// Checks: same keys, same {placeholders}, same list lengths, only safe tags, nothing empty.
import fs from "node:fs";

const [enFile, trFile] = process.argv.slice(2);
const en = JSON.parse(fs.readFileSync(enFile, "utf8"));
let tr;
try {
  tr = JSON.parse(fs.readFileSync(trFile, "utf8"));
} catch (e) {
  console.error(`INVALID JSON in ${trFile}: ${e.message}`);
  process.exit(1);
}
const problems = [];
const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const tags = (s) => [...s.matchAll(/<\/?([A-Za-z][\w-]*)>/g)].map((m) => m[0]).join("");

function compare(a, b, where) {
  if (typeof a === "string") {
    if (typeof b !== "string") return problems.push(`${where}: should be a string`);
    if (a.trim() && !b.trim()) problems.push(`${where}: empty`);
    if (holes(a) !== holes(b)) problems.push(`${where}: placeholders {${holes(b)}} should be {${holes(a)}}`);
    if (tags(a) !== tags(b)) problems.push(`${where}: tags ${tags(b) || "(none)"} should be ${tags(a) || "(none)"}`);
  } else if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return problems.push(`${where}: list should have ${a.length} items`);
    a.forEach((x, i) => compare(x, b[i], `${where}[${i}]`));
  } else if (a && typeof a === "object") {
    if (!b || typeof b !== "object" || Array.isArray(b)) return problems.push(`${where}: should be an object`);
    for (const k of Object.keys(a)) {
      if (!(k in b)) problems.push(`${where}.${k}: missing`);
      else compare(a[k], b[k], `${where}.${k}`);
    }
    for (const k of Object.keys(b)) if (!(k in a)) problems.push(`${where}.${k}: extra key`);
  }
}
compare(en, tr, "");
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`OK ${trFile}`);
