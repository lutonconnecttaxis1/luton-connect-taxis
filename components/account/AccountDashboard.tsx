"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useMessageTranslator, useT } from "@/components/i18n/I18nProvider";
import { Link } from "@/components/i18n/Link";
import { PhoneIcon, WhatsAppIcon } from "@/components/home/icons";
import { siteConfig } from "@/config/site";
import { validateProfile, type AccountUser, type ProfileErrors } from "@/lib/account";
import { canAskForChanges, requestedOn, splitBookings, statusLabel, statusOf, whatsappLink } from "@/lib/account-view";
import type { MyBooking } from "@/lib/customers";
import { formatDateFor } from "@/lib/i18n/format";
import { postJson, useAccountMessage } from "./api";
import { fill } from "./fill";

const gbp = (n: number) => `£${n.toFixed(2)}`;

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; bookings: MyBooking[] };

type Props = {
  user: AccountUser;
  onUserChange: (user: AccountUser) => void;
  onSignedOut: () => void;
};

export function AccountDashboard({ user, onUserChange, onSignedOut }: Props) {
  const t = useT();
  const message = useAccountMessage();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [signingOut, setSigningOut] = useState(false);
  const signedOutRef = useRef(onSignedOut);
  signedOutRef.current = onSignedOut;
  // The words can change with the language, but reloading the bookings must not: keep them in a ref.
  const wordsRef = useRef({ t, message });
  wordsRef.current = { t, message };

  const loadBookings = useCallback(async () => {
    const { t, message } = wordsRef.current;
    setLoad({ status: "loading" });
    try {
      const res = await fetch("/api/account/bookings", { cache: "no-store" });
      const data: { ok?: boolean; error?: string; hint?: string; bookings?: MyBooking[] } = await res.json().catch(() => ({}));
      if (res.status === 401) return signedOutRef.current();
      if (data.ok && data.bookings) setLoad({ status: "ready", bookings: data.bookings });
      else setLoad({ status: "error", message: message(data.error ?? "storage-unavailable", data.hint) });
    } catch {
      setLoad({ status: "error", message: t("account.errors.network") });
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  async function signOut() {
    setSigningOut(true);
    try {
      await postJson("/api/account/logout", {});
    } finally {
      onSignedOut();
    }
  }

  const first = user.name.split(" ")[0] || t("account.dashboard.helloFallback");

  return (
    <div className="acct">
      <div className="acct__top">
        <div>
          <p className="eyebrow">{t("account.dashboard.eyebrow")}</p>
          <h2 className="acct__hello">{t("account.dashboard.hello", { name: first })}</h2>
          <p className="acct__email">{user.email}</p>
        </div>
        <button type="button" className="btn btn--ghost-l btn--sm" onClick={signOut} disabled={signingOut}>
          {signingOut ? t("account.dashboard.signingOut") : t("account.dashboard.signOut")}
        </button>
      </div>

      <section aria-labelledby="acct-bookings" className="acct__block">
        <div className="acct__blockhead">
          <h3 id="acct-bookings" className="acct__h">
            {t("account.dashboard.bookings")}
          </h3>
          <Link className="btn btn--brand btn--sm" href="/#quote">
            {t("account.dashboard.book")}
          </Link>
        </div>

        {load.status === "loading" && (
          <div className="acct__loading" role="status">
            <span className="est__bar" />
            <span className="est__bar est__bar--short" />
            <span className="sr-only">{t("account.dashboard.loading")}</span>
          </div>
        )}
        {load.status === "error" && (
          <div>
            <p className="bf__alert" role="alert">
              {load.message}
            </p>
            <p>
              <button type="button" className="acct__link" onClick={() => void loadBookings()}>
                {t("account.dashboard.retry")}
              </button>
            </p>
          </div>
        )}
        {load.status === "ready" && <BookingLists bookings={load.bookings} />}
        <p className="bf__fine">{t("account.dashboard.fine")}</p>
      </section>

      <ProfileForm user={user} onSaved={onUserChange} />
      <DeleteAccount onDeleted={onSignedOut} />
    </div>
  );
}

function BookingLists({ bookings }: { bookings: MyBooking[] }) {
  const t = useT();
  if (bookings.length === 0) {
    return (
      <div className="acct__empty">
        <p className="acct__emptytitle">{t("account.empty.title")}</p>
        <p>{fill(t.raw<string>("account.empty.body"), { link: <Link href="/#quote">{t("account.empty.link")}</Link> })}</p>
      </div>
    );
  }
  const { upcoming, past } = splitBookings(bookings);
  return (
    <>
      {upcoming.length > 0 && (
        <div className="acct__group">
          <h4 className="acct__sub">{t("account.list.upcoming")}</h4>
          <ul className="acct__list">
            {upcoming.map((b) => (
              <BookingItem key={b.reference} booking={b} />
            ))}
          </ul>
        </div>
      )}
      {past.length > 0 && (
        <div className="acct__group">
          <h4 className="acct__sub">{upcoming.length > 0 ? t("account.list.earlier") : t("account.dashboard.bookings")}</h4>
          <ul className="acct__list">
            {past.map((b) => (
              <BookingItem key={b.reference} booking={b} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function BookingItem({ booking }: { booking: MyBooking }) {
  const t = useT();
  const locale = useLocale();
  const { journey, estimate, options } = booking;
  const status = statusOf(booking.status);
  const asked = canAskForChanges(booking);
  const requested = requestedOn(booking.createdAt, locale);
  const extras = [
    t(journey.passengers === 1 ? "account.item.personOne" : "account.item.personOther", { count: journey.passengers }),
    options.luggage,
    options.vehicle && options.vehicle !== "No preference" ? options.vehicle : "",
    options.childSeats
      ? t(options.childSeats === 1 ? "account.item.childSeatOne" : "account.item.childSeatOther", { count: options.childSeats })
      : "",
    options.flightNumber ? t("account.item.flight", { number: options.flightNumber }) : "",
  ].filter(Boolean);
  const legTitle = (kind: "journey" | "outbound" | "return") => t(`account.item.leg.${kind}`);

  return (
    <li className="acct__item">
      <div className="acct__itemtop">
        <span className="acct__ref">{booking.reference}</span>
        <span className={`acct__chip acct__chip--${status.tone}`}>{statusLabel(booking.status, t)}</span>
      </div>
      <p className="acct__route">
        {journey.pickup} <span aria-label={t("account.item.to")}>→</span> {journey.dropoff}
      </p>
      <p className="acct__when">
        {t("common.dateAt", { date: formatDateFor(journey.date, locale), time: journey.time })}
        {journey.returnTrip && (
          <>
            {" "}
            ·{" "}
            {t("account.item.return", {
              when: t("common.dateAt", { date: formatDateFor(journey.returnTrip.date, locale), time: journey.returnTrip.time }),
            })}
          </>
        )}
      </p>
      <p className="acct__meta">
        {extras.join(" · ")}
        {requested && <> · {t("account.item.requested", { date: requested })}</>}
      </p>
      {options.notes && <p className="acct__meta">{t("account.item.notes", { notes: options.notes })}</p>}

      {estimate ? (
        <details className="acct__fare">
          <summary>
            <span>
              {fill(t.raw<string>("account.item.estimate"), { total: <strong>{gbp(estimate.total)}</strong> })}
              {estimate.hasPendingFees && <span className="acct__plus"> {t("account.item.airportFee")}</span>}
            </span>
            <span className="acct__more">{t("account.item.breakdown")}</span>
          </summary>
          {estimate.legs.map((leg) => (
            <div key={leg.title} className="acct__leg">
              {estimate.legs.length > 1 && <p className="acct__legtitle">{legTitle(leg.kind)}</p>}
              {leg.band && <p className="acct__meta">{leg.band}</p>}
              <dl className="acct__lines">
                {leg.lines.map((line, i) => (
                  <div key={`${line.label}-${i}`}>
                    <dt>{line.label}</dt>
                    <dd>{line.amount === null ? t("account.item.onQuote") : gbp(line.amount)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <p className="acct__meta">{t("account.item.notFixed")}</p>
        </details>
      ) : (
        <p className="acct__meta">{t("account.item.noEstimate")}</p>
      )}

      {asked && (
        <div className="acct__actions acct__actions--row">
          <a className="btn btn--wa btn--sm" href={whatsappLink(booking, "change", t, locale)}>
            <WhatsAppIcon width={18} height={18} />
            {t("account.item.askChange")}
          </a>
          <a className="btn btn--ghost-l btn--sm" href={whatsappLink(booking, "cancel", t, locale)}>
            {t("account.item.askCancel")}
          </a>
          <a className="acct__call" href={`tel:${siteConfig.phone.tel}`}>
            <PhoneIcon width={16} height={16} />
            {siteConfig.phone.display}
          </a>
        </div>
      )}
    </li>
  );
}

function ProfileForm({ user, onSaved }: { user: AccountUser; onSaved: (u: AccountUser) => void }) {
  const t = useT();
  const tm = useMessageTranslator();
  const message = useAccountMessage();
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const check = validateProfile(Object.fromEntries(new FormData(event.currentTarget).entries()));
    setSaved(false);
    if (!check.ok) {
      setErrors(check.errors);
      setNote("");
      return;
    }
    setErrors({});
    setNote("");
    setBusy(true);
    try {
      const { data } = await postJson("/api/account/profile", check.data);
      if (data.ok && data.user) {
        onSaved(data.user);
        setSaved(true);
      } else {
        if (data.errors) setErrors(data.errors);
        setNote(message(data.error, data.hint));
      }
    } catch {
      setNote(t("account.errors.network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="acct-details" className="acct__block">
      <h3 id="acct-details" className="acct__h">
        {t("account.profile.title")}
      </h3>
      <p>{t("account.profile.intro")}</p>
      <form className="acct__form" onSubmit={submit} noValidate>
        {note && (
          <p className="bf__alert" role="alert">
            {note}
          </p>
        )}
        <div className="bf-row bf-row--2">
          <div className={`bf${errors.name ? " has-error" : ""}`}>
            <label htmlFor="acct-p-name">{t("account.profile.name")}</label>
            <input id="acct-p-name" name="name" type="text" autoComplete="name" defaultValue={user.name} maxLength={100} aria-invalid={!!errors.name} />
            {errors.name && <p className="bf__err">{tm(errors.name)}</p>}
          </div>
          <div className={`bf${errors.phone ? " has-error" : ""}`}>
            <label htmlFor="acct-p-phone">{t("account.fields.phone")}</label>
            <input id="acct-p-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={user.phone} aria-invalid={!!errors.phone} />
            {errors.phone && <p className="bf__err">{tm(errors.phone)}</p>}
          </div>
        </div>
        <div className="bf">
          <label htmlFor="acct-p-email">{t("account.profile.email")}</label>
          <input id="acct-p-email" type="email" value={user.email} readOnly aria-readonly="true" />
        </div>
        <div className="acct__actions acct__actions--row">
          <button className="btn btn--ink btn--sm" type="submit" disabled={busy}>
            {busy ? t("account.profile.saving") : t("account.profile.save")}
          </button>
          {saved && (
            <span className="acct__saved" role="status">
              {t("account.profile.saved")}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const t = useT();
  const tm = useMessageTranslator();
  const message = useAccountMessage();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (!password) {
      setError(t("validation.account.passwordConfirm"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      const { data } = await postJson("/api/account/delete", { password });
      if (data.ok) return onDeleted();
      setError(
        data.error === "invalid-credentials"
          ? t("account.delete.wrongPassword")
          : data.errors?.password ? tm(data.errors.password) : message(data.error, data.hint),
      );
    } catch {
      setError(t("account.errors.network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="acct-delete" className="acct__block acct__block--quiet">
      <details className="acct__danger">
        <summary id="acct-delete">{t("account.delete.summary")}</summary>
        <p>
          {fill(t.raw<string>("account.delete.body"), {
            privacy: <Link href="/privacy">{t("account.links.privacy")}</Link>,
            phone: siteConfig.phone.display,
          })}
        </p>
        <form className="acct__form" onSubmit={submit} noValidate>
          <div className={`bf${error ? " has-error" : ""}`}>
            <label htmlFor="acct-d-password">{t("account.delete.label")}</label>
            <input id="acct-d-password" name="password" type="password" autoComplete="current-password" aria-invalid={!!error} aria-describedby={error ? "acct-d-err" : undefined} />
            {error && (
              <p className="bf__err" id="acct-d-err" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="acct__actions acct__actions--row">
            <button className="btn btn--danger btn--sm" type="submit" disabled={busy}>
              {busy ? t("account.delete.busy") : t("account.delete.submit")}
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}
