/**
 * Business details – single source of truth for the whole site.
 * Source: client-supplied, 2 Oct 2026 (see PROJECT_CONTEXT.md).
 */
export const siteConfig = {
  name: "Luton Connect Taxis",
  domain: "lutonconnecttaxis.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lutonconnecttaxis.com", // the address the site is served from (apex redirects here)
  tagline: "Taxis for airports, local trips and long-distance journeys",
  phone: {
    display: "01582 353158",
    tel: "+441582353158",
  },
  whatsapp: {
    display: "+44 1582 353158",
    // wa.me link format: country code + number, no "+" or spaces
    url: "https://wa.me/441582353158",
  },
  email: "admin@lutonconnecttaxis.com",
  address: {
    lines: [
      "5th Floor, Hampton by Hilton",
      "Cubix Luton Ltd Offices",
      "42–50 Kimpton Road",
      "Luton",
    ],
    postcode: "LU2 0FP",
    country: "United Kingdom",
  },
  social: {
    tiktok: "https://www.tiktok.com/@luton.connect.tax",
    facebook: "https://www.facebook.com/share/1Eqm3KEqqe/",
    instagram: "https://www.instagram.com/lutonconnecttaxis",
  },
  fleet: ["LEVC TX e", "Mercedes Vito 114"],
  /**
   * Indexing switch. Stays false on previews so Google does not index
   * unfinished pages. Set NEXT_PUBLIC_SITE_INDEXABLE=true on production only.
   */
  indexable: process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true",
} as const;

export type SiteConfig = typeof siteConfig;
