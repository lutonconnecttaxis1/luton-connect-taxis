/**
 * Bank holidays in England & Wales – used for the Congestion Charge hours
 * (bank holidays use the weekend hours).
 * Source: https://www.gov.uk/bank-holidays/england-and-wales.json, checked 5 Oct 2026.
 *
 * ⚠ Add the next years before this list runs out (the site shows a warning in the
 * server log once a booking date is past the last year listed). Before launch,
 * milestone 7 can refresh this list automatically from the GOV.UK feed.
 */
export const bankHolidays: Readonly<Record<string, string>> = {
  "2026-01-01": "New Year’s Day",
  "2026-04-03": "Good Friday",
  "2026-04-06": "Easter Monday",
  "2026-05-04": "Early May bank holiday",
  "2026-05-25": "Spring bank holiday",
  "2026-08-31": "Summer bank holiday",
  "2026-12-25": "Christmas Day",
  "2026-12-28": "Boxing Day (substitute)",

  "2027-01-01": "New Year’s Day",
  "2027-03-26": "Good Friday",
  "2027-03-29": "Easter Monday",
  "2027-05-03": "Early May bank holiday",
  "2027-05-31": "Spring bank holiday",
  "2027-08-30": "Summer bank holiday",
  "2027-12-27": "Christmas Day (substitute)",
  "2027-12-28": "Boxing Day (substitute)",

  "2028-01-03": "New Year’s Day (substitute)",
  "2028-04-14": "Good Friday",
  "2028-04-17": "Easter Monday",
  "2028-05-01": "Early May bank holiday",
  "2028-05-29": "Spring bank holiday",
  "2028-08-28": "Summer bank holiday",
  "2028-12-25": "Christmas Day",
  "2028-12-26": "Boxing Day",
};

export const bankHolidaysLastYear = 2028;
