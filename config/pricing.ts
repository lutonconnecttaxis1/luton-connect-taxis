/**
 * Fare rates – editable by a developer without touching the pricing logic.
 * Source: client-supplied pricing rules, 4 Oct 2026 (PROJECT_CONTEXT.md §6).
 *
 * fare = base + (perMile × miles)
 *  - Day:   06:00–23:00, 1–4 passengers
 *  - Night: 23:00–06:00, 1–4 passengers
 *  - 5–6 passengers ALWAYS use the night rate (24 hours)
 * Extras (airport fees, congestion charge) are added afterwards.
 *
 * The calculation itself lives in lib/pricing/calculateEstimate.ts (milestone 3).
 */
export const pricingConfig = {
  timezone: "Europe/London",
  currency: "GBP",
  /** Pickup times from `start` (inclusive) to `end` (exclusive) use the day rate. */
  dayWindow: { start: "06:00", end: "23:00" },
  day: { base: 8.0, perMile: 2.4 },
  night: { base: 10.0, perMile: 3.0 },
  /** Groups of this size or larger always get the night rate, any time of day. */
  alwaysNightFromPassengers: 5,
  maxPassengers: 6,
  /** Miles are rounded to this many decimals before pricing; totals are exact to the penny. (Assumed – client to confirm.) */
  milesDecimals: 1,
  /** Above this, the site asks the customer to call for a quote instead of estimating. */
  maxEstimateMiles: 500,
  /** Earliest pickup, measured from "now" in London time. Same-day urgent trips: call us. (Assumed – client to confirm.) */
  minLeadMinutes: 60,
  /** Furthest ahead a booking can be requested. */
  maxAdvanceDays: 365,
  /** Shown beside every estimate. */
  disclaimer:
    "This is not a fixed price. Contact us on WhatsApp, email or phone to confirm your quote.",
  /** Notice shown on every estimate – these charges are NOT calculated. */
  chargesNotice: {
    short: "Excluding Dart charges",
    long: [
      "Dartford Crossing: The applicable Dart Charge will be added.",
      "Tolls & Bridges: Any other route toll charges will be added to the final fare.",
    ],
    /** Client-supplied; verify current rates before launch. */
    crossings: [
      {
        name: "Dartford Crossing (M25, River Thames)",
        charge: "£3.50 per crossing (standard car, pay-as-you-go)",
        when: "Every day 06:00–22:00 (free 22:00–06:00), charged per crossing in each direction",
      },
      {
        name: "Blackwall & Silvertown Tunnels (East London)",
        charge: "Up to £4.20 (peak / standard)",
        when: "06:00–22:00, 7 days a week (free overnight)",
      },
    ],
  },
} as const;
