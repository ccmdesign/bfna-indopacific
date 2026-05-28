---
title: "feat: ASEAN critical-minerals layer (data module + chart components)"
type: feat
status: active
date: 2026-05-18
ticket: BF-58
---

# feat: ASEAN critical-minerals layer (data module + chart components)

## Summary

Build the real critical-minerals "Green Transition" layer for the ASEAN infographic, replacing **both** back-of-card stubs in `components/infographics/AseanInfographic.vue`:

- line ~119 — `"Critical-mineral view wires next pass."` (Card A, the production / world-share card)
- line ~150 — `"Mineral-flow chart wires next pass."` (Card B, the mineral-flow card)

This is **net-new** work, not a data swap. It adds: (1) a deterministic Node ESM generator `scripts/build-asean-minerals.mjs` following the just-merged BF-56/BF-57 pattern, (2) a generated TypeScript data module `data/asean/minerals.generated.ts`, and (3) **two** new D3-in-Vue chart components under `components/asean/` that match the established `CountryStackedArea.vue` / `CountryTradeBalanceBars.vue` pattern. It wires both new components into the existing `CardFlip` back faces, preserving the existing per-active-country reactive contract.

The visual register is the hard constraint: the cards must be cinematic/atmospheric (DESIGN.md "The Deep Watch"), hit WCAG 2.1 AA contrast on the dark navy gradient, gate all motion on `prefers-reduced-motion: reduce`, never use color as the sole carrier of meaning, and read correctly at the 1280×800 canon.

There is no upstream `ce-brainstorm` requirements document for BF-58 (the only brainstorms in `docs/brainstorms/` are straits-related). This plan is sourced directly from the BF-58 ticket; ambiguous design choices are resolved inline as autonomous decisions, biased toward DESIGN.md's cinematic register and the existing component conventions.

---

## Problem Frame

The ASEAN infographic has a `layer` toggle (`trade` / `green`) that flips both bottom-dock cards in unison via `CardFlip`. The **trade** (front) faces are real and wired (BF-56/57: `CountryTradeBalanceBars` + `CountryStackedArea`). The **green** (back) faces are stubs:

- Card A back face: a `CountryChartCard` shell with stub text where a production / world-share visual should be.
- Card B back face: a `CountryChartCard` shell with stub text where a mineral-flow visual should be.

The canonical data has landed in `_data/wrangled/`:

- `asean-minerals-production.csv` (186 data rows, properly CSV-quoted) — per `country_iso3 × mineral × year` mine production with `world_total` and `share_of_world_pct`. Years 2024 + 2025. ASEAN producers are sparse and concentrated: Indonesia dominates Nickel (66.67% of world, 2025), Cobalt (14.19%), Tin (21.03%); Philippines is the #2 nickel producer (6.92%); Myanmar leads ASEAN rare earths (5.64%).
- `asean-minerals-flows.csv` (8,845 data rows) — bilateral mineral trade flows: `asean_country × year × partner_group × asean_role × mineral_class × end_use × hs6`, 2010–2024. The flow reality is overwhelmingly **Indonesia nickel → China** (IDN 2024 nickel-class exporter total $21.0B, of which $19.0B to China). Per-country export flows outside IDN/PHL/LAO are immaterial in dollar terms (e.g. THA $31M, VNM $111M, MYS $211M in 2024).
- `asean-headline-stats.json` → `thesis_b_minerals` — cite-ready anchors that reconcile exactly to the CSV rollups (verified: `indonesia_nickel_exports_2024.total_usd_millions` = 21001.69 matches the flows rollup to 1dp; `asean_nickel_exports_growth.2024_usd_millions` = 23477.72 matches the ASEAN-wide nickel rollup).

The data shape forces two register-defining realities the plan must respect:

1. **The story is concentration, not breadth.** Most ASEAN countries have no meaningful critical-minerals footprint. A per-active-country chart that says "Brunei produces nothing / exports nothing" 7 times out of 9 is editorially weak and visually empty — but the existing card contract is strictly per-active-country (every other card reacts to the country selector). This tension is the central design decision (see D1/D2).
2. **The flow is a two-hop reality (ASEAN → China → West), not ASEAN → West.** `_data/sources/baci-trade-minerals.SCOUT.md` §4 explicitly warns a single-hop Sankey will misrepresent. The flow card must not imply ASEAN ships minerals to the US/EU directly.

---

## Requirements

- **R1.** A deterministic Node ESM generator `scripts/build-asean-minerals.mjs` reads `_data/wrangled/asean-minerals-production.csv` and `_data/wrangled/asean-minerals-flows.csv` and emits a single TypeScript module `data/asean/minerals.generated.ts`. Same input → byte-identical output (fixed key/series order, rounded once, no timestamps).
- **R2.** The generator uses a **quote-aware** CSV parser (the production CSV contains 4 quoted rows: `KOR,"Korea, Republic of",…`). Plain `split(',')` is incorrect here and must not be used for the production file.
- **R3.** The generated module exposes per-active-country minerals data keyed by the same 9 country slugs as `data/asean/country-profiles.ts` / `trade-stacked.ts` (`indonesia, thailand, singapore, malaysia, vietnam, philippines, brunei, cambodia, laos`), plus an ASEAN-wide rollup object (for the framing/empty-state path — see D2). MMR/Timor-Leste excluded from the slug map; MMR contributions are still aggregated into the ASEAN-wide rollup where editorially required (rare earths) and otherwise ignored without silent drops.
- **R4.** Card A (back of the first dock card) renders a **production / world-share** visual for the active country, driven by the generated data, replacing the line-~119 stub.
- **R5.** Card B (back of the second dock card) renders a **mineral-flow** visual for the active country, driven by the generated data, replacing the line-~150 stub. It must visually encode the two-hop ASEAN→China→West reality, not a misleading single hop.
- **R6.** Both new components follow the established D3-in-Vue pattern: `defineProps` with a typed data prop + optional `height`, `chartContainer` ref, `draw()` with `clientWidth===0` retry, `ResizeObserver` on mount, `onUnmounted` disconnect, `watch(() => props.data, draw, { deep: true })`, `aria-hidden="true"` on the SVG container, `:deep(svg)` responsive style.
- **R7.** Design fidelity: AA contrast on the navy gradient (body ≥ 4.5:1, large ≥ 3:1 — `rgba(255,255,255,α)` with α ≤ 0.6 is ornamental-only per PRODUCT.md), all motion gated on `prefers-reduced-motion: reduce`, color never the sole carrier of meaning (pair with shape/position/label), Encode Sans 400/600 only, Meridian as the single voice accent, no second saturated accent as chrome. Verified at 1280×800 in light and dark.
- **R8.** The active-country reactive contract is preserved: both new visuals key off `activeProfile` / `activeSlug` the same way the front faces do, so flipping the layer or selecting a new country on the map updates the green faces identically to the trade faces.
- **R9.** Every number on screen traces to a `_data/wrangled` CSV row or a named `thesis_b_minerals` anchor; `source:` strings use the real citations from the SCOUT docs (`USGS MCS2026` for production, `BACI HS07 V202601` for flows).
- **R10.** `npm run build` (`nuxt build`) passes with no type errors; the generator is invocable as `npm run gen:minerals` and `node scripts/build-asean-minerals.mjs`, deterministic (second run = no diff).

---

## Scope Boundaries

**In scope**

- New generator `scripts/build-asean-minerals.mjs` + `npm run gen:minerals` alias.
- New generated module `data/asean/minerals.generated.ts`.
- Two new chart components under `components/asean/` (production/world-share + mineral-flow).
- Wiring both into the existing `CardFlip` back faces in `components/infographics/AseanInfographic.vue`, including correct `eyebrow`/`title`/`meta`/`source` props on the existing `CountryChartCard` shells.
- An editorially honest empty/low-data state for countries with no material minerals footprint (D2).

**Deferred to Follow-Up Work**

- Wiring the additional partner groups (GBR/JPN/KOR/OTHER) into the flow visual beyond the CHN/USA/EU + "rest" framing chosen here (data exists; design exposes the canonical three plus an aggregated remainder).
- A literal animated Sankey/particle-flow rendering of the two-hop chain — the chosen Card B encoding (D4) communicates two-hop without a full Sankey engine; a richer flow animation is a separate enhancement ticket.
- 2010–2024 production time-series (the production CSV only carries 2024 + 2025; a longer USGS pull is a data-sourcing follow-up).
- Generators for other wrangled tables (`asean-defense-yearly.csv`, etc.) — out of scope for BF-58.

**Not a goal**

- Editing front-face trade components (`CountryTradeBalanceBars.vue`, `CountryStackedArea.vue`) or their data. The only `AseanInfographic.vue` change is replacing the two back-face stub `<div>`s with the new components and correcting the back-face card prop strings.
- Changing the `layer` toggle, `CardFlip`, or the active-country state machine. If a state-machine change becomes necessary, the D6 contract assumption was wrong and the plan must be revisited.
- Inventing any figure. Where an anchor/CSV row does not exist, the design degrades honestly (D2) rather than fabricating.

---

## Key Technical Decisions

- **D1 (Decision, auto): Both green cards are per-active-country, NOT a fixed ASEAN-wide thesis view — because the existing card contract is strictly per-active-country and the ticket requires matching that contract.** Every other dock card (`CountryTradeBalanceBars`, `CountryStackedArea`) binds to `activeProfile` / `activeTradeStacked` and re-renders on country selection. The stub slots sit inside the same `CardFlip` whose front faces are per-country, and `AseanInfographic.vue`'s tab flips *both* cards for the *same* active country. A fixed ASEAN-wide back face would break the "same country, different lens" mental model the layer toggle establishes (script comment lines ~17–20). So the new components take the active country's slice. The ASEAN-wide concentration story is still surfaced — as on-card framing context within the active-country view (e.g. "Indonesia = 67% of world nickel" is itself a per-country world-share statement; the ASEAN-wide rollup is used only for the comparison baseline and the low-data framing in D2), not as a separate non-reactive view.

- **D2 (Decision, auto): Low-footprint countries get an honest, on-register "minor producer / negligible flows" state, not an empty axis or a fabricated bar — because the data is genuinely concentrated and DESIGN.md/PRODUCT.md forbid invented figures and reward editorial honesty.** Indonesia, Philippines, (Myanmar-excluded but its rare-earth story belongs to no slug), Malaysia, Vietnam, Thailand, Laos have *some* production/flow rows; Brunei, Cambodia, Singapore have effectively none. For a country with no material minerals data, the card renders a typographic statement in the card body (Encode Sans, AA-contrast white, e.g. "Not a critical-minerals producer at scale. ASEAN's mineral leverage concentrates in Indonesia, the Philippines and Myanmar.") plus the ASEAN-wide context line — *not* a blank chart and *not* a zero-height bar that reads as a render bug. This is a deliberate content state, designed and contrast-checked, not a fallback afterthought. The threshold for "material" is a single generator constant (D8).

- **D3 (Decision, auto): Card A (production / world-share) is a horizontal world-share bar set — the DESIGN.md stacked-bar / position-scaled primitive — NOT a pie, donut, or choropleth.** DESIGN.md §5 "The Stacked-Bar Is The Chart Rule" and the anti-references explicitly forbid pies/donuts and Tableau chrome. For the active country, the card shows that country's critical minerals as horizontal bars whose length encodes `share_of_world_pct` (the defensible takeaway: "Indonesia is 67% of the world's mined nickel"). Each bar is labelled with the mineral name + the share % + the absolute production with unit (so color is never the sole carrier — position/length + text label + the explicit % all carry it). The active country's bar sits against a faint full-width "rest of world" track (the One Voice Rule: the country's share is Meridian; the remainder is a low-α white track — a second saturated accent is not introduced). Bars are ordered by share descending, deterministic. This reuses the visual grammar of `CountryTradeBalanceBars` (d3 band scale, value labels with `tabular-nums`, axis-tag captions) so it sits natively in the dock.

- **D4 (Decision, auto): Card B (mineral-flow) is a two-hop horizontal flow band — origin (active ASEAN country) → China hub → end markets (West/Japan/Korea) — encoding the SCOUT-mandated two-hop reality, NOT a single-hop ASEAN→West Sankey and NOT a country×partner stacked area.** `_data/sources/baci-trade-minerals.SCOUT.md` §4/§6 is explicit: "Single hop in the Sankey will misrepresent. Two-hop visualization required." The flow is dominated by the active country's nickel-class exports by destination partner group (CHN/USA/EU/JPN/KOR/rest, from the flows rollup), rendered as a labelled horizontal proportional band (the DESIGN.md stacked-bar primitive at flow scale): segment width = USD share to each partner group; China is the dominant Meridian segment; a short annotation states the two-hop fact ("≈90% routes through China, which refines and re-exports to the West"). For countries with no material flow, D2 applies. This communicates the two-hop reality with a label + an honest single-bar proportional split rather than pretending to a full multi-stage Sankey engine (deferred). The "ASEAN nickel exports grew 5.9× since 2010" anchor is surfaced as the card's hero/eyebrow context, not a separate time-series (the flows file has 2010–2024 but the card's defensible takeaway is the 2024 destination split + the growth multiple as text).

- **D5 (Decision, auto): One generator, one emitted module, with a typed per-slug record + an ASEAN-wide record — because BF-56/57 each emitted one cohesive generated `.ts` and the two cards share the same underlying minerals domain.** `data/asean/minerals.generated.ts` exports: an interface set, `MINERALS_BY_SLUG: Record<string, CountryMinerals>` (each `CountryMinerals` carries `production: MineralShare[]` for Card A and `flows: FlowSegment[]` + `flowsTotalUsdM` + `flowsGrowthMultiple` for Card B, plus a `hasMaterialData` boolean for D2), and `MINERALS_ASEAN` (the ASEAN-wide context: total nickel share, growth multiple, the concentration sentence inputs). Mirrors the `country-hero.generated.ts` "GENERATED FILE — do not hand-edit" header + provenance comment convention exactly.

- **D6 (Decision, auto): Treat the dock-card slot as the contract; only the two stub `<div>`s and their back-face `CountryChartCard` prop strings change in `AseanInfographic.vue`.** The front faces, `CardFlip`, `layer` state, `activeProfile`/`activeSlug` flow, and `onActiveSlugUpdate` are untouched. The back-face `CountryChartCard` already exists with `eyebrow`/`title`/`meta`/`source` props; those strings are corrected to honest minerals citations (e.g. `source="USGS MCS2026"` for Card A, `source="BACI HS07 V202601 (mineral HS6 codes)"` for Card B — the existing back-face strings `USGS MCS2026 / BACI HS07 V202601` and the placeholder meta are reconciled to what each card actually shows). The new components receive `:profile`/`:data` + `:height` props shaped like the existing components so the slot swap is mechanical.

- **D7 (Decision, auto): Plain Node ESM `.mjs`, no new dependencies, fail-loud guards — matching BF-56/57 exactly.** `scripts/build-asean-trade-stacked.mjs` and `build-asean-country-hero.mjs` are the precedent: resolve `ROOT` from `import.meta.url`, `node:fs/promises` + `node:path` only, hand-built deterministic emitter (bare keys, fixed field order, rounded once), `fail()` → `process.exit(1)` on any source drift (unknown ISO3 not in the map and not in the explicit ignore set; missing expected mineral/year; row-count assertion). The only deviation from BF-56/57 is the quote-aware parser for the production CSV (D2/R2) — the flows CSV is comma-clean (verified: no quoted fields across all 8,845 rows) and may use the plain split, but a single shared quote-aware parser for both files is simpler and is the chosen approach.

- **D8 (Decision, auto): "Material data" threshold and citation strings are generator constants, surfaced in the file header.** A country is "material" for the minerals layer if it has ≥1 production row with non-empty `share_of_world_pct` OR a 2024 mineral-export-flow total ≥ a `MATERIAL_FLOW_USD_M` constant (set so IDN/PHL/LAO qualify and BRN/KHM/SGP/THA/VNM/MYS' negligible footprints resolve to the D2 honest state; the exact cutoff is an execution-time tuning detail bounded by the verified 2024 totals — IDN 27204, PHL 3046, LAO 483, others ≤ 211 — documented in the generator header). `MATERIAL_FLOW_USD_M` lives next to the citation constants so the editorial cut is auditable and reviewable in one place.

- **D9 (Decision, auto): Card B uses the nickel-class flow rollup as the spine, with non-nickel minerals folded into context, because nickel is ~99% of ASEAN mineral export value and the SCOUT two-hop warning is specifically about the nickel chain.** Verified rollup: ASEAN 2024 exporter flows are Nickel $23,478M vs Copper $7,631M (mostly intra-Asia, not the China-refining story), Lithium $53M, others negligible. Card B's defensible takeaway is the nickel destination split; copper/other are not given equal visual weight (they would dilute the one-takeaway rule and the two-hop narrative). This is a per-active-country nickel-flow card; if the active country's material flow is non-nickel the generator records that and the card label adapts (still position/label-encoded, never color-only).

---

## High-Level Technical Design

This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.

```
_data/wrangled/asean-minerals-production.csv  (186 rows, 4 quoted)
_data/wrangled/asean-minerals-flows.csv       (8845 rows, comma-clean)
        │
        ▼  shared QUOTE-AWARE parser (mandatory for production; safe for flows)
  production rows → { iso3, country_name, mineral, year, production, unit, world_total, share_pct }
  flow rows       → { asean_country, year, partner_group, asean_role, mineral_class, value_usd_m }
        │
        ├── Card A rollup (per slug):
        │     filter ASEAN iso3, year = 2025 (latest), share_pct non-empty
        │     → production: [{ mineral, sharePct, production, unit }] desc by sharePct
        │
        ├── Card B rollup (per slug):
        │     filter asean_country = slug-iso3, role = exporter, year = 2024,
        │            mineral_class = Nickel (D9), group by partner_group
        │     → flows: [{ partnerGroup, valueUsdM, pct }]  (CHN/USA/EU/JPN/KOR/rest)
        │     + flowsTotalUsdM, flowsGrowthMultiple (asean_nickel_exports_growth anchor)
        │
        ├── hasMaterialData per slug (D8 threshold)
        │
        └── ASEAN-wide rollup: total nickel world share, growth multiple, concentration inputs
        │
        ▼  emit deterministic TS (BF-56/57 header + provenance style):
           interfaces, MINERALS_BY_SLUG (fixed slug order), MINERALS_ASEAN
  data/asean/minerals.generated.ts
        │
        ▼  consumed by:
  components/asean/CountryMineralShareBars.vue   (Card A — share bars, D3)
  components/asean/CountryMineralFlowBand.vue    (Card B — two-hop band, D4)
        │  wired into the two CardFlip #back slots in
  components/infographics/AseanInfographic.vue   (D6 — slot swap only)
```

Determinism guarantees: fixed slug emission order (mirrors `country-profiles.ts` PROFILES order), minerals sorted by world share descending then mineral name, partner groups in fixed `CHN, USA, EU, JPN, KOR, OTHER` order, values rounded once at emit, no `Date.now()`.

Active-country reactive contract (unchanged): `AseanInfographic.vue` already computes `activeProfile`/`activeSlug`. The new back-face components receive the active country's `MINERALS_BY_SLUG[slug]` slice (via a small computed mirroring `activeTradeStacked`), so map selection + layer flip update the green faces exactly like the trade faces.

---

## Implementation Units

### U1. Minerals generator: parse, roll up, emit

**Goal:** A new on-demand Node ESM generator that transforms the two minerals CSVs into `data/asean/minerals.generated.ts`, byte-deterministically, matching the BF-56/57 `scripts/*.mjs` convention, with a quote-aware parser and fail-loud guards.

**Requirements:** R1, R2, R3, R9, R10; D5, D7, D8, D9.

**Dependencies:** none (first unit).

**Files:**
- `scripts/build-asean-minerals.mjs` (create) — name mirrors `scripts/build-asean-trade-stacked.mjs`.
- `data/asean/minerals.generated.ts` (generated output — not hand-edited after this unit).
- `package.json` (modify) — add `"gen:minerals": "node scripts/build-asean-minerals.mjs"` to `scripts`. No dependency changes.

**Approach:**
- Header comment block in the BF-56/57 style: what it does, the run lines (`node scripts/build-asean-minerals.mjs` / `npm run gen:minerals`), the source→output map, the determinism note, and the `MATERIAL_FLOW_USD_M`/citation constants explained (D8).
- Resolve `ROOT` from `import.meta.url`; `PROD_SOURCE = _data/wrangled/asean-minerals-production.csv`, `FLOW_SOURCE = _data/wrangled/asean-minerals-flows.csv`, `OUT = data/asean/minerals.generated.ts`.
- Implement one shared quote-aware CSV line parser (handles `"…,…"` fields; the production file has 4 such rows, the flows file has none — verified). Validate both headers exactly; `fail()` on mismatch.
- Constants: `ISO3_TO_SLUG` 9-entry table (mirrors `build-asean-trade-stacked.mjs`), `IGNORE_ISO3 = new Set(['MMR'])` for the per-slug map (MMR still feeds the ASEAN-wide rare-earths context), `SLUG_ORDER` mirroring `country-profiles.ts` PROFILES key order, `PARTNER_ORDER = ['CHN','USA','EU','JPN','KOR','OTHER']`, `PROD_YEAR = 2025`, `FLOW_YEAR = 2024`, `NICKEL_CLASS = 'Nickel'` (D9), `MATERIAL_FLOW_USD_M` (D8), `PROD_SOURCE_STRING = 'USGS MCS2026'`, `FLOW_SOURCE_STRING = 'BACI HS07 V202601'`.
- Card A rollup: ASEAN iso3 rows, `year === PROD_YEAR`, non-empty `share_of_world_pct` → per-slug `production: [{ mineral, sharePct, production, unit }]` sorted by `sharePct` desc then mineral name.
- Card B rollup: `asean_country` = slug ISO3, `asean_role === 'exporter'`, `year === FLOW_YEAR`, `mineral_class === NICKEL_CLASS` → per-slug `flows` grouped by `partner_group` in `PARTNER_ORDER`, with `valueUsdM` (rounded 1dp) and `pct`; `flowsTotalUsdM`; `flowsGrowthMultiple` from the `asean_nickel_exports_growth` anchor value (read as a constant traced to `_data/wrangled/asean-headline-stats.json`, cited in a comment).
- `hasMaterialData` per slug per D8.
- `MINERALS_ASEAN`: ASEAN-wide nickel world share (Indonesia + Philippines, from `asean_nickel_share_2025_pct` anchor), growth multiple, and the concentration sentence inputs (top producers).
- Hand-built deterministic emitter (bare keys, fixed field/slug order, rounded once) — same approach as `build-asean-trade-stacked.mjs`'s `emitRecord`. "GENERATED FILE — do not hand-edit" header + full provenance/anchor comment block like `country-hero.generated.ts`.
- Fail-loud guards: unknown ASEAN-region ISO3 not in `ISO3_TO_SLUG` and not in `IGNORE_ISO3` → exit 1; every slug present in the emitted map; the IDN nickel-flow rollup must reconcile to the `indonesia_nickel_exports_2024` anchor total within a 1dp tolerance (the verified $21,001.7M check) — a mismatch means a rollup bug and must fail; final one-line summary log in the existing scripts' style.

**Patterns to follow:**
- `scripts/build-asean-trade-stacked.mjs` — header style, `import.meta.url`→`ROOT`, constant tables, `fail()`/`round1()`, `emitRecord` hand-built emitter, row-count assertion, final `console.log` summary.
- `scripts/build-asean-country-hero.mjs` — provenance/anchor comment block style for the generated file header.
- `package.json` `scripts` block — ESM project, add the `gen:minerals` alias next to `gen:trade-stacked`.

**Test scenarios:** (this project has no automated test runner — `package.json` has only `build`/`dev`/`generate`/`preview`; verification is the build + a deterministic re-run + spot-checks traced to CSV/anchors, mirroring BF-56/57)
- Happy path: running the generator produces `data/asean/minerals.generated.ts` with all 9 slugs in `MINERALS_BY_SLUG`, a `MINERALS_ASEAN` object, and the documented interfaces.
- Determinism: two consecutive runs with no source change yield a byte-identical file (`git diff --quiet` after the second run).
- Quote-aware parse correctness: a synthetic check that the `KOR,"Korea, Republic of",…` rows parse to 8 fields (not 9); confirm production rollup is unaffected by the quoted KOR rows (KOR is not an ASEAN slug).
- Card A trace: Indonesia `production` contains Nickel `sharePct = 66.67`, `production = 2600000`, `unit = 'metric tons'` (traces to the 2025 IDN nickel CSV row and the `indonesia_nickel_2025` anchor); Tin `21.03`; Cobalt `14.19`.
- Card B trace: Indonesia `flows` to CHN ≈ `18973.6`, total `flowsTotalUsdM ≈ 21001.7` — reconciles to the `indonesia_nickel_exports_2024` anchor (CHN 18973.593196, total 21001.689874). `flowsGrowthMultiple = 5.9` (from `asean_nickel_exports_growth`).
- D2 threshold: Brunei, Cambodia, Singapore resolve `hasMaterialData = false`; Indonesia, Philippines, Laos resolve `true`. (Thailand/Vietnam/Malaysia resolve per the documented cutoff; assert each slug's boolean is stable across runs.)
- Fail-loud: a synthetic production row with an unknown ASEAN-region ISO3 not in the map and not in `IGNORE_ISO3` causes a non-zero exit naming the code; an `MMR` production row is folded into the ASEAN-wide rare-earths context but not the per-slug map (no error).
- Citation/provenance: every emitted `source`-bearing field uses `USGS MCS2026` (production) or `BACI HS07 V202601` (flows); the string `placeholder` appears nowhere in the output; the header carries the anchor inventory.

**Verification:** Generator exits 0, prints its summary, writes the module; a second run leaves the file unchanged (`git diff --quiet`); the Indonesia Card A shares and Card B China/total reconcile by hand to the named CSV rows and `thesis_b_minerals` anchors; `npm run gen:minerals` and `node scripts/build-asean-minerals.mjs` produce identical files.

---

### U2. Card A component — `CountryMineralShareBars.vue` (production / world-share)

**Goal:** A D3-in-Vue component that renders the active country's critical minerals as horizontal world-share bars (D3), with the D2 honest low-data state, replacing the line-~119 stub.

**Requirements:** R4, R6, R7, R8, R9; D1, D2, D3.

**Dependencies:** U1.

**Files:**
- `components/asean/CountryMineralShareBars.vue` (create).
- (No test file — project has no test runner; see Test scenarios.)

**Approach:**
- Mirror `components/asean/CountryTradeBalanceBars.vue` structure exactly: `<script setup lang="ts">`, `import * as d3`, `onMounted/onUnmounted/ref/watch`, typed `defineProps<{ data: CountryMinerals; height?: number }>()` (import `CountryMinerals` from `~/data/asean/minerals.generated`), `chartContainer` ref, `draw()` with `clientWidth === 0` → `setTimeout(draw, 80)` retry, `ResizeObserver` on mount, `onUnmounted` disconnect, `watch(() => props.data, draw, { deep: true })`, `<div ref="chartContainer" aria-hidden="true" />`, `:deep(svg)` responsive style.
- When `data.hasMaterialData === false` (D2): render the designed typographic state (no SVG bars) — an Encode Sans statement at AA-contrast white (α ≥ 0.85 for the primary line, α 0.6 only for the secondary ornamental line) plus the ASEAN-wide concentration context line. This is a real `v-if` branch in the template, contrast-checked, not a thrown error or blank.
- Material state: horizontal bars, one per mineral (sorted desc by share from the generated data). Bar length encodes `share_of_world_pct` against a faint full-width "rest of world" track (low-α white) so position/length carries magnitude; the country's share segment uses Meridian `hsl(218,60%,58%)` (the One Voice Rule — no second saturated accent). Each row carries: mineral name (label), the share `%` (tabular-nums), and the absolute production + unit — three independent encodings so color is never the sole carrier (R7). d3 `scaleBand` for rows, `scaleLinear` 0–100 for share width, same axis/label typography as `CountryTradeBalanceBars` (Encode Sans, sizes 9.5–11, weight 600/700, `tabular-nums`).
- Motion: any enter transition (e.g. bar grow) is gated — wrap d3 transitions in a `prefers-reduced-motion: reduce` media-query check (match `CardFlip`/existing components: no transition when reduced-motion is set; the simplest correct approach is to skip the d3 `.transition()` entirely under reduced motion and draw final state directly).
- AA contrast: all text white at α ≥ 0.85 for data labels (numbers/mineral names participate in the takeaway, not ornamental), α ≤ 0.6 only for the "rest of world" caption / source-adjacent ornament. Meridian on the navy card surface is the existing chart accent (already used by `CountryStackedArea`), acceptable as a non-text data fill.

**Patterns to follow:**
- `components/asean/CountryTradeBalanceBars.vue` — full component skeleton, d3 band/linear scales, value-label + caption typography, `fmtUsdB`-style formatter (here a `fmtShare`/`fmtProduction`), `:deep(svg)` style block, `aria-hidden` container.
- `components/asean/CountryStackedArea.vue` — Meridian accent usage on the dark card, gridline α values, right-edge label pattern.
- `DESIGN.md` §5 Stacked Bars + "Color is never the sole carrier" (PRODUCT.md Accessibility) + the α-ladder AA rule.

**Test scenarios:**
- Happy path: Indonesia selected → bars for Nickel (66.67%), Tin (21.03%), Cobalt (14.19%), … in descending order, each with mineral label + % + absolute production visible.
- Active-country reactivity: changing `props.data` (country switch) re-draws via the `watch`; Philippines shows Nickel ~6.92% + Cobalt; the bar set changes with the country.
- D2 low-data state: Brunei/Cambodia/Singapore (`hasMaterialData === false`) render the typographic statement + ASEAN context line, no SVG bar group, no console error, no zero-height bar artifact.
- Edge: a single-mineral country (e.g. Laos — Tin only) renders exactly one bar without layout collapse; the `clientWidth === 0` path retries instead of drawing a broken chart.
- Reduced motion: with `prefers-reduced-motion: reduce`, bars render in final state with no transition (verified by toggling the OS/emulated setting); no animation runs.
- Contrast: data labels are white α ≥ 0.85 on the card surface (spot-check the computed contrast ≥ 4.5:1 for body text, ≥ 3:1 for the large share numerals) at 1280×800.
- Color-not-sole-carrier: with the Meridian fill desaturated to greyscale (simulated), the chart is still fully readable from length + label + % text.

**Verification:** Component renders correct share bars for material countries and the designed honest state for the three non-producers; reactivity, reduced-motion, and AA contrast confirmed at 1280×800 in light and dark; visually consistent with the front-face trade card register.

---

### U3. Card B component — `CountryMineralFlowBand.vue` (two-hop mineral flow)

**Goal:** A D3-in-Vue component that renders the active country's nickel-class export destinations as a labelled two-hop proportional flow band (D4/D9), with the D2 honest low-data state, replacing the line-~150 stub.

**Requirements:** R5, R6, R7, R8, R9; D1, D2, D4, D9.

**Dependencies:** U1.

**Files:**
- `components/asean/CountryMineralFlowBand.vue` (create).
- (No test file — project has no test runner; see Test scenarios.)

**Approach:**
- Same component skeleton as U2 / `CountryTradeBalanceBars.vue` (props `data: CountryMinerals` + `height?`, container ref, `draw()` retry, `ResizeObserver`, `onUnmounted`, deep `watch`, `aria-hidden`, `:deep(svg)`).
- D2 state when `hasMaterialData === false` (or no material nickel flow): the designed typographic statement (origin country has negligible direct critical-mineral exports; ASEAN's flow concentrates in Indonesia) at AA contrast — same honest-state pattern as U2, not blank.
- Material state: a single full-width horizontal proportional band segmented by destination partner group in fixed `PARTNER_ORDER` (CHN dominant Meridian segment; USA/EU/JPN/KOR/rest as the white-α ladder, ordered, each segment ≥ a min label width or folded into a labelled "rest" segment to avoid cramped slivers — mirror `CountryStackedArea`'s `bandHeight < 14 → skip` guard logic adapted to width). Segment = USD share to that partner group. Every visible segment carries a text label (partner name + % or $) so color is not the sole carrier (R7); China's dominance is stated, not just colored.
- Two-hop annotation (D4): a single concise caption line beneath/above the band stating the two-hop reality — e.g. "≈90% routes through China, which refines and re-exports refined material to the US & EU" — plus the growth context "ASEAN nickel exports ×5.9 since 2010" (from the generated `flowsGrowthMultiple`, traced to `asean_nickel_exports_growth`). This text is what makes the single-bar honest about the two-hop chain without a full Sankey (deferred). Caption is AA-contrast body text (white α ≥ 0.85), Encode Sans 400.
- Motion gating identical to U2 (skip d3 transitions under `prefers-reduced-motion: reduce`; draw final state).
- Color discipline: Meridian for the China segment only; remaining segments are the white α-ladder, never a second saturated accent (DESIGN.md One Voice Rule). The DESIGN.md "Stacked Bars" segment-separator (`1px solid rgba(0,0,0,0.30)`) for chart-internal definition.

**Patterns to follow:**
- `components/asean/CountryStackedArea.vue` — `PARTNER_COLOR`/`PARTNER_LABEL` maps (reuse the same China=Meridian / USA / EU palette intent; here the non-China groups stay on the white ladder per One Voice since this is a single-bar split, not a multi-band area), the cramped-band skip guard, right-edge label technique, x/value label typography.
- `components/asean/CountryTradeBalanceBars.vue` — proportional rect + in-bar value label + caption-row pattern, `:deep(svg)` style, `aria-hidden` container.
- `DESIGN.md` §5 Stacked Bars + `_data/sources/baci-trade-minerals.SCOUT.md` §4/§6 (the two-hop mandate the caption must honor).

**Test scenarios:**
- Happy path: Indonesia → a band where the China segment is dominant (~90% of nickel-export value), with labelled USA/EU/JPN/KOR/rest segments; the two-hop caption and the ×5.9 growth line are present; the China share text matches the generated `flows` pct.
- Trace: the China segment value/pct reconciles to the generated `flows` CHN entry (≈ $18,973.6M of ≈ $21,001.7M total) which itself traces to the `indonesia_nickel_exports_2024` anchor.
- Active-country reactivity: switching to Philippines re-draws (its nickel-flow split, smaller total); switching to a non-material country shows the D2 state; the `watch` drives all transitions.
- Edge: tiny partner segments below the label-width threshold are folded into a single labelled "Other" segment (no unlabelled sliver, no overlap) — mirrors the `bandHeight < 14` skip pattern.
- Two-hop integrity: the card never implies a direct ASEAN→US/EU bulk flow; the caption explicitly states the China refining/re-export hop (the SCOUT §4 requirement) — assert the caption text is present and correct.
- Reduced motion: with `prefers-reduced-motion: reduce`, the band renders final-state with no segment animation.
- Contrast + color-not-sole-carrier: segment labels white α ≥ 0.85 on the card; desaturating to greyscale still leaves the split readable from segment width + labels; ≥ 4.5:1 / ≥ 3:1 at 1280×800.

**Verification:** Component renders the correct two-hop nickel-flow band for material countries (China-dominant, labelled, two-hop caption present) and the honest state otherwise; numbers trace to the generated module and the `thesis_b_minerals` anchors; reactivity/reduced-motion/AA confirmed at 1280×800 light + dark.

---

### U4. Wire both components into the dock back faces

**Goal:** Replace the two stub `<div>`s in `components/infographics/AseanInfographic.vue` with the new components, preserve the active-country contract, and correct the back-face card prop strings to honest minerals citations.

**Requirements:** R4, R5, R8, R9; D1, D6.

**Dependencies:** U2, U3.

**Files:**
- `components/infographics/AseanInfographic.vue` (modify) — back-face slot contents (lines ~111–122 and ~142–153) and a small `activeMinerals` computed; no front-face or state-machine changes.

**Approach:**
- Add `import { MINERALS_BY_SLUG } from '~/data/asean/minerals.generated'` and a computed `activeMinerals` mirroring the existing `activeTradeStacked` pattern (`activeSlug.value ? MINERALS_BY_SLUG[activeSlug.value] : undefined`).
- Card A back face (currently the `Critical-mineral view wires next pass.` stub `<div>` inside the back-slot `CountryChartCard`): replace the `<div class="asean-infographic__layer-stub">…</div>` with `<CountryMineralShareBars v-if="activeMinerals" :data="activeMinerals" :height="220" />`. Correct the `CountryChartCard` props: `eyebrow="Critical minerals · 2025"`, `title` describing world-share (e.g. "Share of world mine production"), `meta="% of world · USGS MCS2026"`, `source="USGS MCS2026"` (the existing `USGS MCS2026 / BACI HS07 V202601` and `USD billions` meta are wrong for this card — Card A is production share, not USD).
- Card B back face (the `Mineral-flow chart wires next pass.` stub): replace with `<CountryMineralFlowBand v-if="activeMinerals" :data="activeMinerals" :height="220" />`. Card props: keep `eyebrow="Mineral flows"`, retitle to the destination-split framing (e.g. "Where the nickel goes · 2024"), `meta` honest to USD share, `source="BACI HS07 V202601 (mineral HS6 codes)"` (already correct).
- Auto-imported components (Nuxt) — confirm the new `components/asean/*.vue` resolve by their PascalCase names the same way `CountryStackedArea`/`CountryTradeBalanceBars` do (no manual import needed in the template; the script `import` is only for the data module + types).
- Do not touch the `layer` toggle, `CardFlip`, `onActiveSlugUpdate`, the `header` block, or the front faces.

**Patterns to follow:**
- The existing front-face wiring in the same file: `<CountryStackedArea :data="activeTradeStacked" :partners="CHART_PARTNERS" :height="220" />` inside its `CountryChartCard`, and the `activeTradeStacked` computed — mirror that exact shape for `activeMinerals`.
- `data/asean/trade-stacked.ts` import style at the top of `AseanInfographic.vue`.

**Test scenarios:**
- Happy path: toggling the layer tab to "Green Transition" flips both cards; with Indonesia active, Card A shows the world-share bars and Card B shows the two-hop nickel-flow band (no stub text anywhere).
- Reactivity: selecting a different country on the map updates both green faces in lockstep with the trade faces; selecting a non-material country shows the D2 honest state on both.
- Contract preservation: the `layer` toggle still flips both cards in unison; front faces (`CountryTradeBalanceBars` / `CountryStackedArea`) are unchanged and still correct; `CardFlip` reduced-motion cross-fade still works.
- Prop correctness: Card A `CountryChartCard` shows the corrected eyebrow/title/meta/source (no leftover `USD billions` / dual-source string mismatch); Card B shows honest USD-share framing.
- Test expectation: no behavioral unit test — this unit is a template slot swap + one computed; coverage is the visual/build acceptance in U5 plus the per-component scenarios in U2/U3.

**Verification:** Both stubs are gone; the green layer renders both real components for the active country; the layer toggle and country selector behave exactly as before for both faces; no front-face regression.

---

### U5. Build + design-fidelity acceptance (1280×800, light + dark, reduced-motion, AA)

**Goal:** Prove the layer compiles, renders at the canon size with the required design fidelity, gates motion, hits AA contrast, and that every number traces to source.

**Requirements:** R7, R9, R10; all D.

**Dependencies:** U1, U2, U3, U4.

**Files:**
- No source edits. Exercises the new components + generated module against `components/infographics/AseanInfographic.vue` at 1280×800.

**Approach:**
- `npm run build` (`nuxt build`) must pass with no type errors against `data/asean/minerals.generated.ts` and the two new components (the D5/D6 contracts hold).
- Run the infographic locally; switch to the "Green Transition" layer; cycle the active country across all 9 slugs (default Indonesia + the other 8 via the map/selector). For each material country confirm Card A shows correct world-share bars and Card B the two-hop flow band; for the three non-material countries confirm the designed honest state on both cards (not blank, not a render artifact).
- At 1280×800 (the BFNA canon) verify: no clipped labels/axes, no overflow, both cards sit in the dock grid correctly, the `CardFlip` 3D flip works and its reduced-motion cross-fade works.
- Light + dark: verify both themes render with AA contrast (body ≥ 4.5:1, large ≥ 3:1) — the cards sit on the navy gradient; confirm the white α-ladder text tiers used for data are ≥ 0.85 and only ornamental text uses ≤ 0.6 (PRODUCT.md rule).
- Reduced motion: with `prefers-reduced-motion: reduce` emulated, confirm no d3 enter animation runs in either new component and `CardFlip` cross-fades instead of rotating.
- Color-not-sole-carrier: greyscale-simulate both cards; confirm each remains fully readable from position/length + text labels (R7).
- Source trace: spot-check Indonesia Card A (Nickel 66.67% → `indonesia_nickel_2025` anchor + CSV row) and Card B (China ≈$19.0B of ≈$21.0B → `indonesia_nickel_exports_2024` anchor) by hand.

**Patterns to follow:**
- The repo's `screenshots/` / `test-screenshots/` and `browser-test-bf67.spec.ts` conventions for capturing 1280×800 evidence (ad-hoc, not wired to an npm test script — same as BF-56/57's acceptance unit).
- BF-56 plan U3 acceptance unit shape (`docs/plans/2026-05-18-001-feat-asean-trade-stacked-csv-generator-plan.md`).

**Test scenarios:**
- `nuxt build` exits 0 with no TypeScript errors referencing `minerals.generated`, `CountryMineralShareBars`, or `CountryMineralFlowBand`.
- All 9 countries render the correct green-layer state (material → real charts; non-material → designed honest state) with no stub text remaining anywhere.
- 1280×800: no label/axis clipping or overflow in either back-face card; flip transition intact.
- Light + dark both pass AA (spot-checked contrast on data labels and the honest-state text).
- Reduced-motion: no chart animation in either component; `CardFlip` cross-fades.
- Greyscale: both cards readable without color.
- Trace: the two named Indonesia spot-checks reconcile to the `thesis_b_minerals` anchors and CSV rows.
- Test expectation: manual/visual + build gate — no automated runner; acceptance is the build pass plus the documented visual/contrast/motion checks (same posture as BF-56/57).

**Verification:** `nuxt build` passes; both stubs are replaced by real, source-traced, design-faithful charts; AA + reduced-motion + color-not-sole-carrier confirmed at 1280×800 in light and dark; Indonesia spot-checks trace to anchors.

---

## System-Wide Impact

- **New consumers of `data/asean/minerals.generated.ts`:** only the two new components, themselves used only inside the two existing `CardFlip` back slots in `components/infographics/AseanInfographic.vue`. No other repo file imports the module (greenfield). Mirrors the BF-56 `trade-stacked.ts` / BF-57 `country-hero.generated.ts` blast radius.
- **`AseanInfographic.vue` change is contained:** two stub `<div>`s → two components, one new computed, four corrected `CountryChartCard` prop strings. Front faces, `CardFlip`, `layer` state, and the active-country machine are untouched (D6). If a state-machine change proves necessary, the D6 assumption was wrong and the plan is revisited before merge.
- **No runtime/SSR risk:** the generated file is a static TS module imported at build time (same as `trade-stacked.ts` / `country-hero.generated.ts`); no new fetch, no new dependency, no Nuxt config change. The two new components follow the existing client-side d3 `onMounted` pattern (the existing charts already render this way under SSR with `aria-hidden` containers).
- **Reproducibility:** both source CSVs are tracked (`_data/` is not gitignored, per `_data/README.md`); the generator is idempotent (D7), so regeneration is a safe, reviewable commit. Anchor reconciliation guard (U1) catches rollup drift at generation time.
- **Editorial honesty surface:** the D2 low-data state is content, not an error path — it ships on 3 of 9 countries and is part of the portfolio-quality bar (PRODUCT.md "Design carries the pitch"). Reviewers should evaluate it as designed copy, not a fallback.

---

## Risks & Mitigations

- **R (data-rollup): the production CSV's 4 quoted rows (`KOR,"Korea, Republic of",…`) break a naive `split(',')`.** This is the single most likely silent-corruption vector and the explicit reason BF-56's plain-split approach cannot be copied wholesale. Mitigation: R2/D7 mandate a quote-aware parser for the production file; U1's test scenario asserts the quoted rows parse to 8 fields and that the (non-ASEAN) KOR rows don't pollute the ASEAN rollup. The flows file is verified comma-clean but uses the same shared parser for safety.
- **R (data-rollup): the flow rollup must reconcile to the headline anchors or the numbers on screen are wrong.** Mitigation: U1 hard-asserts the Indonesia 2024 nickel-flow rollup equals the `indonesia_nickel_exports_2024` anchor (verified $21,001.7M total / $18,973.6M China) within 1dp; a mismatch fails the generator. ASEAN-wide nickel rollup independently verified against `asean_nickel_exports_growth` ($23,477.7M).
- **R (data-rollup): production CSV only has 2024 + 2025 — no time series.** Mitigation: Card A is a world-share snapshot (2025, the latest), not a trend; the "growth" narrative lives on Card B via the `asean_nickel_exports_growth` multiple (flows file does have 2010–2024). A production time series is explicitly deferred. The defensible takeaway (concentration) does not need a trend.
- **R (data-rollup): MMR (Myanmar) leads ASEAN rare earths but has no country slug/profile.** Mitigation: MMR is excluded from the per-slug map (consistent with BF-56/57) but its rare-earths figure feeds the `MINERALS_ASEAN` concentration context so the editorial story ("Indonesia, Philippines, **and Myanmar**") stays true; D2's honest-state copy references it without needing an MMR card.
- **R (design-fidelity): the concentrated data risks 3 of 9 cards looking empty — the "Tableau-empty-state" failure DESIGN.md forbids.** Mitigation: D2 makes the low-data state a *designed*, contrast-checked typographic statement with ASEAN context, evaluated as portfolio copy in U2/U3/U5 — not a blank chart. This is the highest design-fidelity risk and is treated as a first-class deliverable, not a fallback.
- **R (design-fidelity): two new chart types could drift from the cinematic register and read as a Tableau dashboard.** Mitigation: D3/D4 explicitly choose the DESIGN.md stacked-bar/position primitive (not pie/donut/choropleth/dropdown), reuse `CountryTradeBalanceBars`/`CountryStackedArea` typography and the One Voice Meridian discipline, and U5 gates light+dark+1280×800+greyscale+AA+reduced-motion as a single acceptance.
- **R (design-fidelity): a literal two-hop Sankey is tempting but heavy and out of scope.** Mitigation: D4 deliberately encodes two-hop via a proportional band + an explicit caption honoring the SCOUT §4 mandate, deferring a full Sankey engine. The risk is the caption being missed; U3's test scenario asserts the two-hop caption is present and correct.
- **R: AA contrast on the navy gradient with the white α-ladder.** Mitigation: D2/U2/U3 confine data text to α ≥ 0.85 and ornament to ≤ 0.6 (PRODUCT.md rule); U5 spot-checks computed contrast in light + dark at 1280×800.

---

## Acceptance Criteria (BF-58)

1. Both stubs in `components/infographics/AseanInfographic.vue` (line ~119 "Critical-mineral view wires next pass." and line ~150 "Mineral-flow chart wires next pass.") are replaced by real, data-driven chart components.
2. Card A renders the active country's critical-mineral **world-share** (production) visual; Card B renders the active country's **two-hop mineral-flow** visual; both react to the country selector and the layer toggle exactly like the front faces (per-active-country contract preserved — D1).
3. Countries with no material minerals data render a designed, AA-contrast honest state (not blank, not a render artifact) — D2.
4. A new deterministic generator `scripts/build-asean-minerals.mjs` emits `data/asean/minerals.generated.ts`; second run = no diff; invocable as `npm run gen:minerals` and `node scripts/build-asean-minerals.mjs`.
5. The generator uses a quote-aware parser (production CSV has quoted rows) and fails loud on source drift / anchor-reconciliation mismatch.
6. Every on-screen number traces to a `_data/wrangled` CSV row or a named `thesis_b_minerals` anchor; `source:` strings are the real `USGS MCS2026` (production) / `BACI HS07 V202601` (flows) citations; no `placeholder` text remains.
7. Reduced-motion gating verified (no d3 enter animation under `prefers-reduced-motion: reduce`); AA contrast verified (body ≥ 4.5:1, large ≥ 3:1) in light + dark; color is never the sole carrier (greyscale-readable).
8. Design fidelity confirmed at 1280×800 (cinematic register, DESIGN.md stacked-bar primitive, One Voice Meridian, Encode Sans 400/600, no Tableau chrome); no front-face regression.
9. `npm run build` passes.

---

## Auto-Resolved Decisions Summary

All BF-58 ambiguities resolved without user input (autonomous mode). Full rationale in Key Technical Decisions:

- **What each card shows (ticket Q1):** Card A = per-active-country critical-mineral **world-share horizontal bars** (D3 — the DESIGN.md stacked-bar/position primitive, not pie/donut); Card B = per-active-country **two-hop nickel-flow proportional band** with an explicit ASEAN→China→West caption (D4/D9 — honoring the SCOUT §4 two-hop mandate; nickel is the spine because it is ~99% of ASEAN mineral export value).
- **Per-active-country vs ASEAN-wide (ticket Q2):** **Per-active-country** (D1) — the existing card contract is strictly per-active-country and the layer toggle establishes "same country, different lens"; the ASEAN-wide concentration story is surfaced as on-card context + the D2 low-data framing, not a separate non-reactive view.
- **Data module shape + generator (ticket Q3):** one `scripts/build-asean-minerals.mjs` emitting one `data/asean/minerals.generated.ts` with `MINERALS_BY_SLUG` + `MINERALS_ASEAN` (D5), plain no-deps `.mjs` + fail-loud + deterministic emitter matching BF-56/57 (D7), with a mandatory quote-aware parser for the quoted production CSV (R2/D7) and an anchor-reconciliation guard.
- **New components (ticket Q4):** two components under `components/asean/` (`CountryMineralShareBars.vue`, `CountryMineralFlowBand.vue`) cloning the `CountryTradeBalanceBars`/`CountryStackedArea` D3-in-Vue skeleton (R6); slot-swapped into the existing `CardFlip` back faces with corrected `CountryChartCard` prop strings (D6).
- **Acceptance (ticket Q5):** both stubs replaced; reduced-motion + AA + greyscale + 1280×800 light/dark verified; generator deterministic; numbers trace to CSV/anchors; `npm run build` passes (Acceptance Criteria 1–9).

**Editorial decision called out for reviewers (non-blocking):** D2's low-data honest state ships on Brunei/Cambodia/Singapore (≈3 of 9) and is a designed deliverable, not a fallback — it should be reviewed as portfolio copy. D9 deliberately makes nickel the flow spine and does not give copper/lithium equal visual weight (one-takeaway rule); the data supports this (nickel = ~99% of ASEAN mineral export value, 2024).
