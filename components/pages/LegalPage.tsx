import { SiteShell } from "@/components/home/SiteShell";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { getLegalDoc, type LegalSlug } from "./legal-content";

/** Plain, readable legal page: dark title band + a narrow reading column on white. */
export function LegalPage({ slug, locale }: { slug: LegalSlug; locale: Locale }) {
  const t = getT(locale);
  const doc = getLegalDoc(slug, t);
  return (
    <SiteShell cta={false} locale={locale}>
      <section className="sec sec--dark page-head" id="top">
        <div className="container">
          <p className="eyebrow" data-reveal>
            {t("legal.eyebrow")}
          </p>
          <h1 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>
            {doc.title}
          </h1>
        </div>
      </section>

      <section className="sec sec--light legal">
        <div className="container legal__in">
          {locale !== defaultLocale && (
            <p className="legal__notice" role="note">
              {t("legal.translationNotice")}
            </p>
          )}
          <p className="legal__lead">{doc.lead}</p>
          {doc.blocks.map((block) => (
            <section key={block.h} className="legal__block">
              <h2>{block.h}</h2>
              {block.p?.map((text) => <p key={text}>{text}</p>)}
              {block.ul && (
                <ul>
                  {block.ul.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {block.after?.map((text) => <p key={text}>{text}</p>)}
              {block.lines && (
                <p>
                  {block.lines.map((line, i) => (
                    <span key={line}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </p>
              )}
            </section>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
