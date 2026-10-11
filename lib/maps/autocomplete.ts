/**
 * Address suggestions from Google Places Autocomplete (New), called straight
 * from the browser with the REFERRER-RESTRICTED browser key
 * (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY). No Google script is loaded.
 */
export type Suggestion = {
  placeId: string;
  /** Full text, e.g. "Luton Airport, Airport Way, Luton, UK". */
  text: string;
  main: string;
  secondary: string;
};

export class AutocompleteError extends Error {
  constructor(
    public kind: "no-key" | "failed",
    /** Google's own words about what went wrong (only ever shown while developing). */
    public detail?: string,
  ) {
    super(kind);
  }
}

type GoogleErrorBody = {
  error?: { code?: number; message?: string; status?: string; details?: Array<{ reason?: string }> };
};

/** Turns Google's error answer into one plain-English sentence for the developer. */
export function explainPlacesProblem(httpStatus: number, body: GoogleErrorBody | null): string {
  const message = body?.error?.message ?? "";
  const reason = body?.error?.details?.find((d) => d.reason)?.reason ?? body?.error?.status ?? "";
  const text = `${reason} ${message}`.toLowerCase();

  if (reason === "API_KEY_HTTP_REFERRER_BLOCKED" || text.includes("referer") || text.includes("referrer")) {
    return "Google blocked this website address. In Google Cloud → Credentials → the browser key → Websites, add http://localhost:3000/* and open the site as localhost (not 127.0.0.1).";
  }
  if (reason === "API_KEY_SERVICE_BLOCKED" || text.includes("are blocked")) {
    return "The browser key is not allowed to use Places API (New). Open the key → API restrictions and tick Places API (New).";
  }
  if (reason === "SERVICE_DISABLED" || text.includes("has not been used") || text.includes("is disabled")) {
    return "Places API (New) is not enabled. In Google Cloud → APIs & Services → Library, enable Places API (New) (not just the older Places API).";
  }
  if (reason === "API_KEY_INVALID" || text.includes("api key not valid")) {
    return "Google says the key is not valid. Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local, then stop and restart npm run dev.";
  }
  if (text.includes("billing")) {
    return "Billing is not switched on for the Google Cloud project. Link a billing account to it.";
  }
  if (httpStatus === 429 || text.includes("quota")) {
    return "Google's usage limit was reached. Wait a minute and try again.";
  }
  return `Google answered ${httpStatus}${message ? `: ${message}` : ""}.`;
}

type PlacePrediction = {
  placeId?: string;
  text?: { text?: string };
  structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
};

// Centre of Luton; suggestions are nudged towards the local area, not limited to it.
const LUTON = { latitude: 51.8787, longitude: -0.42 };

export async function fetchSuggestions(
  input: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) throw new AutocompleteError("no-key");

  let res: Response;
  try {
    res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({
        input,
        sessionToken,
        includedRegionCodes: ["gb"],
        languageCode: "en-GB",
        locationBias: { circle: { center: LUTON, radius: 50000 } },
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AutocompleteError("failed", "The browser could not reach Google (offline, or an ad-blocker is blocking places.googleapis.com).");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as GoogleErrorBody | null;
    const detail = explainPlacesProblem(res.status, body);
    if (process.env.NODE_ENV !== "production") console.error(`[places] ${detail}`, body?.error ?? "");
    throw new AutocompleteError("failed", detail);
  }

  const data = (await res.json().catch(() => ({}))) as {
    suggestions?: Array<{ placePrediction?: PlacePrediction }>;
  };
  const out: Suggestion[] = [];
  for (const item of data.suggestions ?? []) {
    const p = item.placePrediction;
    if (!p?.placeId || !p.text?.text) continue;
    out.push({
      placeId: p.placeId,
      text: p.text.text,
      main: p.structuredFormat?.mainText?.text ?? p.text.text,
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
    });
  }
  return out;
}
