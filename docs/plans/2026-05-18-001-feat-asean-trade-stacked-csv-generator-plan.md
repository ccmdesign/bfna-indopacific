---
title: "feat: ASEAN CSV→TS generator for the trade-stacked chart"
type: feat
status: active
date: 2026-05-18
ticket: BF-56
---

# feat: ASEAN CSV→TS generator for the trade-stacked chart

## Summary

Replace the hand-fabricated placeholder values in `data/asean/trade-stacked.ts` with real two-way goods-trade data, generated deterministically from the canonical source `_data/wrangled/asean-flows-yearly.csv` by a new on-demand Node ESM script under `scripts/`. The generator filters `metric=trade_goods`, sums both trade directions per `country_iso3 × partner_group × year`, maps ISO3 → country slug via the `COUNTRIES` record in `data/asean/country-tiers.ts`, and writes a TypeScript module whose exported shape (`SeriesPoint`, `StackedAreaData`, `tradeStackedBySlug`) is byte-compatible with the current file so `components/asean/CountryStackedArea.vue` and `components/infographics/AseanInfographic.vue` keep working unchanged.

A latent unit bug in the existing setup is corrected as part of this work (see Decision D1): the chart component already expects series values in **USD millions** (its Y-axis label divides by 1000), but the placeholder file stores **USD billions**. The generator emits millions, fixing the axis.

---

## Problem Frame

The ASEAN infographic's trade-flows panel renders a stacked-area chart of two-way goods trade between each ASEAN country and CHN / USA / EU across 2010–2024. Today that chart is driven by `data/asean/trade-stacked.ts`, whose values are hand-fabricated "plausible growth curves" anchored to a few hero numbers — explicitly flagged in the file header as placeholder data to be replaced when the BACI cut lands. The real BACI cut has now landed at `_data/wrangled/asean-flows-yearly.csv` (long format, BACI HS07 V202601, 2010–2024, all 10 ASEAN-of-interest countries, 6 partner groups, both trade directions).

The work is a data-wiring task: build a reproducible generator that turns the canonical CSV into the exact TS module the existing components consume, with no component edits required and no fabricated curves remaining.

There is no upstream `ce-brainstorm` requirements document for BF-56 (the only brainstorms in `docs/brainstorms/` are straits-related). This plan is sourced directly from the BF-56 ticket description. Scope is well-bounded; ambiguous choices are resolved inline as auto-decisions.

---

## Requirements

- **R1.** A generator script under `scripts/` reads `_data/wrangled/asean-flows-yearly.csv` and writes `data/asean/trade-stacked.ts`, deterministically (same input → byte-identical output, stable key/series ordering).
- **R2.** Only rows where `metric = trade_goods` contribute. For each `country_iso3 × partner_group × year`, the two `direction` values (`partner_to_asean` + `asean_to_partner`) are summed into one two-way trade figure.
- **R3.** Output covers all 9 chart countries: indonesia, thailand, singapore, malaysia, vietnam, philippines, brunei, cambodia, laos. Myanmar and Timor-Leste are excluded (not present in `tradeStackedBySlug`; `inert` tier, no profile).
- **R4.** The generated module exports `SeriesPoint`, `StackedAreaData`, and `tradeStackedBySlug` with the exact same TypeScript shape and key names the current file uses, so `CountryStackedArea.vue` and `AseanInfographic.vue` compile and render unchanged.
- **R5.** Series values are emitted in USD millions (the unit the chart component's Y-axis math actually expects — see D1), with the `unit:` field set to a string that honestly describes the emitted values.
- **R6.** The `source:` field carries the real citation `BACI HS07 V202601` (kill `BACI HS07 V202601 / IEA (placeholder values)`).
- **R7.** Default partner exposure is CHN / USA / EU (matches current design and `AseanInfographic.vue`'s `CHART_PARTNERS`). GBR / JPN / KOR are available in the source but are not surfaced; the generator records they exist and is structured so adding them later is a one-line config change.
- **R8.** `nuxt build` passes after regeneration; the chart renders real 2010–2024 series for all 9 countries at 1280×800 with no fabricated growth curves remaining.

---

## Scope Boundaries

**In scope**
- New generator script under `scripts/`.
- Full regeneration of `data/asean/trade-stacked.ts` from the CSV.
- The unit correction (millions vs billions) and `unit:`/`source:` string fixes (R5, R6, D1).
- An npm script entry to invoke the generator.

**Deferred to Follow-Up Work**
- Wiring GBR / JPN / KOR partner bands into the chart UI (data is available; current design is CHN/USA/EU only — R7).
- The mineral-flows "green" layer chart (`AseanInfographic.vue` back-of-card stub) — separate dataset, separate ticket.
- Generators for the other wrangled tables (`asean-minerals-*.csv`, `asean-defense-yearly.csv`, etc.) — out of scope for BF-56.
- A Singapore entrepot-distortion footnote. BACI does not strip SGP re-exports (per `_data/sources/baci-trade.SCOUT.md` §8); SGP figures overstate final-destination trade. This is a methodology-caveat editorial change, not a generator concern. Noted, not actioned.

**Not a goal**
- Editing `CountryStackedArea.vue` or `AseanInfographic.vue` logic. The only component-facing change is the data they import; if a component edit becomes necessary the contract assumption in D4 was wrong and the plan should be revisited.

---

## Key Technical Decisions

- **D1 (Decision, auto): Emit series values in USD millions, not billions, because the chart component already expects millions.** `components/asean/CountryStackedArea.vue` line ~196 renders the Y-axis top label as `` `$${(yTopTick / 1000).toFixed(0)}B` `` — it divides the raw stacked value by 1000 to show "$NNNB". With the current placeholder storing billions (e.g. Indonesia 2024 CHN `143`), the stacked max is ~212 and the label renders `$0B` (a latent display bug nobody caught because the axis tick is faint). Feeding USD millions (e.g. ~142568) makes the label render `$250B` correctly. The source CSV is already in `value_usd_millions`, so emitting millions is also the lowest-transformation path. The placeholder's `unit: 'USD billions'` was internally inconsistent with the component; the generator sets `unit` to a string honest about millions-scale values (see D2). The static `meta="USD billions"` card label in `AseanInfographic.vue` is correct for the *reader* (the axis prints "$250B") and stays untouched.
- **D2 (Decision, auto): Set `unit` to `'USD millions'`.** It must truthfully describe the emitted numbers (R5). The human-facing "billions" framing is already handled by the component's axis formatter and the card `meta`, so `unit` is free to be accurate. `unit` is not consumed by either component's render logic (confirmed: `CountryStackedArea.vue` never reads `data.unit`; `AseanInfographic.vue` uses a hardcoded `meta` string), so this is safe.
- **D3 (Decision, auto): Plain Node ESM `.mjs` under `scripts/`, no new dependencies, hand-rolled CSV parse.** Matches the existing convention exactly: `scripts/build-asean-topology.mjs` and `scripts/parse-strait-svg.mjs` are both plain `.mjs` using only `node:fs`/`node:path`, run on-demand via `node scripts/<name>.mjs`, resolving `ROOT` from `import.meta.url`. The CSV is well-formed (no quoted/embedded commas in any field — verified across all 3128 rows: `source` values like `BACI HS07 V202601` and `CGIT 2023-Fall (>=$95M)` contain no commas), so a one-line `split('\n')` + `split(',')` parse is sufficient and avoids pulling `d3.csvParse` into a standalone script. Rationale to prefer no-deps: scripts run outside the Nuxt bundle with bare `node`; keeping them dependency-free matches both existing scripts and `package.json` (no devDeps for scripting).
- **D4 (Decision, auto): Treat the current `data/asean/trade-stacked.ts` exported shape as the hard contract.** The generated file must reproduce: `interface SeriesPoint { year; CHN; USA; EU; [partner: string]: number }`, `interface StackedAreaData { country; country_name; metric; unit; source; partners; series }`, and `export const tradeStackedBySlug: Record<string, StackedAreaData>`. `CountryStackedArea.vue` declares its own local copies of these interfaces, so only structural compatibility matters — but regenerating the `export interface` declarations keeps `AseanInfographic.vue`'s `import { tradeStackedBySlug }` and any future typed consumers working. Per-record fields keep current values: `country` = ISO3, `country_name` = display name, `metric: 'Two-way trade'`, `partners: ['CHN','USA','EU']`.
- **D5 (Decision, auto): Surface only CHN / USA / EU; do not expose GBR / JPN / KOR.** Matches the current design and `AseanInfographic.vue`'s `CHART_PARTNERS = ['CHN','USA','EU']`. The generator filters partner groups via a single `CHART_PARTNERS` constant; the three extra partners exist in the CSV and can be added later by editing that one array (R7). Documented, not wired.
- **D6 (Decision, auto): Slug↔ISO3 mapping is derived from `data/asean/country-tiers.ts`'s `COUNTRIES` record, hardcoded in the generator as an explicit ISO3→slug table.** The generator is a standalone `.mjs` and cannot cleanly import the `.ts` module; duplicating the 9-entry mapping as a literal is acceptable and matches how `scripts/build-asean-topology.mjs` already hardcodes its own `COUNTRIES` table. The mapping: `BRN→brunei, IDN→indonesia, KHM→cambodia, LAO→laos, MYS→malaysia, PHL→philippines, SGP→singapore, THA→thailand, VNM→vietnam`. `MMR` and the absent Timor-Leste are intentionally omitted. The generator must fail loudly if the CSV contains a `trade_goods` ISO3 not in this table AND not in the explicit ignore set `{MMR}` — a silent drop would mask source drift.
- **D7 (Decision, auto): Round emitted values to 1 decimal place.** Raw sums carry ~12 fractional digits of float noise (`20188.754365000008`). The chart renders at infographic scale where sub-million precision is invisible; 1dp keeps the file readable and diff-stable while preserving exact ordering. Rounding is applied once at emit time, deterministically.
- **D8 (Decision, auto): Add an npm script `gen:trade-stacked` AND keep direct `node scripts/...` working.** `scripts/build-asean-topology.mjs` has no npm alias today (run via raw `node`), but an npm entry improves discoverability and is the lowest-risk addition to `package.json` (no dep changes). Both invocation paths must produce identical output (R1).

---

## High-Level Technical Design

This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.

```
_data/wrangled/asean-flows-yearly.csv   (3128 rows, long format)
        │
        ▼  read text, split lines/commas (no quoting in this file)
  parse rows → { country_iso3, year, partner_group, direction, metric, value_usd_millions, source }
        │
        ▼  filter: metric === 'trade_goods' AND partner_group ∈ {CHN,USA,EU} AND iso3 ∈ mapTable
  group key = iso3 × partner_group × year
        │
        ▼  sum value_usd_millions over the 2 directions  → two-way[iso3][year][partner]
        │
        ▼  pivot to per-slug StackedAreaData:
           series = years 2010..2024 ascending, each { year, CHN, USA, EU } (1dp)
           partners = ['CHN','USA','EU'], metric='Two-way trade',
           unit='USD millions', source='BACI HS07 V202601'
        │
        ▼  emit deterministic TS:
           - exact interface decls (D4)
           - tradeStackedBySlug ordered by a fixed slug order
  data/asean/trade-stacked.ts
```

Fixed slug emission order (keeps diffs stable and mirrors the current file's order): `indonesia, thailand, singapore, malaysia, vietnam, philippines, brunei, cambodia, laos`.

Determinism guarantees: years sorted ascending; partner keys emitted in fixed `CHN, USA, EU` order; slugs in the fixed order above; values rounded once at 1dp; no `Date.now()`/timestamps in output.

---

## Implementation Units

### U1. Generator script: parse, filter, aggregate, emit

**Goal:** A new on-demand Node ESM script that transforms `_data/wrangled/asean-flows-yearly.csv` into `data/asean/trade-stacked.ts`, byte-deterministically, matching the existing `scripts/*.mjs` convention.

**Requirements:** R1, R2, R3, R4, R5, R6, R7, D1–D7.

**Dependencies:** none (first unit).

**Files:**
- `scripts/build-asean-trade-stacked.mjs` (create) — name mirrors `scripts/build-asean-topology.mjs`.
- `data/asean/trade-stacked.ts` (regenerated output — not hand-edited after this unit).

**Approach:**
- Header comment block in the style of `scripts/build-asean-topology.mjs`: what it does, the `node scripts/build-asean-trade-stacked.mjs` run line, and the source→output mapping. Replace the old hand-fabricated-data preamble.
- Resolve `ROOT` from `import.meta.url` (same pattern as the existing script). `SOURCE = _data/wrangled/asean-flows-yearly.csv`, `OUT = data/asean/trade-stacked.ts`.
- Constants: `CHART_PARTNERS = ['CHN','USA','EU']` (D5), `ISO3_TO_SLUG` 9-entry table (D6), `IGNORE_ISO3 = new Set(['MMR'])`, `SLUG_ORDER` fixed array (HLD), `METRIC = 'trade_goods'`, `SOURCE_STRING = 'BACI HS07 V202601'`.
- Parse: read file, split into lines, drop header, split each line on `,`; map by fixed column index (`country_iso3=0, year=1, partner_group=2, direction=3, metric=4, value_usd_millions=5, source=6`).
- Filter to `metric === METRIC` and `partner_group ∈ CHART_PARTNERS`. For each surviving row, if `iso3` not in `ISO3_TO_SLUG` and not in `IGNORE_ISO3`, throw with the offending ISO3 (D6 fail-loud).
- Aggregate into `acc[slug][year][partner] += Number(value_usd_millions)` (sums both directions, R2).
- Build `tradeStackedBySlug`: iterate `SLUG_ORDER`; for each, build `series` over the sorted distinct years (expected 2010–2024) with `{ year, CHN, USA, EU }` rounded to 1dp (D7); assemble the `StackedAreaData` record with `country` (ISO3), `country_name` (from a slug→name map mirroring `COUNTRIES`), `metric: 'Two-way trade'`, `unit: 'USD millions'`, `source: SOURCE_STRING`, `partners: [...CHART_PARTNERS]`.
- Emit: write the exact `export interface SeriesPoint` / `export interface StackedAreaData` declarations (D4), then `export const tradeStackedBySlug: Record<string, StackedAreaData> = { ... }` serialized deterministically with stable key order and 1dp numbers. Prefer a hand-built emitter (template strings) over `JSON.stringify` so the output is valid idiomatic TS (no quoted keys where the current file has bare keys) and visually close to the current file for review.
- Log a one-line summary in the style of the existing script: countries written, year span, output path relative to ROOT.
- Validation guards (fail loud, non-zero exit): every slug in `SLUG_ORDER` must have exactly 15 years 2010–2024; every `(slug, year)` must have all 3 partner values present and finite; total contributing source rows must equal `9 countries × 3 partners × 2 directions × 15 years = 810`.

**Patterns to follow:**
- `scripts/build-asean-topology.mjs` — header comment style, `import.meta.url`→`ROOT` resolution, `fs.mkdir(dirname, {recursive:true})` then `fs.writeFile`, final `console.log` summary lines, hardcoded `COUNTRIES` table precedent.
- Current `data/asean/trade-stacked.ts` — exact interface text and per-record field ordering to reproduce (D4).

**Test scenarios:** (this project has no automated test runner — `package.json` has only `build`/`dev`/`generate`/`preview`; verification is the build + a deterministic re-run + spot-checks rather than a unit test file)
- Happy path: running the script produces `data/asean/trade-stacked.ts` containing all 9 slugs, each with a 15-point series 2010–2024 and `CHN`/`USA`/`EU` keys.
- Determinism: running the script twice with no source change yields a byte-identical file (`git diff --quiet` after a second run).
- Aggregation correctness (spot-check, traces to CSV): Indonesia 2010 CHN must equal `20188.754365000008 + 20977.803804000087 = 41166.558…` → emitted `41166.6`. Indonesia 2024 USA must equal `29825.88966699997 + 11822.318271000007 = 41648.208…` → `41648.2`. Vietnam 2024 CHN must equal the sum of its two `trade_goods` CHN direction rows for 2024 in the CSV.
- Filtering: no `fdi_flow`, `fdi_position`, `china_*` rows contribute (verify a known FDI value never appears in output).
- Partner restriction: emitted `partners` is exactly `['CHN','USA','EU']`; no `GBR`/`JPN`/`KOR` keys in any series point (D5).
- Fail-loud: introducing a synthetic `trade_goods` row with an unknown ISO3 (e.g. `XXX`) causes a non-zero exit with the offending code in the message; a `MMR` row is silently ignored (in `IGNORE_ISO3`), not an error.
- Unit/source: every record has `unit: 'USD millions'` and `source: 'BACI HS07 V202601'`; the string `placeholder values` appears nowhere in the output.

**Verification:** The script exits 0, prints its summary, and `data/asean/trade-stacked.ts` is overwritten with real values; a second run leaves the file unchanged; the three spot-check sums match the CSV by hand.

---

### U2. npm script wiring + provenance/no-fabrication scrub

**Goal:** Make the generator discoverable via `npm run`, and confirm no fabricated-curve language or values survive anywhere the chart reads from.

**Requirements:** R1 (invocation), R6, R8, D8.

**Dependencies:** U1.

**Files:**
- `package.json` (modify) — add `"gen:trade-stacked": "node scripts/build-asean-trade-stacked.mjs"` to `scripts`. No dependency changes.
- `data/asean/trade-stacked.ts` (verified, not hand-edited).

**Approach:**
- Add the npm script alias (D8). Confirm `npm run gen:trade-stacked` and `node scripts/build-asean-trade-stacked.mjs` produce byte-identical output.
- Grep the regenerated `data/asean/trade-stacked.ts` for residue of the placeholder era: the strings `placeholder`, `IEA`, `plausible growth`, `directionally accurate`, `anchored to` must not appear. Header comment must describe the generator + source, not fabricated curves.
- Confirm `_data/sources/baci-trade.SCOUT.md` is the citation origin and the emitted `source:` matches `BACI HS07 V202601` exactly.

**Patterns to follow:**
- `package.json` existing `scripts` block (alphabetical-ish, ESM project `"type": "module"`).

**Test scenarios:**
- `npm run gen:trade-stacked` runs the same script and yields the same file as the direct `node` invocation (diff is empty).
- Post-generation grep finds zero occurrences of `placeholder`, `IEA`, `plausible growth` in `data/asean/trade-stacked.ts`.
- `data/asean/trade-stacked.ts` header comment references the generator script path and the CSV source, not hand-fabrication.
- Test expectation: no behavioral unit test — this unit is a build-tooling alias plus a content scrub; coverage is the grep + diff above.

**Verification:** Both invocation paths produce the same file; the scrub greps return nothing; the citation matches the SCOUT doc.

---

### U3. Build + visual acceptance

**Goal:** Prove the regenerated data compiles and the chart renders real series for all 9 countries with a correct axis at the target embed size.

**Requirements:** R4, R8, D1.

**Dependencies:** U1, U2.

**Files:**
- No source edits. Exercises `components/asean/CountryStackedArea.vue` and `components/infographics/AseanInfographic.vue` against the regenerated `data/asean/trade-stacked.ts`.

**Approach:**
- Run `nuxt build` (the project's `npm run build`); it must pass with no type errors against the regenerated module (D4 contract holds).
- Run the infographic locally; for each of the 9 countries (default Indonesia + cycle the other 8 via the map/selector), confirm: the stacked area renders three bands (CHN/USA/EU), the right-edge labels show China/United States/European Union, the X axis shows 2010 / mid / 2024, and the Y-axis top label reads a sensible `$NNNB` (not `$0B`) — direct confirmation of the D1 unit fix.
- Spot-check 3 countries (e.g. Indonesia, Vietnam, Singapore) by eyeballing the 2024 CHN band magnitude against the hand-computed CSV sum from U1's test scenarios.
- Confirm at 1280×800 the chart layout is intact (no clipped labels, no overflow) — the BF-56 acceptance viewport.

**Patterns to follow:**
- The existing `browser-test-bf67.spec.ts` and `screenshots/` / `test-screenshots/` conventions in the repo for capturing 1280×800 evidence, if a screenshot is wanted as proof.

**Test scenarios:**
- `nuxt build` exits 0 with no TypeScript errors referencing `trade-stacked` or `tradeStackedBySlug`.
- All 9 countries render a non-empty 3-band stacked area when selected.
- Y-axis top label is a non-zero `$NNNB` for at least Indonesia and Vietnam (proves D1).
- At 1280×800 no label/axis clipping in the trade-flows card.
- Test expectation: manual/visual + build gate — there is no automated test runner; acceptance is the build pass plus the documented visual checks. (`browser-test-bf67.spec.ts` is an ad-hoc spec, not wired to an npm test script.)

**Verification:** `nuxt build` passes; all 9 countries show real curves (visibly different from the old smooth fabricated growth, and tracing to CSV for the 3 spot-checks); axis label correct at 1280×800.

---

## System-Wide Impact

- **Consumers of `data/asean/trade-stacked.ts`:** only `components/infographics/AseanInfographic.vue` (`import { tradeStackedBySlug }`), which passes the active country's record into `components/asean/CountryStackedArea.vue`. No other repo file imports the module (verified by grep). The D4 contract keeps both working without edits.
- **Numeric scale change (billions → millions, D1):** values change magnitude ~1000×. This is the *intended* fix — the chart's Y-axis formatter divides by 1000, so millions-in produces correct `$NNNB`-out, whereas the old billions-in produced `$0B`. The static `meta="USD billions"` reader label in `AseanInfographic.vue` remains accurate and is untouched.
- **No runtime/SSR risk:** the generated file is a static TS module imported at build time (same as today); no new fetch, no new dependency, no Nuxt config change.
- **Reproducibility:** the source CSV is tracked (`_data/` is not gitignored, per `_data/README.md`); the generator is idempotent, so regeneration is a safe, reviewable commit.

---

## Risks & Mitigations

- **R: CSV format drift (new ISO3, missing year, quoted field).** Mitigation: U1's fail-loud guards (unknown ISO3 throws; per-slug 15-year and 3-partner completeness asserted; expected total row count `810` asserted). The no-quoting assumption is verified for the current file; if a future source adds quoted commas the parse must be revisited (documented in D3).
- **R: D1 unit assumption wrong — chart actually wants billions.** Mitigation: U3 explicitly verifies the Y-axis renders a sensible non-zero `$NNNB`. The component source (`/ 1000`) is unambiguous; if U3 shows `$0B` the assumption failed and the plan is revisited before merge.
- **R: Singapore figures overstate trade (entrepot re-exports, SCOUT §8).** Mitigation: out of scope for the generator (a methodology footnote, deferred). Noted so reviewers don't mistake inflated SGP numbers for a generator bug.
- **R: Interface regeneration diverges from the hand-written original (subtle field reorder breaks a typed consumer).** Mitigation: D4 fixes the contract explicitly; U1 reproduces the exact interface text; U3's `nuxt build` is the type gate.

---

## Acceptance Criteria (BF-56)

1. All 9 countries (indonesia, thailand, singapore, malaysia, vietnam, philippines, brunei, cambodia, laos) render real 2010–2024 series in the trade-flows chart.
2. No fabricated growth curves or placeholder values remain in `data/asean/trade-stacked.ts` (grep-clean of `placeholder`/`IEA`/`plausible growth`).
3. Spot-check of 3 countries' values traces exactly to summed `trade_goods` rows in `_data/wrangled/asean-flows-yearly.csv` (U1 names Indonesia 2010 CHN, Indonesia 2024 USA, Vietnam 2024 CHN).
4. `source:` field is the real `BACI HS07 V202601` string.
5. `nuxt build` passes.
6. Chart is visually intact at 1280×800 with a correct (non-`$0B`) Y-axis label.
7. The generator is invocable both as `npm run gen:trade-stacked` and `node scripts/build-asean-trade-stacked.mjs`, and is deterministic (second run = no diff).

---

## Auto-Resolved Decisions Summary

All BF-56 ambiguities resolved without user input (autonomous mode). Full rationale in Key Technical Decisions:

- **D1/D2/D5/D6** map directly to the four "the plan must decide" questions in the ticket: units (millions, fixing a latent axis bug), partner exposure (CHN/USA/EU only, extras documented), 9-country slug↔ISO3 table, invocation (npm script + direct node, deterministic).
- **D3** locks the generator as a no-dependency plain `.mjs`, matching the two existing `scripts/*.mjs`.
- **D4** treats the current exported TS shape as the hard contract so components never change.
- **D7/D8** cover emit rounding and the npm alias.

**Open question (non-blocking, deferred):** the Singapore entrepot caveat is a real data-quality footnote per the BACI SCOUT doc but is an editorial/methodology change, not a generator concern — explicitly deferred, not auto-actioned.
