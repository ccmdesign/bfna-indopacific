# BF-133 — ASEAN infographic: apply 27 Jul decisions

Decisions recorded by Claudio (27 Jul) on the ASEAN status & decision log, closing the
open questions from the 14 Jul client round. Three content changes + a tile check.

## 1. Trade chart caption rename (supersedes BF-109 wording)

- `components/asean/CountryDetail.vue:282` — `title="Share of Trade with China, the U.S. and the EU"`
  → `title="Share of top-six commodity trade held by China, US, and EU"`.
- Sweep result: that string occurs **only** in `CountryDetail.vue` (plus the historical
  `docs/plans/BF-109-plan.md`, which stays as a record). Embed pages
  (`/embed/asean/[country]`) and the public detail pages both render through
  `AseanCountryDetailPage → CountryDetail`, so one edit covers every surface.
- The `meta` line under the title already reads "Share held by China, the U.S. and the
  EU · 2010–2024 · Source: CEPII BACI" — kept, it's the axis/source line, not the caption.

## 2. Side-by-side China/US/EU trade figures on every country page (decided BF-86)

- Marshall's confirmed 14 Jul ask: "$125B China / $60B US / $25B EU" side by side.
- Data source: `data/asean/trade-stacked.ts` (BACI two-way goods trade, USD millions,
  2010–2024, all 11 slugs incl. Brunei & Timor-Leste). Use the latest series point (2024).
- New component `components/infographics/CountryTradePartnersRow.vue` (sibling of
  `CountryKeyFacts.vue`, same Encode Sans / translucent-white system): one compact row
  "$142.6B China / $41.6B US / $28.8B EU" + a small basis line
  "Two-way goods trade · 2024 · CEPII BACI".
- Formatting: abbreviated USD billions, one decimal only if needed ($142.6B, $60B);
  sub-$1B values fall back to $NNNM (Timor-Leste-safe).
- Mounted in `CountryDetail.vue` inside the charts-tab prose block, **Trade tab only**,
  gated on `tradeStacked` — appears on every country page (desktop sidebar, mobile
  detail page, and embed surface all render CountryDetail).
- BF-86 is thereby implemented; its state move is the orchestrator's job (noted in the
  Plane comment only).

## 3. Philippines nickel: adopt client's 87% (Böll — ore exports to China, by volume)

Two figures, two bases:
- **87%** — nickel-*ore* exports to China, **by volume** (client's Heinrich Böll
  Stiftung source).
- **71.8% (~72%)** — all nickel-*class* exports (ore, matte, oxide sinter, refined) to
  China, **by value** (BACI HS07, feeds `minerals.generated.ts` flows).

Judgment call (anticipated by the ticket): the flow-band chart is geometrically
by-value — segment widths are proportional to `valueUsdM` and the pct labels derive
from the same totals. Splicing a by-volume 87% into the PHL `flows` array would make
labels contradict the geometry and push the partner shares over 100%. Also
`minerals.generated.ts` is a GENERATED file (`scripts/build-asean-minerals.mjs` from
`_data/wrangled/asean-minerals-flows.csv`, BACI by value); hand-editing it drifts from
its generator, and the Böll by-volume ore figure cannot be merged into a by-value BACI
CSV coherently. So:

- **Chart data unchanged** — the band stays internally consistent by value.
- **87% becomes the headline figure in prose**: `data/asean/country-profiles.ts`
  Philippines `paragraphs.minerals` gains the concrete figure ("87% of its nickel-ore
  exports by volume shipped to China in 2024"), `sources.minerals` cites Heinrich Böll
  Stiftung Southeast Asia, 2026.
- **Basis made explicit in chart/label copy** so the two can't be confused:
  - `CountryMineralFlowBand.vue` caption: "~NN% routes through China…" →
    "~NN% of export value routes through China…".
  - `CountryDetail.vue` nickel-card `meta` becomes per-country: for the Philippines it
    appends "By volume, 87% of nickel-ore exports go to China (Böll, 2024)." and the
    card `source` adds the Böll citation.

## 4. Squarespace tiles — check, no re-export expected

`scripts/export-tiles.mjs` captures `/embed/asean?capture` — the **landing** (idle map,
no country focused). `CountryDetail` renders nothing without a slug, so the trade chart
caption never appears in the asean tile (nor in renewables/straits). → caption rename
does not stale the tiles; no re-export needed. Verified against `export-tiles.mjs:284`
and `AseanLanding.vue`/`AseanInfographic.vue` (activeSlug starts null).

## Test strategy

- `npm install` + `npm run build` (nuxt build) must pass in the worktree.
- Browser pass on `npm run dev`: new caption on a country page; side-by-side row on
  Indonesia + Brunei/Timor-Leste (small-value formatting); Philippines Critical
  Minerals showing 87% with basis; landing page sanity.

## Risks

- Trade row on mobile/embed surfaces inherits CountryDetail — verify it doesn't crowd
  the prose block (kept to one compact line).
- The ~72% vs 87% co-presence on the PH minerals tab is intentional; both now carry
  explicit bases.
