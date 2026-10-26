/**
 * The tiny text format used in blog articles (content/blog.ts):
 *   [label](href)  → a link          **words** → bold
 * Pure and dependency-free so it can be unit tested.
 */
export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; text: string; href: string };

const PATTERN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(source: string): InlineToken[] {
  const out: InlineToken[] = [];
  let last = 0;
  for (const m of source.matchAll(PATTERN)) {
    if (m.index > last) out.push({ kind: "text", text: source.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: "bold", text: m[1] });
    else out.push({ kind: "link", text: m[2], href: m[3] });
    last = m.index + m[0].length;
  }
  if (last < source.length) out.push({ kind: "text", text: source.slice(last) });
  return out;
}

export type LinkKind = "internal" | "external" | "contact";

/** internal = a page on this site, external = another website, contact = tel: / mailto: */
export function linkKind(href: string): LinkKind {
  if (href.startsWith("/") && !href.startsWith("//")) return "internal";
  if (/^(tel|mailto):/.test(href)) return "contact";
  return "external";
}
