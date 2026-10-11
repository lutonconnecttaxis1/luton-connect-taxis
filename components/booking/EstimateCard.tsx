"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { rich } from "@/lib/i18n/rich";
import type { Quote } from "@/lib/quote";
import type { Estimate, EstimateLine } from "@/lib/pricing/types";

export type EstimateState =
  | { status: "idle"; hint?: string }
  | { status: "loading" }
  | { status: "ready"; quote: Quote }
  | { status: "error"; message: string };

const gbp = (n: number) => `£${n.toFixed(2)}`;

/** "bank holidays" → "bankHolidays" (the key of the translated word). */
const DAY_KIND_KEYS: Record<string, string> = {
  weekdays: "weekdays",
  weekends: "weekends",
  "bank holidays": "bankHolidays",
};

function Leg({ title, est }: { title?: string; est: Estimate }) {
  const t = useT();

  // Each piece of text comes from the `estimate.*` messages, chosen by the engine's codes.
  // If a code is unknown (an older saved estimate), the engine's English text is shown instead.
  // The base fare, the mileage and the day/night rate note are part of the total but are not
  // itemised for the customer – only the extras (airport fees, Congestion Charge) are listed.
  const extras = est.lines.filter((line) => line.key !== "base" && line.key !== "mileage");
  const lineLabel = (line: EstimateLine) =>
    t.has(`estimate.lines.${line.key}`) ? t(`estimate.lines.${line.key}`, line.params) : line.label;
  const lineDetail = (line: EstimateLine) =>
    t.has(`estimate.details.${line.key}`) && (line.params || line.key === "congestion")
      ? t(`estimate.details.${line.key}`, line.params)
      : line.detail;

  let congestionText: string = est.congestion.reason;
  if (est.congestion.reasonCode && t.has(`estimate.congestion.${est.congestion.reasonCode}`)) {
    const day = String(est.congestion.reasonParams?.day ?? "");
    const dayKey = DAY_KIND_KEYS[day];
    congestionText = t(`estimate.congestion.${est.congestion.reasonCode}`, {
      day: dayKey ? t(`estimate.dayKinds.${dayKey}`) : day,
    });
  }

  return (
    <section className="est__leg">
      {title && <h3 className="est__legtitle">{title}</h3>}
      {extras.length > 0 && (
        <dl className="est__lines">
          {extras.map((line) => (
            <div key={line.key + line.label}>
              <dt>
                {lineLabel(line)}
                {line.detail && line.amount !== null && <span className="est__detail">{lineDetail(line)}</span>}
              </dt>
              <dd className={line.amount === null ? "est__pending" : undefined}>
                {line.amount === null ? t("estimate.confirmedOnQuote") : gbp(line.amount)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {est.congestion.inZone && !est.congestion.applies && <p className="est__small">{congestionText}</p>}
    </section>
  );
}

/** The live price panel. Always carries the "not a fixed price" wording. */
export function EstimateCard({ state, compact = false }: { state: EstimateState; compact?: boolean }) {
  const t = useT();
  const crossings = t.raw<Array<{ name: string; charge: string; when: string }> | undefined>(
    "estimate.charges.crossings",
  );

  return (
    <div className={`est${compact ? " est--compact" : ""}`} aria-live="polite">
      <p className="est__label">{t("estimate.label")}</p>

      {state.status === "idle" && <p className="est__empty">{state.hint ?? t("estimate.hint")}</p>}

      {state.status === "loading" && (
        <div className="est__loading" role="status">
          <span className="est__bar" />
          <span className="est__bar est__bar--short" />
          <span className="sr-only">{t("estimate.loading")}</span>
        </div>
      )}

      {state.status === "error" && <p className="est__error">{state.message}</p>}

      {state.status === "ready" && (
        <>
          <p className="est__total">
            {gbp(state.quote.total)}
            {state.quote.hasPendingFees && <span className="est__plus">{t("estimate.pendingFee")}</span>}
          </p>
          <p className="est__meta">
            {t(state.quote.returnLeg ? "estimate.metaReturn" : "estimate.meta", {
              miles: state.quote.miles,
              minutes: state.quote.durationMinutes,
            })}
          </p>
          <Leg title={state.quote.returnLeg ? t("estimate.outbound") : undefined} est={state.quote.outbound} />
          {state.quote.returnLeg && <Leg title={t("estimate.return")} est={state.quote.returnLeg} />}
          {state.quote.returnLeg && (
            <p className="est__sum">{rich(t("estimate.both", { total: gbp(state.quote.total) }))}</p>
          )}
        </>
      )}

      <p className="est__disclaimer">{rich(t("estimate.disclaimer"))}</p>
      <details className="est__more">
        <summary>{t("estimate.charges.short")}</summary>
        <ul>
          {t.list("estimate.charges.long").map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="est__small">{t("estimate.charges.known")}</p>
        <ul>
          {(Array.isArray(crossings) ? crossings : []).map((c) => (
            <li key={c.name}>{rich(t("estimate.charges.crossingFormat", c))}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
