// Merges fragment files (each { namespace: {...} }) into one messages file.
// Usage: node scripts/merge-messages.mjs <fragmentsDir> <out.json>
import fs from "node:fs";
import path from "node:path";

const [dir, out] = process.argv.slice(2);
const result = {};
const clashes = [];

function merge(target, source, trail) {
  for (const [key, value] of Object.entries(source)) {
    const here = [...trail, key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (target[key] === undefined) target[key] = {};
      if (typeof target[key] !== "object" || Array.isArray(target[key])) clashes.push(here.join("."));
      else merge(target[key], value, here);
    } else {
      if (target[key] !== undefined) clashes.push(here.join("."));
      target[key] = value;
    }
  }
}

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  merge(result, JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")), []);
}
if (clashes.length) {
  console.error("Duplicate keys:\n" + clashes.join("\n"));
  process.exit(1);
}
fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log("merged", fs.readdirSync(dir).filter((f) => f.endsWith(".json")).length, "fragments →", out);
