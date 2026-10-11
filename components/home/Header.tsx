"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { hasSignedInFlag } from "@/lib/account";
import { Link } from "@/components/i18n/Link";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/components/i18n/I18nProvider";
import { navLinks } from "./data";
import { CloseIcon, MenuIcon, PhoneIcon, UserIcon, WhatsAppIcon } from "./icons";

export function Header() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  // "My account" vs "Sign in": read the readable flag cookie – no request needed.
  useEffect(() => {
    const read = () => setSignedIn(hasSignedInFlag(document.cookie));
    read();
    window.addEventListener("lct-auth", read);
    return () => window.removeEventListener("lct-auth", read);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [open]);

  return (
    <>
      <header className="header" data-header>
        <div className="container header__in">
          <Link className="header__logo" href="/" aria-label={t("header.homeAria", { name: siteConfig.name })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-on-dark.png" alt={siteConfig.name} width={900} height={409} />
          </Link>

          <nav className="header__nav" aria-label={t("header.navMain")}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {t(`header.nav.${link.key}`)}
              </Link>
            ))}
          </nav>

          <div className="header__tools">
            <LanguageSwitcher />
            <Link className="header__account" href="/account" aria-label={signedIn ? t("header.myAccount") : t("header.signIn")}>
              <UserIcon width={20} height={20} />
              <span className="header__accountlabel">{signedIn ? t("header.myAccount") : t("header.signIn")}</span>
            </Link>
            <a
              className="header__phone"
              href={`tel:${siteConfig.phone.tel}`}
              aria-label={t("common.callPhone", { phone: siteConfig.phone.display })}
            >
              <PhoneIcon width={18} height={18} />
              <span className="header__phonetext">{siteConfig.phone.display}</span>
            </a>
            <Link className="btn btn--brand btn--sm header__book" href="/#quote">
              {t("header.bookNow")}
            </Link>
            <button
              type="button"
              className="burger"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t("header.closeMenu") : t("header.openMenu")}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      <div id="mobile-menu" className="menu" data-open={open} hidden={!open}>
        <nav aria-label={t("header.navMobile")}>
          {navLinks.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              style={{ ["--i" as string]: i }}
              onClick={() => setOpen(false)}
            >
              {t(`header.nav.${link.key}`)}
            </Link>
          ))}
        </nav>
        <div className="menu__foot">
          <Link className="btn btn--ghost-d" href="/account" onClick={() => setOpen(false)}>
            <UserIcon width={20} height={20} />
            {signedIn ? t("header.myAccount") : t("header.signInOrCreate")}
          </Link>
          <a className="btn btn--brand" href={`tel:${siteConfig.phone.tel}`} onClick={() => setOpen(false)}>
            {t("common.callPhone", { phone: siteConfig.phone.display })}
          </a>
          <a className="btn btn--wa" href={siteConfig.whatsapp.url} onClick={() => setOpen(false)}>
            <WhatsAppIcon width={22} height={22} />
            {t("common.whatsappUs")}
          </a>
        </div>
      </div>
    </>
  );
}
