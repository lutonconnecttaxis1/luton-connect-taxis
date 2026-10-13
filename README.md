# Luton Connect Taxis – Website

Next.js (App Router) · TypeScript · Tailwind CSS · Firebase · Google Maps.

Read **`PROJECT_CONTEXT.md`** first — it holds the brief, decisions, pricing rules, milestone table and open items.
Accounts and keys: **`SETUP_CHECKLIST.md`**.

**Status:** runs on localhost only (not on GitHub or Vercel yet). Milestones 0–3 are built (homepage, core pages, contact form, booking engine). Resend (email) and reCAPTCHA are deferred to the final milestone, so **no emails are sent yet** — booking and contact messages are printed in the terminal, and bookings are saved to Firestore.

## Run it locally

Requires Node 20+ (`.nvmrc` says 22).

```bash
npm install
cp .env.example .env.local   # then fill in the keys (see SETUP_CHECKLIST.md Part A)
npm run dev                  # http://localhost:3000
```

Restart `npm run dev` after any change to `.env.local`.

Other commands: `npm run build` · `npm run lint` · `npm run typecheck` · `npm test` (unit tests for pricing, maps maths, forms and saving)

Health check: http://localhost:3000/api/health

## Try the booking flow

Use the quote card at the bottom of the homepage hero: choose a pickup and drop-off from the suggestions, add date, time and people, click **Get estimate** (the card grows and shows the fare), then **Request this taxi** and send. The reference (`LCT-XXXXXX`) appears on screen and the booking document appears in Firebase → Firestore → `bookings`.

## Where things live

| Folder | Purpose |
|---|---|
| `app/` | Pages and API routes (`/api/quote`, `/api/bookings`, `/api/contact`). There is no separate booking page – the booking card is on the homepage (`components/booking/QuoteCard.tsx`). `[locale]` routing is added in milestone 5. |
| `components/` | Homepage and page pieces (`home/`, `pages/`) and the booking form (`booking/`) |
| `config/` | **Editable business data:** `site.ts` (contact details), `pricing.ts` (rates and limits), `airport-fees.ts`, `airports.ts`, `congestion.ts`, `congestion-zone.ts`, `bank-holidays.ts` |
| `lib/` | Logic: `pricing/` (the estimate), `geo/`, `maps/` (Google), `quote`, `booking*`, `firestore`, `email`, `recaptcha`. Tests sit beside the code (`*.test.ts`). |
| `reference/` | Client screenshots (congestion zone map, airport fee tables) |
| `firestore.rules` | Database security rules (bookings are written by the server only) |
| `SETUP_CHECKLIST.md` | Accounts to create — what is needed now vs at the end |

## Changing prices

Edit `config/pricing.ts`, `config/airport-fees.ts` or `config/congestion.ts` — never the calculation code. A `null` airport fee means "confirmed on quote". The Congestion Charge zone in `config/congestion-zone.ts` is an approximation until the official boundary is added.

## Indexing

The site is `noindex` so Google ignores unfinished pages. Set `NEXT_PUBLIC_SITE_INDEXABLE=true` on the **Production** environment at launch only.
# luton-connect-taxis-website
# luton-connect-taxis
