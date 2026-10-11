/**
 * The translate function. No React, so it is easy to unit test and works
 * in server components, client components and plain functions alike.
 *
 * Messages live in messages/<locale>.json. English is the source of truth:
 * a key missing from another language falls back to the English text, so a
 * half-finished translation never shows a blank or a raw key.
 */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type Messages = { [key: string]: Json };
export type Params = Record<string, string | number>;

export type TFunction = {
  /** Text for a key, with {name} placeholders filled from params. */
  (key: string, params?: Params): string;
  /** The raw value at a key (a list, or a list of objects). */
  raw<T = Json>(key: string): T;
  /** A list of strings. */
  list(key: string): string[];
  /** True when the key exists (in this language or in English). */
  has(key: string): boolean;
};

export function lookup(messages: Messages, key: string): Json | undefined {
  let node: Json | undefined = messages;
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = Array.isArray(node) ? node[Number(part)] : (node as { [k: string]: Json })[part];
    if (node === undefined) return undefined;
  }
  return node;
}

export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** Fills holes in `messages` with the English text. Arrays are taken whole from one language, never mixed. */
export function withFallback(messages: Messages, fallback: Messages): Messages {
  const out: Messages = {};
  for (const [key, base] of Object.entries(fallback)) {
    const mine = messages[key];
    if (mine === undefined) out[key] = base;
    else if (isPlainObject(base) && isPlainObject(mine)) out[key] = withFallback(mine, base);
    else if (Array.isArray(base) && Array.isArray(mine) && mine.length !== base.length) out[key] = base;
    else out[key] = mine;
  }
  return out;
}

const isPlainObject = (v: Json | undefined): v is Messages =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export function createT(messages: Messages, onMissing?: (key: string) => void): TFunction {
  const find = (key: string): Json | undefined => {
    const value = lookup(messages, key);
    if (value === undefined) onMissing?.(key);
    return value;
  };
  const t = ((key: string, params?: Params) => {
    const value = find(key);
    return typeof value === "string" ? interpolate(value, params) : key;
  }) as TFunction;
  t.raw = <T = Json>(key: string) => find(key) as T;
  t.list = (key: string) => {
    const value = find(key);
    return Array.isArray(value) ? value.map(String) : [];
  };
  t.has = (key: string) => lookup(messages, key) !== undefined;
  return t;
}

/** Every key path of a messages object, e.g. "home.hero.title". Arrays count as one key (their length is compared separately). */
export function flattenKeys(messages: Messages, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) keys.push(...flattenKeys(value, path));
    else keys.push(path);
  }
  return keys.sort();
}

/** Nested strings → flat "a.b.c": "text". Used for the validation table. */
export function flattenStrings(value: Json | undefined, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof value === "string") {
    out[prefix] = value;
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) Object.assign(out, flattenStrings(v, prefix ? `${prefix}.${k}` : k));
  }
  return out;
}

/** {placeholder} names used in a string (or in every string inside a value). */
export function placeholdersOf(value: Json | undefined): string[] {
  const found = new Set<string>();
  const walk = (v: Json | undefined) => {
    if (typeof v === "string") for (const m of v.matchAll(/\{(\w+)\}/g)) found.add(m[1]);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(value);
  return [...found].sort();
}

/**
 * Validation messages are produced in English by the shared validators (they run on the
 * server and in the browser). This turns one of them into the visitor's language by
 * finding it in en.json's "validation" table.
 *   English "Use at least 8 characters."  ← table entry "Use at least {min} characters."
 */
export function createMessageTranslator(
  english: Record<string, string>,
  translated: Record<string, string>,
): (text: string) => string {
  const exact = new Map<string, string>();
  const patterns: Array<{ re: RegExp; names: string[]; key: string }> = [];
  for (const [key, source] of Object.entries(english)) {
    if (!/\{\w+\}/.test(source)) {
      exact.set(source, key);
      continue;
    }
    const names: string[] = [];
    const escaped = source
      .split(/\{(\w+)\}/g)
      .map((part, i) => {
        if (i % 2 === 1) {
          names.push(part);
          return "(.+?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    patterns.push({ re: new RegExp(`^${escaped}$`), names, key });
  }
  return (text: string) => {
    const key = exact.get(text);
    if (key) return translated[key] ?? text;
    for (const { re, names, key: k } of patterns) {
      const match = re.exec(text);
      if (match) {
        const params: Params = {};
        names.forEach((name, i) => (params[name] = match[i + 1]));
        return interpolate(translated[k] ?? text, params);
      }
    }
    return text;
  };
}
