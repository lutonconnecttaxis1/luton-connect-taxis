import { headers } from "next/headers";
import { Link } from "@/components/i18n/Link";
import { SiteShell } from "@/components/home/SiteShell";
import { defaultLocale, isLocale, LOCALE_HEADER } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";

export default async function NotFound() {
  // Next does not give the 404 page the route params, so the middleware leaves the language in a header.
  const header = (await headers()).get(LOCALE_HEADER);
  const locale = isLocale(header) ? header : defaultLocale;
  const t = getT(locale);
  return (
    <SiteShell locale={locale} cta={false}>
      <section className="sec sec--dark page-head page-head--center" id="top">
        <div className="container">
          <p className="eyebrow">{t("notFound.eyebrow")}</p>
          <h1 className="display">
            {t("notFound.title")}
            <br />
            <em className="grad">{t("notFound.titleAccent")}</em>
          </h1>
          <p className="routes__sub">{t("notFound.lead")}</p>
          <p className="page-head__actions">
            <Link className="btn btn--brand btn--lg" href="/">
              {t("notFound.home")}
            </Link>
            <Link className="btn btn--ghost-d btn--lg" href="/contact">
              {t("notFound.contact")}
            </Link>
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
