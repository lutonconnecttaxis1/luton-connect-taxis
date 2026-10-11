import { siteConfig } from "@/config/site";
import type { TFunction } from "@/lib/i18n/translate";

/**
 * Legal text. Terms & Privacy are the client's supplied wording (2 Oct 2026), kept as written.
 * The Cookies page is a first draft written to match what the site actually does.
 * None of this is legal advice – the client / a solicitor must approve it before launch.
 *
 * The wording lives in the messages under `legal.terms|privacy|cookies.*` (title, lead, notice,
 * blocks: [{ h, p?, ul?, after? }]). Only the contact lines (built from siteConfig) are made here.
 */
export type Block = {
  h: string;
  p?: string[];
  ul?: string[];
  after?: string[];
  lines?: string[];
};
export type LegalDoc = {
  slug: "terms" | "privacy" | "cookies";
  title: string;
  lead: string;
  /** Shown at the top of the page while the wording is unfinished. */
  notice?: string;
  blocks: Block[];
};

export const legalSlugs = ["terms", "privacy", "cookies"] as const;
export type LegalSlug = (typeof legalSlugs)[number];

type LineKind = "name" | "address" | "nameAddress" | "phone" | "email";

/** Which message blocks (by position) end with contact lines, and which lines. */
const lineBlocks: Record<LegalSlug, Record<number, LineKind[]>> = {
  terms: { 13: ["name", "address", "phone", "email"] },
  privacy: { 0: ["nameAddress", "phone", "email"], 8: ["name", "email", "phone"] },
  cookies: { 5: ["email", "phone"] },
};

function contactLines(kinds: LineKind[], t: TFunction): string[] {
  const { address } = siteConfig;
  const fullAddress = `${address.lines.join(", ")}, ${address.postcode}, ${address.country}`;
  return kinds.map((kind) => {
    switch (kind) {
      case "name":
        return siteConfig.name;
      case "address":
        return fullAddress;
      case "nameAddress":
        return `${siteConfig.name}, ${fullAddress}`;
      case "phone":
        return `${t("legal.labels.telephone")} ${siteConfig.phone.display}`;
      case "email":
        return `${t("legal.labels.email")} ${siteConfig.email}`;
    }
  });
}

/** One legal document in the visitor's language. */
export function getLegalDoc(slug: LegalSlug, t: TFunction): LegalDoc {
  const blocks = t.raw<Array<{ h: string; p?: string[]; ul?: string[]; after?: string[] }>>(`legal.${slug}.blocks`) ?? [];
  return {
    slug,
    title: t(`legal.${slug}.title`),
    lead: t(`legal.${slug}.lead`),
    notice: t(`legal.${slug}.notice`),
    blocks: blocks.map((block, i) => {
      const kinds = lineBlocks[slug][i];
      return kinds ? { ...block, lines: contactLines(kinds, t) } : block;
    }),
  };
}
