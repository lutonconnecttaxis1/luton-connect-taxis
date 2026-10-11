import type { Metadata } from "next";
import { SiteShell } from "@/components/home/SiteShell";
import { PageHero } from "@/components/home/PageHero";
import { ContactForm } from "@/components/pages/ContactForm";
import { ArrowIcon, MailIcon, PhoneIcon, WhatsAppIcon } from "@/components/home/icons";
import { images } from "@/config/images";
import { fillSlots } from "@/components/pages/slots";
import { siteConfig } from "@/config/site";
import { resolveLocale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { rich } from "@/lib/i18n/rich";
import { pageMetadata } from "@/lib/i18n/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loc = resolveLocale((await params).locale);
  const t = getT(loc);
  return pageMetadata(loc, "/contact", {
    title: t("pages.contact.metaTitle"),
    description: t("pages.contact.metaDescription", { phone: siteConfig.phone.display, email: siteConfig.email }),
  });
}

export default async function ContactPage({ params }: Props) {
  const loc = resolveLocale((await params).locale);
  const t = getT(loc);
  const { address, social } = siteConfig;
  const fullAddress = `${address.lines.join(", ")}, ${address.postcode}, ${address.country}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const ways = [
    {
      label: t("pages.contact.callUs"),
      value: siteConfig.phone.display,
      href: `tel:${siteConfig.phone.tel}`,
      icon: <PhoneIcon width={26} height={26} />,
    },
    {
      label: "WhatsApp",
      value: siteConfig.whatsapp.display,
      href: siteConfig.whatsapp.url,
      icon: <WhatsAppIcon width={26} height={26} />,
    },
    {
      label: t("pages.contact.emailLabel"),
      value: siteConfig.email,
      small: true,
      href: `mailto:${siteConfig.email}`,
      icon: <MailIcon width={26} height={26} />,
    },
  ];

  return (
    <SiteShell cta={false} locale={loc}>
      <PageHero
        locale={loc}
        eyebrow={t("pages.contact.eyebrow")}
        title={t("pages.contact.title")}
        lead={t("pages.contact.lead")}
        photo={images.hero}
        actions={false}
      />

      <section className="sec sec--light contact">
        <div className="container contact__grid">
          <div>
            <p className="eyebrow" data-reveal>
              {t("pages.contact.getInTouch")}
            </p>
            <ul className="touch">
              {ways.map((way, i) => (
                <li key={way.label} data-reveal style={{ ["--d" as string]: `${i * 90}ms` }}>
                  <a href={way.href}>
                    <span className="touch__icon">{way.icon}</span>
                    <span className="touch__text">
                      <span className="touch__label">{way.label}</span>
                      <span className={`touch__value${"small" in way ? " touch__value--sm" : ""}`}>{way.value}</span>
                    </span>
                    <span className="touch__go" aria-hidden="true">
                      <ArrowIcon width={22} height={22} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="contact__note" data-reveal>
              {t("pages.contact.note")}
            </p>
          </div>

          <div className="contact__side">
            <div data-reveal>
              <h2 className="contact__h">{t("pages.contact.visit")}</h2>
              <address>
                {address.lines.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
                {address.postcode}
                <br />
                {address.country}
              </address>
              <p>
                <a className="link-arrow" href={mapUrl} target="_blank" rel="noopener noreferrer">
                  {t("pages.contact.openMaps")} <ArrowIcon width={18} height={18} />
                </a>
              </p>
            </div>
            <div data-reveal style={{ ["--d" as string]: "100ms" }}>
              <h2 className="contact__h">{t("pages.contact.follow")}</h2>
              <ul className="contact__social">
                <li>
                  <a href={social.instagram} target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href={social.tiktok} target="_blank" rel="noopener noreferrer">
                    TikTok
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec--dark cformsec" id="message" aria-labelledby="message-title">
        <div className="container cformsec__grid">
          <div className="cformsec__intro">
            <p className="eyebrow" data-reveal>
              {t("pages.contact.messageEyebrow")}
            </p>
            <h2 className="display cformsec__title" id="message-title" data-reveal>
              {rich(t("pages.contact.messageTitle"), {
                mark: (children, key) => (
                  <span className="grad" key={key}>
                    {children}
                  </span>
                ),
              })}
            </h2>
            <p className="cformsec__lead" data-reveal>
              {fillSlots(t("pages.contact.messageLead"), {
                email: <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>,
              })}
            </p>
          </div>
          <div data-reveal style={{ ["--d" as string]: "120ms" }}>
            <ContactForm />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
