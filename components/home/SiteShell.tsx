import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBar } from "./MobileBar";
import { ContactFab } from "./ContactFab";
import { HomeEffects } from "./HomeEffects";
import { CookieBanner } from "./CookieBanner";
import { CtaBand } from "./CtaBand";

/** Chrome shared by every page: skip link, progress bar, header, footer, contact tools. */
export function SiteShell({
  locale,
  children,
  cta = true,
}: {
  locale: Locale;
  children: React.ReactNode;
  cta?: boolean;
}) {
  const t = getT(locale);
  return (
    <>
      <a className="skip" href="#main">
        {t("common.skipToContent")}
      </a>
      <div className="progress" data-progress aria-hidden="true" />
      <Header />
      <main id="main">
        {children}
        {cta && <CtaBand locale={locale} />}
      </main>
      <Footer locale={locale} />
      <MobileBar locale={locale} />
      <ContactFab />
      <HomeEffects />
      <CookieBanner />
    </>
  );
}
