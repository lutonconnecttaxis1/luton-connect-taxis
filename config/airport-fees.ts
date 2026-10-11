/**
 * Airport drop-off / pickup fees, added to the total fare.
 * Source: client screenshots (saved in /reference). 4 Oct 2026.
 *
 * `null` = no fee is known. Until it is filled in, the estimate says
 * "airport fee confirmed on quote" for that airport (only London City is left like this).
 *
 * DECISION 10 Oct 2026 (owner): where the client's tables give only one direction,
 * the same figure is used for the other (Luton/Heathrow/Gatwick pickup = their
 * drop-off fee; Bristol/East Midlands/Glasgow drop-off = their pickup fee;
 * Manchester £5–£6 → £6). Replace with the client's real figures when supplied.
 *
 * ⚠ UNCONFIRMED: the second screenshot's header was cut off. It is read as the
 * PICKUP charge plus free waiting time. Confirm with the client before relying on it.
 */
export type AirportFee = {
  id: string;
  name: string;
  /** £ added when a journey ENDS at this airport */
  dropoff: number | null;
  /** £ added when a journey STARTS at this airport */
  pickup: number | null;
  /** Free waiting minutes included with a pickup */
  freeWaitMinutes: number | null;
  note?: string;
};

export const airportFees: AirportFee[] = [
  { id: "gatwick", name: "London Gatwick", dropoff: 10, pickup: 10, freeWaitMinutes: null },
  { id: "heathrow", name: "London Heathrow", dropoff: 7, pickup: 7, freeWaitMinutes: null },
  { id: "luton", name: "London Luton", dropoff: 9, pickup: 9, freeWaitMinutes: null },
  {
    id: "manchester",
    name: "Manchester",
    dropoff: 6,
    pickup: 6,
    freeWaitMinutes: null,
    note: "Client table shows £5.00 to £6.00 – the upper figure is used until the client picks one.",
  },
  { id: "stansted", name: "Stansted", dropoff: 7, pickup: 10, freeWaitMinutes: null },
  { id: "birmingham", name: "Birmingham", dropoff: 5, pickup: 5, freeWaitMinutes: 15 },
  { id: "edinburgh", name: "Edinburgh", dropoff: 5, pickup: 5, freeWaitMinutes: 10 },
  { id: "bristol", name: "Bristol", dropoff: 6, pickup: 6, freeWaitMinutes: 10 },
  { id: "east-midlands", name: "East Midlands", dropoff: 8, pickup: 8, freeWaitMinutes: 10 },
  { id: "glasgow", name: "Glasgow", dropoff: 7, pickup: 7, freeWaitMinutes: 15 },
  {
    id: "london-city",
    name: "London City",
    dropoff: null,
    pickup: null,
    freeWaitMinutes: null,
    note: "Key route but not in the client's tables – fee needed.",
  },
];
