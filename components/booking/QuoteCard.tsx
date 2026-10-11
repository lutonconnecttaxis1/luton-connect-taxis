"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowIcon, PhoneIcon, WhatsAppIcon } from "@/components/home/icons";
import { Link } from "@/components/i18n/Link";
import { useLocale, useMessageTranslator, useT } from "@/components/i18n/I18nProvider";
import { pricingConfig } from "@/config/pricing";
import { siteConfig } from "@/config/site";
import {
  BOOKING_LIMITS,
  LUGGAGE_OPTIONS,
  MAX_CHILD_SEATS,
  VEHICLE_OPTIONS,
  validateBooking,
  type BookingErrors,
} from "@/lib/booking";
import { hasSignedInFlag, type AccountUser } from "@/lib/account";
import { validateJourney, type PlaceRef } from "@/lib/journey";
import { formatDateFor } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import { londonNow } from "@/lib/pricing/dates";
import type { TFunction } from "@/lib/i18n/translate";
import { getRecaptchaToken, loadRecaptcha } from "@/lib/recaptcha-client";
import type { Quote } from "@/lib/quote";
import { BookingConfirmation, type ConfirmationData } from "./BookingConfirmation";
import { EstimateCard, type EstimateState } from "./EstimateCard";
import { PlaceInput } from "./PlaceInput";

type Values = {
  pickup: PlaceRef | null;
  dropoff: PlaceRef | null;
  date: string;
  time: string;
  passengers: string;
  wantReturn: boolean;
  returnDate: string;
  returnTime: string;
  vehicle: string;
  luggage: string;
  childSeats: string;
  flightNumber: string;
  notes: string;
  name: string;
  email: string;
  phone: string;
  terms: boolean;
};

const emptyValues = (): Values => ({
  pickup: null,
  dropoff: null,
  date: "",
  time: "",
  passengers: "2",
  wantReturn: false,
  returnDate: "",
  returnTime: "",
  vehicle: VEHICLE_OPTIONS[0],
  luggage: LUGGAGE_OPTIONS[0],
  childSeats: "0",
  flightNumber: "",
  notes: "",
  name: "",
  email: "",
  phone: "",
  terms: false,
});

/** Order the card reads in – the first error in this order gets the focus. */
const FIELD_IDS: Array<[keyof BookingErrors, string]> = [
  ["pickup", "qc-pickup"],
  ["dropoff", "qc-drop"],
  ["date", "qc-date"],
  ["time", "qc-time"],
  ["passengers", "qc-pax"],
  ["returnDate", "qc-rdate"],
  ["returnTime", "qc-rtime"],
  ["name", "qc-name"],
  ["email", "qc-email"],
  ["phone", "qc-phone"],
  ["childSeats", "qc-seats"],
  ["flightNumber", "qc-flight"],
  ["notes", "qc-notes"],
  ["terms", "qc-terms"],
];
const MORE_FIELDS: Array<keyof BookingErrors> = ["childSeats", "flightNumber", "notes"];
const BAR_FIELDS: Array<keyof BookingErrors> = ["pickup", "dropoff", "date", "time", "passengers"];

/** Message keys of the (English) luggage / vehicle values the booking form sends. */
const LUGGAGE_KEYS: Record<(typeof LUGGAGE_OPTIONS)[number], string> = {
  "No luggage": "none",
  "1–2 bags": "bags12",
  "3–4 bags": "bags34",
  "5 or more (tell us in the notes)": "bags5",
};

/** Puts React nodes where a message has {name} markers: "agree to the {terms} and {privacy}." */
function withNodes(text: string, nodes: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/g).map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{name && name in nodes ? nodes[name] : rich(part)}</Fragment>;
  });
}

function quoteMessage(t: TFunction, tm: (text: string) => string, code: unknown, message: unknown, hint: unknown): string {
  const phone = siteConfig.phone.display;
  let text: string;
  switch (code) {
    case "no-route":
      text = t("validation.api.noRoute");
      break;
    case "maps-not-configured":
    case "maps-unavailable":
      text = t("validation.api.mapsUnavailable", { phone });
      break;
    case "rate-limited":
      text = t("validation.api.quoteRateLimited");
      break;
    case "too-far":
    case "too-many-passengers":
      text = typeof message === "string" ? tm(message) : t("validation.api.callForQuote");
      break;
    default:
      text = t("validation.api.quoteFailed");
  }
  // The server only sends a hint while developing – it says exactly what to fix in Google Cloud.
  return typeof hint === "string" && hint ? `${text}\n\nDeveloper note (only you see this while testing): ${hint}` : text;
}

function bookingMessage(t: TFunction, code: unknown): string {
  const phone = siteConfig.phone.display;
  switch (code) {
    case "rate-limited":
      return t("validation.api.bookingRateLimited");
    case "too-fast":
      return t("validation.api.tooFast");
    case "captcha-failed":
      return t("validation.api.captchaFailed", { phone });
    case "storage-unavailable":
      return t("validation.api.storageUnavailable", { phone });
    case "no-route":
      return t("validation.api.noRoute");
    default:
      return t("validation.api.bookingFailed", { phone });
  }
}

/**
 * The homepage quote card. One card does everything:
 *  1. type pickup / drop-off (Google suggestions), date, time, people
 *  2. "Get estimate" – the card grows and shows the calculated fare
 *  3. "Request this taxi" – name / email / phone appear inside the same card
 */
export function QuoteCard() {
  const t = useT();
  const tm = useMessageTranslator();
  const locale = useLocale();
  const rootRef = useRef<HTMLElement>(null);
  const trapRef = useRef<HTMLInputElement>(null);
  const openedAt = useRef(0);
  const immediate = useRef(false);

  const [values, setValues] = useState<Values>(emptyValues);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const [resetKey, setResetKey] = useState(0);

  const [today, setToday] = useState("");
  const [opened, setOpened] = useState(false);
  const [tried, setTried] = useState(false);
  const [estimate, setEstimate] = useState<EstimateState>({ status: "idle" });
  const [noRoute, setNoRoute] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const [requestOpen, setRequestOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<BookingErrors>({});
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<ConfirmationData | null>(null);
  const [account, setAccount] = useState<AccountUser | null>(null);

  useEffect(() => {
    setToday(londonNow().date);
  }, []);

  // Signed in? Fill in the saved name, email and phone (never over something already typed).
  useEffect(() => {
    if (!hasSignedInFlag(document.cookie)) return;
    let cancelled = false;
    fetch("/api/account/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { user?: AccountUser | null }) => {
        const user = data.user;
        if (cancelled || !user) return;
        setAccount(user);
        setValues((v) => ({
          ...v,
          name: v.name || user.name,
          email: v.email || user.email,
          phone: v.phone || user.phone,
        }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const payload = useMemo(
    () => ({
      pickup: values.pickup,
      dropoff: values.dropoff,
      date: values.date,
      time: values.time,
      passengers: Number(values.passengers),
      returnTrip: values.wantReturn ? { date: values.returnDate, time: values.returnTime } : null,
      name: values.name,
      email: values.email,
      phone: values.phone,
      luggage: values.luggage,
      vehicle: values.vehicle,
      childSeats: Number(values.childSeats),
      flightNumber: values.flightNumber,
      notes: values.notes,
      termsAccepted: values.terms,
    }),
    [values],
  );

  const journeyCheck = useMemo(() => validateJourney(payload), [payload]);
  const quoteBody = journeyCheck.ok ? JSON.stringify(journeyCheck.data) : "";

  // ---- the estimate: once the card is open it follows every change you make ----
  useEffect(() => {
    if (!opened || !quoteBody) return;
    const controller = new AbortController();
    setEstimate({ status: "loading" });
    setNoRoute(false);
    const delay = immediate.current ? 0 : 450;
    immediate.current = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: quoteBody,
          signal: controller.signal,
        });
        const data: { ok?: boolean; quote?: Quote; error?: string; message?: string; hint?: string } = await res
          .json()
          .catch(() => ({}));
        if (controller.signal.aborted) return;
        if (res.ok && data.ok && data.quote) {
          setEstimate({ status: "ready", quote: data.quote });
        } else {
          setNoRoute(data.error === "no-route");
          setEstimate({ status: "error", message: quoteMessage(t, tm, data.error, data.message, data.hint) });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEstimate({ status: "error", message: quoteMessage(t, tm, "network", null, null) });
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [opened, quoteBody, refresh, t, tm]);

  // While the journey is not complete the card says what is missing.
  let shownEstimate: EstimateState = estimate;
  if (!quoteBody) {
    const e = journeyCheck.ok ? {} : journeyCheck.errors;
    const hint = e.pickup ?? e.dropoff ?? e.date ?? e.time ?? e.passengers ?? e.returnDate ?? e.returnTime;
    shownEstimate = { status: "idle", hint: hint ? tm(hint) : undefined };
  }

  // ---- errors ----
  const bookingCheck = useMemo(() => validateBooking(payload), [payload]);
  const journeyErrors = journeyCheck.ok ? {} : journeyCheck.errors;
  const errors: BookingErrors = {
    ...(tried ? journeyErrors : {}),
    ...(submitted && !bookingCheck.ok ? bookingCheck.errors : {}),
    ...serverErrors,
  };
  const barMessages = BAR_FIELDS.map((k) => errors[k]).filter((m): m is string => Boolean(m)).map(tm);

  function focusFirst(found: BookingErrors) {
    for (const [key, id] of FIELD_IDS) {
      if (found[key]) {
        if (MORE_FIELDS.includes(key)) setMoreOpen(true);
        requestAnimationFrame(() => document.getElementById(id)?.focus());
        return;
      }
    }
  }

  function getEstimate(event: React.FormEvent) {
    event.preventDefault();
    setTried(true);
    if (!journeyCheck.ok) {
      focusFirst(journeyCheck.errors);
      return;
    }
    immediate.current = true;
    if (!opened) {
      setOpened(true);
      // let the card start growing, then bring it into view
      requestAnimationFrame(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else {
      setRefresh((n) => n + 1); // already open: ask again even if nothing changed
    }
  }

  function openRequest() {
    openedAt.current = Date.now();
    setRequestOpen(true);
    requestAnimationFrame(() => document.getElementById("qc-name")?.focus());
  }

  async function sendRequest(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSubmitted(true);
    setServerErrors({});
    setNote("");

    const result = validateBooking(payload);
    if (!result.ok) {
      focusFirst(result.errors);
      return;
    }

    setSending(true);
    try {
      const recaptchaToken = await getRecaptchaToken("booking");
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          locale,
          website: trapRef.current?.value ?? "",
          openedAt: openedAt.current,
          recaptchaToken,
        }),
      });
      const data: {
        ok?: boolean;
        reference?: string;
        quote?: Quote | null;
        estimateNote?: string | null;
        stored?: boolean;
        emailed?: boolean;
        savedToAccount?: boolean;
        error?: string;
        errors?: BookingErrors;
      } = await res.json().catch(() => ({}));

      if (res.ok && data.ok && data.reference) {
        setDone({
          reference: data.reference,
          quote: data.quote ?? null,
          estimateNote: data.estimateNote ?? null,
          stored: data.stored !== false,
          emailed: data.emailed === true,
          savedToAccount: data.savedToAccount === true,
          summary: {
            name: result.data.details.name,
            email: result.data.details.email,
            phone: result.data.details.phone,
            pickup: result.data.journey.pickup.text,
            dropoff: result.data.journey.dropoff.text,
            date: result.data.journey.date,
            time: result.data.journey.time,
            passengers: result.data.journey.passengers,
            returnTrip: result.data.journey.returnTrip,
          },
        });
        requestAnimationFrame(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      } else if (res.status === 422 && data.errors) {
        setServerErrors(data.errors);
        focusFirst(data.errors);
      } else {
        setNote(bookingMessage(t, data.error));
      }
    } catch {
      setNote(t("validation.api.network", { phone: siteConfig.phone.display }));
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setDone(null);
    setOpened(false);
    setTried(false);
    setRequestOpen(false);
    setMoreOpen(false);
    setSubmitted(false);
    setServerErrors({});
    setNote("");
    setNoRoute(false);
    setEstimate({ status: "idle" });
    setValues(emptyValues());
    setResetKey((k) => k + 1); // empties the two address boxes
    requestAnimationFrame(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const err = (k: keyof BookingErrors) => (errors[k] ? `qc-err-${k}` : undefined);
  const Err = ({ k }: { k: keyof BookingErrors }) =>
    errors[k] ? (
      <p className="bf__err" id={`qc-err-${k}`}>
        {tm(errors[k] ?? "")}
      </p>
    ) : null;

  const whatsappText =
    values.pickup && values.dropoff && values.date && values.time
      ? t(values.passengers === "1" ? "quote.whatsapp.journeyOne" : "quote.whatsapp.journeyOther", {
          pickup: values.pickup.text,
          dropoff: values.dropoff.text,
          date: formatDateFor(values.date, locale),
          time: values.time,
          count: values.passengers,
        }) +
        (estimate.status === "ready"
          ? ` ${t("quote.whatsapp.estimate", { total: estimate.quote.total.toFixed(2) })}`
          : "")
      : t("quote.whatsapp.default");
  const whatsappUrl = `${siteConfig.whatsapp.url}?text=${encodeURIComponent(whatsappText)}`;

  const canRequest = journeyCheck.ok && estimate.status !== "loading" && !noRoute;

  // The fade-in on scroll (data-reveal) is switched on by a script that adds a class to the element.
  // React rewrites `className` whenever it changes, which would wipe that class and hide the card
  // the moment it opens – so the fade-in lives on a wrapper whose class never changes.
  return (
    <div data-reveal style={{ ["--d" as string]: "640ms" }}>
    <section
      ref={rootRef}
      id="quote"
      className={`qc${opened ? " is-open" : ""}`}
      aria-label={t("quote.ariaLabel")}
      onFocusCapture={() => void loadRecaptcha()}
    >
      {/* ---- the bar: always visible ---- */}
      <div id="qc-bar-errors" className="qc__errs" role="alert">
        {barMessages.length > 0 && barMessages.join(" ")}
      </div>
      <form className="book qc__bar" onSubmit={getEstimate} noValidate>
        <div className={`book__field${errors.pickup ? " has-error" : ""}`}>
          <label htmlFor="qc-pickup">{t("quote.pickup")}</label>
          <PlaceInput
            key={`p${resetKey}`}
            id="qc-pickup"
            placeholder={t("quote.pickupPlaceholder")}
            onChange={(place) => set("pickup", place)}
            invalid={!!errors.pickup}
            describedBy="qc-bar-errors"
            dropUp
          />
        </div>
        <div className={`book__field${errors.dropoff ? " has-error" : ""}`}>
          <label htmlFor="qc-drop">{t("quote.dropoff")}</label>
          <PlaceInput
            key={`d${resetKey}`}
            id="qc-drop"
            placeholder={t("quote.dropoffPlaceholder")}
            onChange={(place) => set("dropoff", place)}
            invalid={!!errors.dropoff}
            describedBy="qc-bar-errors"
            dropUp
          />
        </div>
        <div className={`book__field book__field--sm${errors.date ? " has-error" : ""}`}>
          <label htmlFor="qc-date">{t("quote.date")}</label>
          <input
            id="qc-date"
            type="date"
            min={today || undefined}
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby="qc-bar-errors"
          />
        </div>
        <div className={`book__field book__field--xs${errors.time ? " has-error" : ""}`}>
          <label htmlFor="qc-time">{t("quote.time")}</label>
          <input
            id="qc-time"
            type="time"
            step={300}
            value={values.time}
            onChange={(e) => set("time", e.target.value)}
            aria-invalid={!!errors.time}
            aria-describedby="qc-bar-errors"
          />
        </div>
        <div className={`book__field book__field--xs${errors.passengers ? " has-error" : ""}`}>
          <label htmlFor="qc-pax">{t("quote.people")}</label>
          <select
            id="qc-pax"
            value={values.passengers}
            onChange={(e) => set("passengers", e.target.value)}
            aria-invalid={!!errors.passengers}
            aria-describedby="qc-bar-errors"
          >
            {Array.from({ length: pricingConfig.maxPassengers }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="book__submit">
          {t("quote.getEstimate")} <ArrowIcon width={20} height={20} />
        </button>
      </form>

      {/* ---- the card grows: estimate, then the request ---- */}
      <div className="qc__panel">
        <div className="qc__panelin" inert={!opened}>
          <div className="qc__body">
          {done ? (
            <BookingConfirmation data={done} onReset={reset} />
          ) : (
            <div className="qc__grid">
              <div className="qc__est">
                <EstimateCard state={shownEstimate} />
              </div>

              <div className="qc__side">
                <div className="qc__return">
                  <label className="bf-check">
                    <input
                      type="checkbox"
                      checked={values.wantReturn}
                      onChange={(e) => set("wantReturn", e.target.checked)}
                    />
                    <span>{t("quote.wantReturn")}</span>
                  </label>
                  {values.wantReturn && (
                    <div className="bf-row bf-row--2">
                      <div className={`bf${errors.returnDate ? " has-error" : ""}`}>
                        <label htmlFor="qc-rdate">{t("quote.returnDate")}</label>
                        <input
                          id="qc-rdate"
                          type="date"
                          min={values.date || today || undefined}
                          value={values.returnDate}
                          onChange={(e) => set("returnDate", e.target.value)}
                          aria-invalid={!!errors.returnDate}
                          aria-describedby={err("returnDate")}
                        />
                        <Err k="returnDate" />
                      </div>
                      <div className={`bf${errors.returnTime ? " has-error" : ""}`}>
                        <label htmlFor="qc-rtime">{t("quote.returnTime")}</label>
                        <input
                          id="qc-rtime"
                          type="time"
                          step={300}
                          value={values.returnTime}
                          onChange={(e) => set("returnTime", e.target.value)}
                          aria-invalid={!!errors.returnTime}
                          aria-describedby={err("returnTime")}
                        />
                        <Err k="returnTime" />
                      </div>
                    </div>
                  )}
                </div>

                {!requestOpen ? (
                  <div className="qc__cta">
                    <h3 className="qc__h">{t("quote.cta.title")}</h3>
                    <p>{t("quote.cta.text")}</p>
                    <button
                      type="button"
                      className="btn btn--ink btn--lg"
                      onClick={openRequest}
                      disabled={!canRequest}
                    >
                      {t("quote.cta.request")} <ArrowIcon width={20} height={20} />
                    </button>
                    <div className="qc__alt">
                      <a className="btn btn--wa btn--sm" href={whatsappUrl}>
                        <WhatsAppIcon width={18} height={18} />
                        {t("quote.cta.whatsapp")}
                      </a>
                      <a className="btn btn--ghost-l btn--sm" href={`tel:${siteConfig.phone.tel}`}>
                        <PhoneIcon width={16} height={16} />
                        {t("quote.cta.call", { phone: siteConfig.phone.display })}
                      </a>
                    </div>
                  </div>
                ) : (
                  <form className="qc__request" onSubmit={sendRequest} noValidate>
                    <h3 className="qc__h">{t("quote.details.title")}</h3>
                    <p className="qc__acct">
                      {account
                        ? withNodes(t("quote.details.signedIn", { email: account.email }), {
                            link: <Link href="/account">{t("quote.details.signedInLink")}</Link>,
                          })
                        : withNodes(t("quote.details.guest"), {
                            link: <Link href="/account">{t("quote.details.guestLink")}</Link>,
                          })}
                    </p>

                    <div className={`bf${errors.name ? " has-error" : ""}`}>
                      <label htmlFor="qc-name">{t("quote.details.name")}</label>
                      <input
                        id="qc-name"
                        type="text"
                        autoComplete="name"
                        maxLength={BOOKING_LIMITS.name}
                        value={values.name}
                        onChange={(e) => set("name", e.target.value)}
                        aria-invalid={!!errors.name}
                        aria-describedby={err("name")}
                      />
                      <Err k="name" />
                    </div>
                    <div className="bf-row bf-row--2">
                      <div className={`bf${errors.email ? " has-error" : ""}`}>
                        <label htmlFor="qc-email">{t("quote.details.email")}</label>
                        <input
                          id="qc-email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          value={values.email}
                          onChange={(e) => set("email", e.target.value)}
                          aria-invalid={!!errors.email}
                          aria-describedby={err("email")}
                        />
                        <Err k="email" />
                      </div>
                      <div className={`bf${errors.phone ? " has-error" : ""}`}>
                        <label htmlFor="qc-phone">{t("quote.details.phone")}</label>
                        <input
                          id="qc-phone"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          value={values.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          aria-invalid={!!errors.phone}
                          aria-describedby={err("phone")}
                        />
                        <Err k="phone" />
                      </div>
                    </div>

                    <details
                      className="qc__more"
                      open={moreOpen}
                      onToggle={(e) => setMoreOpen((e.currentTarget as HTMLDetailsElement).open)}
                    >
                      <summary>{t("quote.more.summary")}</summary>
                      <div className="qc__morebody">
                        <div className="bf-row bf-row--2">
                          <div className="bf">
                            <label htmlFor="qc-vehicle">{t("quote.more.vehicle")}</label>
                            <select id="qc-vehicle" value={values.vehicle} onChange={(e) => set("vehicle", e.target.value)}>
                              {VEHICLE_OPTIONS.map((v) => (
                                <option key={v} value={v}>
                                  {v === "No preference" ? t("quote.vehicles.noPreference") : v}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="bf">
                            <label htmlFor="qc-luggage">{t("quote.more.luggage")}</label>
                            <select id="qc-luggage" value={values.luggage} onChange={(e) => set("luggage", e.target.value)}>
                              {LUGGAGE_OPTIONS.map((l) => (
                                <option key={l} value={l}>
                                  {t(`quote.luggageOptions.${LUGGAGE_KEYS[l]}`)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="bf-row bf-row--2">
                          <div className={`bf${errors.childSeats ? " has-error" : ""}`}>
                            <label htmlFor="qc-seats">{t("quote.more.childSeats")}</label>
                            <select
                              id="qc-seats"
                              value={values.childSeats}
                              onChange={(e) => set("childSeats", e.target.value)}
                              aria-invalid={!!errors.childSeats}
                              aria-describedby={err("childSeats")}
                            >
                              {Array.from({ length: MAX_CHILD_SEATS + 1 }, (_, i) => i).map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                            <Err k="childSeats" />
                          </div>
                          <div className={`bf${errors.flightNumber ? " has-error" : ""}`}>
                            <label htmlFor="qc-flight">{t("quote.more.flightNumber")}</label>
                            <input
                              id="qc-flight"
                              type="text"
                              autoComplete="off"
                              maxLength={BOOKING_LIMITS.flight}
                              placeholder={t("quote.more.flightPlaceholder")}
                              value={values.flightNumber}
                              onChange={(e) => set("flightNumber", e.target.value)}
                              aria-invalid={!!errors.flightNumber}
                              aria-describedby={err("flightNumber")}
                            />
                            <Err k="flightNumber" />
                          </div>
                        </div>
                        <div className={`bf${errors.notes ? " has-error" : ""}`}>
                          <label htmlFor="qc-notes">{t("quote.more.notes")}</label>
                          <textarea
                            id="qc-notes"
                            rows={3}
                            maxLength={BOOKING_LIMITS.notes}
                            placeholder={t("quote.more.notesPlaceholder")}
                            value={values.notes}
                            onChange={(e) => set("notes", e.target.value)}
                            aria-invalid={!!errors.notes}
                            aria-describedby={err("notes")}
                          />
                          <Err k="notes" />
                        </div>
                      </div>
                    </details>

                    {/* Honeypot – hidden from people; bots tend to fill it in. */}
                    <div className="cform__trap" aria-hidden="true">
                      <label htmlFor="qc-website">{t("quote.details.honeypot")}</label>
                      <input id="qc-website" ref={trapRef} type="text" tabIndex={-1} autoComplete="off" />
                    </div>

                    <div className={`bf${errors.terms ? " has-error" : ""}`}>
                      <label className="bf-check">
                        <input
                          id="qc-terms"
                          type="checkbox"
                          checked={values.terms}
                          onChange={(e) => set("terms", e.target.checked)}
                          aria-invalid={!!errors.terms}
                          aria-describedby={err("terms")}
                        />
                        <span>
                          {withNodes(t("quote.terms"), {
                            terms: (
                              <Link href="/terms" target="_blank">
                                {t("quote.termsLink")}
                              </Link>
                            ),
                            privacy: (
                              <Link href="/privacy" target="_blank">
                                {t("quote.privacyLink")}
                              </Link>
                            ),
                          })}
                        </span>
                      </label>
                      <Err k="terms" />
                    </div>

                    {note && (
                      <p className="bf__alert" role="alert">
                        {note}
                      </p>
                    )}

                    <div className="qc__send">
                      <button type="submit" className="btn btn--ink btn--lg" disabled={sending}>
                        {sending ? t("quote.sending") : t("quote.send")}
                        {!sending && <ArrowIcon width={20} height={20} />}
                      </button>
                      <button type="button" className="qc__back" onClick={() => setRequestOpen(false)}>
                        {t("quote.back")}
                      </button>
                    </div>
                    <p className="bf__fine">
                      {rich(t("quote.fine"))}
                    </p>
                  </form>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      <noscript>
        <p className="qc__errs">
          {t("quote.noscript", { phone: siteConfig.phone.display })}
        </p>
      </noscript>
    </section>
    </div>
  );
}
