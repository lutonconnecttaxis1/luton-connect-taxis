import type { Metadata, Viewport } from "next";
import { Figtree, Outfit } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import "../globals.css";
import "../home.css";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { siteConfig } from "@/config/site";
import { isLocale, localeInfo, locales } from "@/lib/i18n/config";
import { englishValidation, getT, loadMessages, pickClientMessages } from "@/lib/i18n/messages";
import { baseAlternates } from "@/lib/i18n/seo";
import { NONCE_HEADER } from "@/lib/security/csp";

// Outfit: geometric display face that echoes the logo lettering. Figtree: friendly, legible body text.
// latin-ext covers Romanian (ă â î ș ț), Polish-style accents and the rest of the European languages.
const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});
const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-figtree",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getT(locale);
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} – ${t("meta.tagline")}`,
      template: `%s | ${siteConfig.name}`,
    },
    description: t("meta.description"),
    alternates: baseAlternates(locale, "/"),
    openGraph: { siteName: siteConfig.name, locale: localeInfo[locale].og, type: "website" },
    // Previews and the build-in-progress site must not be indexed.
    robots: siteConfig.indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0F14",
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = loadMessages(locale);
  // Reading the request headers makes every page render per request, which is what lets each
  // response carry its own CSP nonce (set in middleware.ts).
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  return (
    <html lang={localeInfo[locale].htmlLang} className={`${outfit.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        {/* Enables the scroll-reveal styles only when JavaScript is running, so content never stays hidden. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <I18nProvider
          locale={locale}
          messages={pickClientMessages(messages)}
          validationSource={englishValidation()}
        >
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
