"use client";

import { Fragment } from "react";
import { ArrowIcon, PhoneIcon, WhatsAppIcon } from "@/components/home/icons";
import { Link } from "@/components/i18n/Link";
import { useLocale, useMessageTranslator, useT } from "@/components/i18n/I18nProvider";
import { siteConfig } from "@/config/site";
import { formatDateFor } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import type { Quote } from "@/lib/quote";
import { EstimateCard } from "./EstimateCard";

export type ConfirmationData = {
  reference: string;
  quote: Quote | null;
  estimateNote: string | null;
  stored: boolean;
  emailed: boolean;
  /** The booking was saved against the signed-in customer's account. */
  savedToAccount?: boolean;
  summary: {
    name: string;
    email: string;
    phone: string;
    pickup: string;
    dropoff: string;
    date: string;
    time: string;
    passengers: number;
    returnTrip: { date: string; time: string } | null;
  };
};

/** Shown after a booking request is sent. Says "request", never "confirmed". */
export function BookingConfirmation({ data, onReset }: { data: ConfirmationData; onReset: () => void }) {
  const t = useT();
  const tm = useMessageTranslator();
  const locale = useLocale();
  const { reference, quote, estimateNote, stored, emailed, savedToAccount, summary } = data;
  const whatsapp = `${siteConfig.whatsapp.url}?text=${encodeURIComponent(t("booking.whatsappMessage", { reference }))}`;
  // "Saved to your account – {link}." – the link sits wherever the language puts it.
  const [savedBefore, savedAfter] = t("booking.savedToAccount").split("{link}");
  const devMode = process.env.NODE_ENV !== "production";

  return (
    <div className="bconf" role="status" aria-live="polite">
      <span className="bconf__tick" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <p className="bconf__kicker">{t("booking.kicker")}</p>
      <h2 className="bconf__ref">{reference}</h2>
      <p className="bconf__lead">
        {rich(t("booking.thanks", { name: summary.name.split(" ")[0] }))}
      </p>

      <div className="bconf__actions">
        <a className="btn btn--wa btn--lg" href={whatsapp}>
          <WhatsAppIcon width={22} height={22} />
          {t("booking.whatsappCta")}
        </a>
        <a className="btn btn--ghost-l btn--lg" href={`tel:${siteConfig.phone.tel}`}>
          <PhoneIcon width={20} height={20} />
          {t("booking.call", { phone: siteConfig.phone.display })}
        </a>
      </div>

      <dl className="bconf__sum">
        <div>
          <dt>{t("booking.summary.from")}</dt>
          <dd>{summary.pickup}</dd>
        </div>
        <div>
          <dt>{t("booking.summary.to")}</dt>
          <dd>{summary.dropoff}</dd>
        </div>
        <div>
          <dt>{t("booking.summary.when")}</dt>
          <dd>
            {t("common.dateAt", { date: formatDateFor(summary.date, locale), time: summary.time })}
          </dd>
        </div>
        {summary.returnTrip && (
          <div>
            <dt>{t("booking.summary.return")}</dt>
            <dd>
              {t("common.dateAt", { date: formatDateFor(summary.returnTrip.date, locale), time: summary.returnTrip.time })}
            </dd>
          </div>
        )}
        <div>
          <dt>{t("booking.summary.people")}</dt>
          <dd>{summary.passengers}</dd>
        </div>
        <div>
          <dt>{t("booking.summary.contact")}</dt>
          <dd>
            {summary.phone} · {summary.email}
          </dd>
        </div>
      </dl>

      {quote ? (
        <EstimateCard state={{ status: "ready", quote }} />
      ) : (
        <p className="bconf__noest">
          {estimateNote
            ? t("booking.noEstimateWithNote", { note: tm(estimateNote) })
            : t("booking.noEstimate")}
        </p>
      )}

      <p className="bconf__pay">{t("booking.pay")}</p>

      {savedToAccount && (
        <p className="bconf__acct">
          <Fragment>
            {savedBefore}
            <Link href="/account">{t("booking.savedToAccountLink")}</Link>
            {savedAfter}
          </Fragment>
        </p>
      )}

      {devMode && (!stored || !emailed) && (
        <p className="bconf__dev">
          Test mode (only you see this while developing):{" "}
          {!stored && "Firebase isn’t connected, so this booking was not saved. "}
          {!emailed && "No email was sent because the email service isn’t switched on yet. "}
          {stored && !emailed && "The booking is saved – open Firebase → Firestore → bookings to see it."}
        </p>
      )}

      <button type="button" className="btn btn--ghost-l btn--sm" onClick={onReset}>
        {t("booking.another")} <ArrowIcon width={16} height={16} />
      </button>
    </div>
  );
}
