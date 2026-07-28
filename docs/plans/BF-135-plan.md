# BF-135 — Key Facts: drop dates from stat labels, add "most recent available data" disclaimer

Client ask (Infographic Input July 2026, "Claudio to do"): *"delete the date from key stats and add disclaimer 'All data is based on most recent available data'"*.

## Approach

Two files, one data + one component:

1. **`data/asean/country-profiles.ts`** — strip the ` (20xx)` suffix from every
   `keyFacts.indicators[].label` across all 12 profiles (11 countries + the
   BF-134 ASEAN bloc entry). Labels only — values are untouched.
2. **`components/infographics/CountryKeyFacts.vue`** — the single shared
   renderer for every Key Facts block. Add the disclaimer
   *"All data is based on most recent available data"* once, in caption
   position (footnote area under the list), styled identically to the existing
   `__source` caption. One change ⇒ every page.

## Label inventory (in scope — 51 labels, all in `country-profiles.ts`)

- ASEAN bloc (7): `Combined GDP (2024)`, `GDP growth (2024)`, `FDI net inflow (2024)`,
  `Top FDI sources (2024)`, `U.S. goods trade (2025)`, `EU goods trade (2024)`,
  `PRC goods trade (2024)`
- Each of the 11 countries (4 each = 44): `GDP growth (2026)`,
  `GDP per capita PPP (2024)`, `Trade-to-GDP (2024)`, `FDI net inflows (2024)`

## Explicitly OUT of scope (years kept)

- **Stat values** — e.g. `$226.0B (+8.5% vs 2023)`, `$15.59B (2022)` (Malaysia
  off-year FDI), `75% (2016)` (Laos trade/GDP). The ask is labels only; the
  parenthetical years inside values are data caveats, not label qualifiers.
- **Agreement rows** — years there are part of agreement names
  (`US-ASEAN TIFA (2006)` etc.).
- **Chart captions / per-tab `sources` footnotes** — keep their
  source-and-years lines (separate explicit client ask from Feedback 2).
- **Straits `keyFacts`** — different feature, not the BF-96 country Key Facts.

## Judgment call (recorded, reversible)

The Key Facts block's own source footnote default
(`GDP growth (2026): IMF WEO. … (2024): World Bank.`) also loses its year
qualifiers (`GDP growth: IMF WEO. GDP per capita PPP, trade-to-GDP and FDI net
inflows: World Bank.`): it captions the very labels being de-dated, and keeping
years there would contradict the new disclaimer sitting next to it. The bloc's
`keyFactsSource` override (`BFNA research brief, Jul 2026. …`) keeps "Jul 2026"
— that dates the *document*, not the data.

## Test strategy

- `grep` final files: no `(20xx)` left in indicator labels; values unchanged.
- `npx nuxi typecheck` / build.
- Browser: Vietnam page (regular country), ASEAN bloc entry, a chart caption
  spot-check (years still present), mobile viewport for disclaimer layout.

## Risks

- Low. Data-string edits + one presentational line. Main risk is over-greedy
  regex catching a value or agreement string — mitigated by anchoring the
  substitution to `label:` fields and diff-reviewing every hunk.
