import { Link } from "@/components/i18n/Link";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { CookieSettingsButton } from "./CookieSettingsButton";

export function Footer({ locale }: { locale: Locale }) {
  const t = getT(locale);
  const { address, social } = siteConfig;
  return (
    <footer className="footer" id="contact">
      <div className="container footer__grid">
        <div className="footer__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-on-dark.png" alt={siteConfig.name} width={900} height={409} />
          <a className="footer__phone" href={`tel:${siteConfig.phone.tel}`}>
            {siteConfig.phone.display}
          </a>
          <a className="footer__mail" href={`mailto:${siteConfig.email}`}>
            {siteConfig.email}
          </a>
        </div>

        <div>
          <h3>{t("footer.visit")}</h3>
          <address>
            {address.lines.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
            {address.postcode}
          </address>
        </div>

        <div>
          <h3>{t("footer.follow")}</h3>
          <ul>
            <li>
              <a href={social.instagram}>Instagram</a>
            </li>
            <li>
              <a href={social.facebook}>Facebook</a>
            </li>
            <li>
              <a href={social.tiktok}>TikTok</a>
            </li>
            <li>
              <a href={siteConfig.whatsapp.url}>WhatsApp</a>
            </li>
          </ul>
        </div>

        <div>
          <h3>{t("footer.legal")}</h3>
          <ul>
            <li>
              <Link href="/terms">{t("footer.terms")}</Link>
            </li>
            <li>
              <Link href="/privacy">{t("footer.privacy")}</Link>
            </li>
            <li>
              <Link href="/cookies">{t("footer.cookies")}</Link>
            </li>
            <li>
              <CookieSettingsButton />
            </li>
          </ul>
        </div>
      </div>

      <div className="container footer__pay">
        <p>{t("footer.paymentsTitle")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/payments/payment-icons.webp"
          alt={t("footer.paymentsAlt")}
          width={1400}
          height={130}
          loading="lazy"
        />
      </div>

      <div className="container footer__base">
        <p>{t("footer.copyright", { year: new Date().getFullYear(), name: siteConfig.name })}</p>
        <a href="#top">{t("footer.backToTop")}</a>
      </div>
    </footer>
  );
}
