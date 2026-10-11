"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/i18n/Link";
import { useMessageTranslator, useT } from "@/components/i18n/I18nProvider";
import {
  validateLogin,
  validateRegister,
  validateResetEmail,
  type AccountUser,
  type LoginErrors,
  type RegisterErrors,
} from "@/lib/account";
import { getRecaptchaToken, loadRecaptcha } from "@/lib/recaptcha-client";
import { AccountDashboard } from "./AccountDashboard";
import { announceAuthChange, postJson, useAccountMessage, type Reply } from "./api";
import { fill } from "./fill";

type Tab = "signin" | "register" | "reset";
/** Everything on /account: sign in, create an account, reset a password, or – once signed in – the dashboard. */
export function AccountApp() {
  const t = useT();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("signin");

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab");
    if (wanted === "register" || wanted === "reset") setTab(wanted);
    let cancelled = false;
    fetch("/api/account/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Reply) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function signedIn(next: AccountUser) {
    setUser(next);
    announceAuthChange();
  }

  if (!checked) {
    return (
      <div className="acct__loading" role="status">
        <span className="est__bar" />
        <span className="est__bar est__bar--short" />
        <span className="sr-only">{t("account.loading.checking")}</span>
      </div>
    );
  }

  if (user) {
    return (
      <AccountDashboard
        user={user}
        onUserChange={setUser}
        onSignedOut={() => {
          setUser(null);
          setTab("signin");
          announceAuthChange();
        }}
      />
    );
  }

  return (
    <div className="acct__guest" onFocusCapture={() => void loadRecaptcha()}>
      <div className="acct__tabs" role="group" aria-label={t("account.tabs.label")}>
        <button type="button" aria-pressed={tab === "signin"} onClick={() => setTab("signin")}>
          {t("account.tabs.signin")}
        </button>
        <button type="button" aria-pressed={tab === "register"} onClick={() => setTab("register")}>
          {t("account.tabs.register")}
        </button>
      </div>

      {tab === "signin" && <SignInForm onSignedIn={signedIn} onForgot={() => setTab("reset")} />}
      {tab === "register" && <RegisterForm onSignedIn={signedIn} />}
      {tab === "reset" && <ResetForm onBack={() => setTab("signin")} />}

      <p className="acct__guestnote">
        {fill(t.raw<string>("account.guestNote"), {
          link: <Link href="/#quote">{t("account.guestNoteLink")}</Link>,
        })}
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  const tm = useMessageTranslator();
  return (
    <div className={`bf${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="bf__opt"> ({t("account.optional")})</span>}
      </label>
      {children}
      {error && (
        <p className="bf__err" id={`${id}-err`}>
          {tm(error)}
        </p>
      )}
    </div>
  );
}

/** Hidden field that only bots fill in. */
function Trap() {
  const t = useT();
  return (
    <div className="cform__trap" aria-hidden="true">
      <label>
        {t("account.trap")}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

function SignInForm({ onSignedIn, onForgot }: { onSignedIn: (u: AccountUser) => void; onForgot: () => void }) {
  const t = useT();
  const message = useAccountMessage();
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const check = validateLogin(values);
    if (!check.ok) {
      setErrors(check.errors);
      setNote("");
      form.current?.querySelector<HTMLElement>(check.errors.email ? "#acct-email" : "#acct-password")?.focus();
      return;
    }
    setErrors({});
    setNote("");
    setBusy(true);
    try {
      const { data } = await postJson("/api/account/login", check.data);
      if (data.ok && data.user) return onSignedIn(data.user);
      if (data.errors) setErrors(data.errors);
      setNote(message(data.error, data.hint));
    } catch {
      setNote(t("account.errors.network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={form} className="acct__form" onSubmit={submit} noValidate>
      <h2 className="acct__h">{t("account.signin.title")}</h2>
      {note && (
        <p className="bf__alert" role="alert">
          {note}
        </p>
      )}
      <Field id="acct-email" label={t("account.fields.email")} error={errors.email}>
        <input id="acct-email" name="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "acct-email-err" : undefined} />
      </Field>
      <Field id="acct-password" label={t("account.fields.password")} error={errors.password}>
        <input id="acct-password" name="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "acct-password-err" : undefined} />
      </Field>
      <div className="acct__actions">
        <button className="btn btn--ink btn--lg" type="submit" disabled={busy}>
          {busy ? t("account.signin.busy") : t("account.signin.submit")}
        </button>
        <button type="button" className="acct__link" onClick={onForgot}>
          {t("account.signin.forgot")}
        </button>
      </div>
    </form>
  );
}

function RegisterForm({ onSignedIn }: { onSignedIn: (u: AccountUser) => void }) {
  const t = useT();
  const tm = useMessageTranslator();
  const message = useAccountMessage();
  const form = useRef<HTMLFormElement>(null);
  const openedAt = useRef(0);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const entries = Object.fromEntries(new FormData(event.currentTarget).entries());
    const values = { ...entries, termsAccepted: entries.terms === "on" };
    const check = validateRegister(values);
    if (!check.ok) {
      setErrors(check.errors);
      setNote("");
      const first = (["name", "email", "phone", "password", "terms"] as const).find((k) => check.errors[k]);
      if (first) form.current?.querySelector<HTMLElement>(`#acct-r-${first}`)?.focus();
      return;
    }
    setErrors({});
    setNote("");
    setBusy(true);
    try {
      const recaptchaToken = await getRecaptchaToken("register");
      const { data } = await postJson("/api/account/register", {
        ...check.data,
        termsAccepted: true,
        website: entries.website ?? "",
        openedAt: openedAt.current,
        recaptchaToken,
      });
      if (data.ok && data.user) return onSignedIn(data.user);
      if (data.errors) setErrors(data.errors);
      setNote(message(data.error, data.hint));
    } catch {
      setNote(t("account.errors.network"));
    } finally {
      setBusy(false);
    }
  }

  const describe = (k: keyof RegisterErrors) => (errors[k] ? `acct-r-${k}-err` : undefined);

  return (
    <form ref={form} className="acct__form" onSubmit={submit} noValidate>
      <h2 className="acct__h">{t("account.register.title")}</h2>
      {note && (
        <p className="bf__alert" role="alert">
          {note}
        </p>
      )}
      <Trap />
      <Field id="acct-r-name" label={t("account.fields.name")} error={errors.name}>
        <input id="acct-r-name" name="name" type="text" autoComplete="name" maxLength={100} aria-invalid={!!errors.name} aria-describedby={describe("name")} />
      </Field>
      <div className="bf-row bf-row--2">
        <Field id="acct-r-email" label={t("account.fields.email")} error={errors.email}>
          <input id="acct-r-email" name="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} aria-describedby={describe("email")} />
        </Field>
        <Field id="acct-r-phone" label={t("account.fields.phone")} optional error={errors.phone}>
          <input id="acct-r-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" aria-invalid={!!errors.phone} aria-describedby={describe("phone")} />
        </Field>
      </div>
      <Field id="acct-r-password" label={t("account.fields.password")} error={errors.password}>
        <input id="acct-r-password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={describe("password")} />
      </Field>
      <p className="bf__hint">{t("account.register.passwordHint")}</p>
      <div className={`bf${errors.terms ? " has-error" : ""}`}>
        <label className="bf-check">
          <input id="acct-r-terms" name="terms" type="checkbox" aria-invalid={!!errors.terms} aria-describedby={describe("terms")} />
          <span>
            {fill(t.raw<string>("account.register.agree"), {
              terms: (
                <Link href="/terms" target="_blank">
                  {t("account.links.terms")}
                </Link>
              ),
              privacy: (
                <Link href="/privacy" target="_blank">
                  {t("account.links.privacy")}
                </Link>
              ),
            })}
          </span>
        </label>
        {errors.terms && (
          <p className="bf__err" id="acct-r-terms-err">
            {tm(errors.terms)}
          </p>
        )}
      </div>
      <div className="acct__actions">
        <button className="btn btn--ink btn--lg" type="submit" disabled={busy}>
          {busy ? t("account.register.busy") : t("account.register.submit")}
        </button>
      </div>
      <p className="bf__fine">{t("account.register.fine")}</p>
    </form>
  );
}

function ResetForm({ onBack }: { onBack: () => void }) {
  const t = useT();
  const message = useAccountMessage();
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const entries = Object.fromEntries(new FormData(event.currentTarget).entries());
    const check = validateResetEmail(entries);
    if (!check.ok) {
      setError(check.errors.email ?? "");
      return;
    }
    setError("");
    setNote("");
    setBusy(true);
    try {
      const { data } = await postJson("/api/account/reset", { ...check.data, website: entries.website ?? "", openedAt: openedAt.current });
      if (data.ok) setSentTo(check.data.email);
      else setNote(message(data.error, data.hint));
    } catch {
      setNote(t("account.errors.network"));
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="acct__form" role="status">
        <h2 className="acct__h">{t("account.reset.sentTitle")}</h2>
        <p>{fill(t.raw<string>("account.reset.sentBody"), { email: <strong>{sentTo}</strong> })}</p>
        <div className="acct__actions">
          <button type="button" className="btn btn--ink btn--lg" onClick={onBack}>
            {t("account.reset.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="acct__form" onSubmit={submit} noValidate>
      <h2 className="acct__h">{t("account.reset.title")}</h2>
      <p>{t("account.reset.intro")}</p>
      {note && (
        <p className="bf__alert" role="alert">
          {note}
        </p>
      )}
      <Trap />
      <Field id="acct-reset-email" label={t("account.fields.email")} error={error}>
        <input id="acct-reset-email" name="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!error} aria-describedby={error ? "acct-reset-email-err" : undefined} />
      </Field>
      <div className="acct__actions">
        <button className="btn btn--ink btn--lg" type="submit" disabled={busy}>
          {busy ? t("account.reset.busy") : t("account.reset.submit")}
        </button>
        <button type="button" className="acct__link" onClick={onBack}>
          {t("account.reset.back")}
        </button>
      </div>
    </form>
  );
}
