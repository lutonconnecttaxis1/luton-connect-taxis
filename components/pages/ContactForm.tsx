"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/i18n/Link";
import { useMessageTranslator, useT } from "@/components/i18n/I18nProvider";
import { ArrowIcon } from "@/components/home/icons";
import { fillSlots } from "@/components/pages/slots";
import { CONTACT_LIMITS, CONTACT_TOPICS, validateContact, type ContactErrors, type ContactTopic } from "@/lib/contact";
import { siteConfig } from "@/config/site";

type Status = "idle" | "sending" | "sent" | "error";

const FIELD_ORDER = ["name", "email", "phone", "topic", "message"] as const;

/** The topic values stay English (they go into the email to the team); only the label is translated. */
const TOPIC_KEYS: Record<ContactTopic, string> = {
  "Get a quote": "quote",
  "Make a booking": "booking",
  "Corporate account": "corporate",
  "Lost property": "lost",
  "Something else": "other",
};

export function ContactForm() {
  const t = useT();
  const tm = useMessageTranslator();
  const formRef = useRef<HTMLFormElement>(null);
  const openedAt = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [serverNote, setServerNote] = useState("");
  const [delivered, setDelivered] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  function focusFirst(found: ContactErrors) {
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    const check = validateContact(values);
    if (!check.ok) {
      setErrors(check.errors);
      setStatus("idle");
      setServerNote("");
      focusFirst(check.errors);
      return;
    }

    setErrors({});
    setServerNote("");
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...check.data, website: values.website ?? "", openedAt: openedAt.current }),
      });
      const data: { ok?: boolean; delivered?: boolean; error?: string; errors?: ContactErrors } = await res
        .json()
        .catch(() => ({}));

      if (res.ok && data.ok) {
        setDelivered(data.delivered !== false);
        setStatus("sent");
        return;
      }
      if (res.status === 422 && data.errors) {
        setErrors(data.errors);
        setStatus("idle");
        focusFirst(data.errors);
        return;
      }
      setServerNote(
        data.error === "rate-limited"
          ? t("contactForm.errorRateLimited")
          : data.error === "too-fast"
            ? t("contactForm.errorTooFast")
            : t("contactForm.errorSendFailed", { phone: siteConfig.phone.display, email: siteConfig.email }),
      );
      setStatus("error");
    } catch {
      setServerNote(t("contactForm.errorNetwork", { phone: siteConfig.phone.display }));
      setStatus("error");
    }
  }

  function again() {
    formRef.current?.reset();
    setCount(0);
    setErrors({});
    setServerNote("");
    openedAt.current = Date.now();
    setStatus("idle");
  }

  if (status === "sent") {
    return (
      <div className="cform__done" role="status" aria-live="polite">
        <span className="cform__tick" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h3 className="cform__done-title">{t("contactForm.doneTitle")}</h3>
        <p>
          {fillSlots(t("contactForm.doneBody"), {
            phone: <a href={`tel:${siteConfig.phone.tel}`}>{siteConfig.phone.display}</a>,
            whatsapp: <a href={siteConfig.whatsapp.url}>{t("contactForm.whatsappLink")}</a>,
          })}
        </p>
        {!delivered && <p className="cform__devnote">{t("contactForm.devNote")}</p>}
        <button type="button" className="btn btn--ghost-d btn--sm" onClick={again}>
          {t("contactForm.again")}
        </button>
      </div>
    );
  }

  const err = (key: keyof ContactErrors) => (errors[key] ? `err-${key}` : undefined);

  return (
    <form ref={formRef} className="cform" onSubmit={onSubmit} noValidate>
      <div className="cform__row">
        <div className={`cform__field${errors.name ? " has-error" : ""}`}>
          <label htmlFor="cf-name">{t("contactForm.name")}</label>
          <input
            id="cf-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={CONTACT_LIMITS.name}
            aria-invalid={!!errors.name}
            aria-describedby={err("name")}
            required
          />
          {errors.name && (
            <p className="cform__err" id="err-name">
              {tm(errors.name)}
            </p>
          )}
        </div>
        <div className={`cform__field${errors.email ? " has-error" : ""}`}>
          <label htmlFor="cf-email">{t("contactForm.email")}</label>
          <input
            id="cf-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={CONTACT_LIMITS.email}
            aria-invalid={!!errors.email}
            aria-describedby={err("email")}
            required
          />
          {errors.email && (
            <p className="cform__err" id="err-email">
              {tm(errors.email)}
            </p>
          )}
        </div>
      </div>

      <div className="cform__row">
        <div className={`cform__field${errors.phone ? " has-error" : ""}`}>
          <label htmlFor="cf-phone">
            {t("contactForm.phone")} <span className="cform__opt">{t("contactForm.optional")}</span>
          </label>
          <input
            id="cf-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={CONTACT_LIMITS.phone}
            aria-invalid={!!errors.phone}
            aria-describedby={err("phone")}
          />
          {errors.phone && (
            <p className="cform__err" id="err-phone">
              {tm(errors.phone)}
            </p>
          )}
        </div>
        <div className={`cform__field${errors.topic ? " has-error" : ""}`}>
          <label htmlFor="cf-topic">{t("contactForm.topic")}</label>
          <select
            id="cf-topic"
            name="topic"
            defaultValue=""
            aria-invalid={!!errors.topic}
            aria-describedby={err("topic")}
            required
          >
            <option value="" disabled>
              {t("contactForm.topicPlaceholder")}
            </option>
            {CONTACT_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {t(`contactForm.topics.${TOPIC_KEYS[topic]}`)}
              </option>
            ))}
          </select>
          {errors.topic && (
            <p className="cform__err" id="err-topic">
              {tm(errors.topic)}
            </p>
          )}
        </div>
      </div>

      <div className={`cform__field${errors.message ? " has-error" : ""}`}>
        <label htmlFor="cf-message">{t("contactForm.message")}</label>
        <textarea
          id="cf-message"
          name="message"
          rows={6}
          maxLength={CONTACT_LIMITS.message}
          onChange={(e) => setCount(e.currentTarget.value.length)}
          aria-invalid={!!errors.message}
          aria-describedby={err("message")}
          placeholder={t("contactForm.messagePlaceholder")}
          required
        />
        <div className="cform__meta">
          {errors.message ? (
            <p className="cform__err" id="err-message">
              {tm(errors.message)}
            </p>
          ) : (
            <span />
          )}
          <span className="cform__count" aria-hidden="true">
            {count}/{CONTACT_LIMITS.message}
          </span>
        </div>
      </div>

      {/* Honeypot – hidden from people; bots tend to fill it in. */}
      <div className="cform__trap" aria-hidden="true">
        <label htmlFor="cf-website">{t("contactForm.trap")}</label>
        <input id="cf-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {serverNote && (
        <p className="cform__alert" role="alert">
          {serverNote}
        </p>
      )}

      <div className="cform__actions">
        <button type="submit" className="btn btn--brand btn--lg" disabled={status === "sending"}>
          {status === "sending" ? t("contactForm.sending") : t("contactForm.send")}
          {status !== "sending" && <ArrowIcon width={20} height={20} />}
        </button>
        <p className="cform__fine">
          {fillSlots(t("contactForm.fine"), {
            privacy: <Link href="/privacy">{t("contactForm.privacyLink")}</Link>,
          })}
        </p>
      </div>
    </form>
  );
}
