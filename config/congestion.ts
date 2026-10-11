/**
 * London Congestion Charge – calculated and added to the estimate when the
 * journey is in the zone during charging hours.
 * Source: client-supplied, 4 Oct 2026. Verify the current TfL rate and the
 * Christmas/New Year exemption before launch.
 *
 * Zone boundary: config/congestion-zone.ts – an APPROXIMATE outline traced from
 * the client's map (reference/congestion-charge-zone-map.png). Replace it with
 * TfL's official boundary file before launch (milestone 7).
 */
export const congestionConfig = {
  charge: 18.0,
  /** 24-hour "HH:MM", Europe/London time */
  weekday: { days: [1, 2, 3, 4, 5], start: "07:00", end: "18:00" }, // Mon–Fri
  weekendAndBankHoliday: { start: "12:00", end: "18:00" }, // Sat, Sun, bank holidays
  /** Charged once per journey, however many times it enters the zone. */
  chargedOncePerJourney: true,
  /**
   * TfL does not run the charge between 25 December and 1 January (inclusive).
   * Off until the client confirms they want it applied (open item, PROJECT_CONTEXT §6.7).
   */
  christmasExemption: false,
} as const;
