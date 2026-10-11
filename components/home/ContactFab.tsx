"use client";

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { useT } from "@/components/i18n/I18nProvider";
import { CloseIcon, HeadsetIcon, MailIcon, PhoneIcon, WhatsAppIcon } from "./icons";

/** Floating "Contact us" button, bottom-right on every page. Opens email · WhatsApp · call. */
export function ContactFab() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const items = [
    { key: "mail", label: t("contactFab.email"), href: `mailto:${siteConfig.email}`, icon: <MailIcon width={24} height={24} /> },
    { key: "wa", label: "WhatsApp", href: siteConfig.whatsapp.url, icon: <WhatsAppIcon width={24} height={24} /> },
    { key: "call", label: t("contactFab.call"), href: `tel:${siteConfig.phone.tel}`, icon: <PhoneIcon width={24} height={24} /> },
  ];

  return (
    <div className="fab" data-open={open} ref={root}>
      <ul className="fab__list" id="fab-list">
        {items.map((item, i) => (
          <li key={item.key} style={{ ["--i" as string]: items.length - 1 - i }}>
            <a
              className={`fab__item fab__item--${item.key}`}
              href={item.href}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
            >
              <span className="fab__icon">{item.icon}</span>
              <span className="fab__text">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="fab__btn"
        aria-expanded={open}
        aria-controls="fab-list"
        aria-label={open ? t("contactFab.closeOptions") : t("contactFab.contactUs")}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CloseIcon width={26} height={26} /> : <HeadsetIcon width={26} height={26} />}
        <span className="fab__label">{open ? t("contactFab.close") : t("contactFab.contactUs")}</span>
      </button>
    </div>
  );
}
