import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/** Blocks all crawlers until NEXT_PUBLIC_SITE_INDEXABLE=true is set on the live site. */
export default function robots(): MetadataRoute.Robots {
  if (!siteConfig.indexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/*/account", "/api/"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
