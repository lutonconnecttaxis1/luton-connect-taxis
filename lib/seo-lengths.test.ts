import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { services } from "../components/home/service-data";
import { siteConfig } from "../config/site";
import { posts } from "../content/blog";
import { localizedPosts } from "./blog-i18n";
import { locales } from "./i18n/config";
import { getT } from "./i18n/messages";

/** Search engines flag page titles over about 70 characters. The site name is added after each page title. */
const MAX_TITLE = 65;
const SUFFIX = ` | ${siteConfig.name}`.length;

describe("page titles stay short enough for search results", () => {
  for (const locale of locales) {
    it(`${locale}: home, section, service and legal titles`, () => {
      const t = getT(locale);
      const home = `${siteConfig.name} – ${t("meta.tagline")}`;
      assert.ok(home.length <= MAX_TITLE, `home title ${home.length}: ${home}`);

      const titles = [
        t("pages.fleet.metaTitle"),
        t("pages.contact.metaTitle"),
        t("pages.blog.metaTitle"),
        t("legal.privacy.title"),
        t("legal.terms.title"),
        t("legal.cookies.title"),
        ...services.map((s) => t(`services.items.${s.slug}.name`)),
      ];
      for (const title of titles) {
        assert.ok(title.length + SUFFIX <= MAX_TITLE, `"${title}" is ${title.length + SUFFIX} characters with the site name`);
      }
    });

    it(`${locale}: article titles for search results`, () => {
      for (const post of localizedPosts(locale)) {
        assert.ok(post.seoTitle, `${locale}/${post.slug}: missing seoTitle`);
        assert.ok(post.seoTitle.length + SUFFIX <= MAX_TITLE, `${locale}/${post.slug}: "${post.seoTitle}" is too long`);
      }
    });
  }

  it("every English article has a short search title", () => {
    for (const p of posts) assert.ok(p.seoTitle && p.seoTitle.length <= 43, p.slug);
  });
});
