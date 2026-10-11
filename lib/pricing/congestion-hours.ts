import { addDays, toMinutes, weekdayOf } from "./dates";
import type { CongestionRules } from "./types";

type Window = readonly [startMinute: number, endMinute: number];

/** Charging window for one calendar day, or null when the charge does not run. */
export function chargingWindowFor(
  date: string,
  rules: CongestionRules,
  holidays: Readonly<Record<string, string>>,
): Window | null {
  if (rules.christmasExemption) {
    const [, month, day] = date.split("-").map(Number);
    if ((month === 12 && day >= 25) || (month === 1 && day === 1)) return null;
  }
  const weekday = weekdayOf(date);
  const isHoliday = date in holidays;
  if (!isHoliday && rules.weekday.days.includes(weekday)) {
    return [toMinutes(rules.weekday.start), toMinutes(rules.weekday.end)];
  }
  return [toMinutes(rules.weekendAndBankHoliday.start), toMinutes(rules.weekendAndBankHoliday.end)];
}

/**
 * True when the journey [pickup, pickup + duration] overlaps charging hours.
 * A journey that runs past midnight is checked against the next day too.
 */
export function overlapsChargingHours(
  date: string,
  time: string,
  durationMinutes: number,
  rules: CongestionRules,
  holidays: Readonly<Record<string, string>>,
): boolean {
  const start = toMinutes(time);
  const end = start + Math.max(durationMinutes, 1);

  const today = chargingWindowFor(date, rules, holidays);
  if (today && start < today[1] && end > today[0]) return true;

  if (end > 1440) {
    const tomorrow = chargingWindowFor(addDays(date, 1), rules, holidays);
    if (tomorrow && start < 1440 + tomorrow[1] && end > 1440 + tomorrow[0]) return true;
  }
  return false;
}
