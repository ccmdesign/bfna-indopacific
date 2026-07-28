# BF-134 — ASEAN bloc-level entry as 12th "country"

Client ask (Infographic Input July 2026, "Claudio to do"): add one more "country" — ASEAN —
with the doc's "ASEAN Overall" description, Key Facts, trade agreements and FDI inflow table.

## Approach

Treat the bloc as a 12th profile flowing through the existing data-driven machinery, with a
small `isBloc` escape hatch where per-country chart series don't exist.

1. **`data/asean/country-profiles.ts`** — add `asean` as the FIRST entry in `PROFILES`
   (ticket's sensible default: first entry in card list / nav). Extend `CountryProfile` with
   optional `isBloc`, `keyFactsSource` (bloc facts aren't IMF/World Bank) and `fdiInflows`
   (the doc's EU27/US/PRC × 2023/2024/2025 table, US$ millions, ASEANstats).
   `paragraphs.trade`/`minerals` stay empty strings and `topExports`/`topImports` empty —
   never rendered for the bloc (no fabricated charts).
2. **`data/asean/country-tiers.ts`** — add an `asean` descriptor first (tier `inScope`,
   synthetic id). This automatically puts "ASEAN" first in the desktop legend (grid goes
   6/5 → 6/6) and in the top country-switcher reel. `AseanMap` builds its features from
   `countries.geo.json` only, so the map is untouched.
3. **Map behavior (free win)** — docking slug `asean` resolves no `activeFeature`, so
   `AseanMap` keeps the idle full-map frame with all 11 members tinted: the bloc entry
   IS the whole map, exactly the ticket's semantic. No map code changes.
4. **`components/asean/CountryDetail.vue`** — for `isBloc`: hide the 3-tab tablist (tab
   state rests on `description`), render description paragraph + Key Facts as usual, plus a
   new FDI-inflow table card (`CountryFdiTable` inside the existing `CountryChartCard`
   shell) inside the keyed cross-fade block. Countries are untouched.
5. **`components/infographics/CountryKeyFacts.vue`** — the source footnote becomes an
   optional prop defaulting to the current hardcoded IMF/World Bank line; the bloc passes
   its own attribution.
6. **New `components/asean/CountryFdiTable.vue`** — small styled table (Source × years),
   tabular-nums, same translucent design language.
7. **Flag**: flagcdn has no ASEAN (404) and the official emblem is copyrighted (deleted
   from Wikimedia Commons), so we must not reproduce it. Author a neutral local badge
   `public/assets/flag-asean.svg` — brand-blue field, ring of 11 gold dots (11 members).
   Client can supply licensed art later.

## Content (from the doc, verbatim with Marshall-approved trimming)

- Description: the doc's "ASEAN Overall → Description" paragraph trimmed to 3 sentences,
  keeping 684M citizens, ASEAN–China largest-trading-partner fact, U.S. as largest FDI
  source, 4th-largest economy by 2030. This is the bloc-entry text, NOT the site's opening
  intro — the idle intro is hidden while the bloc is docked, so no on-screen duplication.
- Key Facts: Combined GDP (2024) US$3.9T · GDP growth (2024) 4.8% · FDI net inflow (2024)
  $226.0B (+8.5% YoY) · top FDI sources U.S. 18.6% / EU 13.9% / China 8.6% / HK 8.3% ·
  U.S. goods trade 2025 $580.1B · EU goods trade 2024 €258.8B · PRC goods trade 2024 $772.4B.
- Agreements: EU — ASEAN-EEC Cooperation Agreement (1980); US — US-ASEAN TIFA (2006);
  China — ASEAN-China FTA (2009).
- FDI table (US$M, ASEANstats): EU27 22,223.69 / 16,417.44 / 31,323.71 ·
  US 83,540.12 / 34,152.08 / 30,044.76 · PRC 16,551.01 / 26,122.17 / 26,243.68.

## Surfaces

- **Desktop landing**: "ASEAN" first in the left legend → click docks the bloc (full map
  stays framed), right sidebar shows description + Key Facts + FDI table, reel shows ASEAN.
- **Desktop deep link** `/infographics/asean/asean` (+ `/embed/asean/asean`): prerendered
  automatically via `COUNTRY_URL_SLUGS`; `AseanInfographic initialSlug='asean'`.
- **Mobile**: first card in the card list → detail page (badge + "ASEAN" + same content).

## Test strategy

- Browser (dev server): landing desktop legend shows ASEAN first and docks it; detail
  content renders (description, 7 indicators, 3 agreements, FDI table); Vietnam unchanged;
  mobile viewport shows ASEAN first in card list and its detail page renders.
- `npm run build` (nuxt generate happens in CI/Netlify; local build type-checks templates).

## Risks

- Switcher reel assumes every row has a profile — ASEAN has one, and inert rows are already
  handled, so low risk; verified in browser.
- Legend hover for ASEAN highlights nothing on the map (no geo feature). Accepted for now
  (could later highlight all members); recorded as a non-blocking residual.
- Badge is a stand-in, not the official emblem (copyright) — flagged to client in Plane.
