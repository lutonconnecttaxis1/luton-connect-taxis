export type RateBand = { base: number; perMile: number };

/** The parts of config/pricing.ts the calculation needs. */
export type PricingRules = {
  dayWindow: { start: string; end: string };
  day: RateBand;
  night: RateBand;
  alwaysNightFromPassengers: number;
  maxPassengers: number;
  milesDecimals: number;
};

/** The parts of config/congestion.ts the calculation needs. */
export type CongestionRules = {
  charge: number;
  weekday: { days: readonly number[]; start: string; end: string };
  weekendAndBankHoliday: { start: string; end: string };
  christmasExemption: boolean;
};

export type AirportFeeRow = {
  id: string;
  name: string;
  dropoff: number | null;
  pickup: number | null;
};

export type EstimateInput = {
  /** Driving distance in miles (from the Routes API). */
  miles: number;
  /** Estimated driving time, used for the Congestion Charge hours check. */
  durationMinutes: number;
  /** London wall-clock pickup, "YYYY-MM-DD" and "HH:MM". */
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  /** Ids from config/airports.ts, or null when the end is not an airport. */
  pickupAirportId: string | null;
  dropoffAirportId: string | null;
  /** Pickup, drop-off or route is inside the Congestion Charge zone. */
  inCongestionZone: boolean;
};

export type EstimateLineKey = "base" | "mileage" | "airport-dropoff" | "airport-pickup" | "congestion";

export type EstimateLine = {
  key: EstimateLineKey;
  label: string;
  /** £, or null when the amount is not known yet ("confirmed on quote"). */
  amount: number | null;
  detail?: string;
  /**
   * Language-neutral values behind `label` / `detail`, so the page can show the
   * line in the visitor's language. mileage: { miles, rate: "£2.40" };
   * airport lines: { airport: name }.
   */
  params?: Record<string, string | number>;
};

export type BandCode = "passengers" | "day" | "night";
export type CongestionReasonCode = "outside-zone" | "in-charging-hours" | "outside-hours";

export type Estimate = {
  ok: true;
  band: "day" | "night";
  bandReason: string;
  /** Language-neutral version of `bandReason`: which sentence, and its values. */
  bandCode: BandCode;
  /** passengers: { passengers }; day: { start, end }; night: { start, end }. */
  bandParams: Record<string, string | number>;
  /** Miles after rounding – the figure the fare is based on. */
  miles: number;
  lines: EstimateLine[];
  /** £ total of every line with a known amount. */
  total: number;
  /** True when at least one fee is "confirmed on quote", so the total is a minimum. */
  hasPendingFees: boolean;
  congestion: {
    inZone: boolean;
    applies: boolean;
    reason: string;
    /** Language-neutral version of `reason`. */
    reasonCode: CongestionReasonCode;
    /** outside-hours: { day: "weekdays" | "weekends" | "bank holidays" }. */
    reasonParams: Record<string, string | number>;
  };
};

export type EstimateFailure = {
  ok: false;
  reason: "too-many-passengers" | "invalid-input";
  message: string;
};

export type EstimateResult = Estimate | EstimateFailure;
