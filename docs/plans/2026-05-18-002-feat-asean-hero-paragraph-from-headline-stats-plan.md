---
title: "feat: ASEAN — wire hero + paragraph from real headline stats; resolve top-trade source"
type: feat
status: active
date: 2026-05-18
ticket: BF-57
---

# feat: ASEAN — wire hero + paragraph from real headline stats; resolve top-trade source

## Summary

Replace the hand-fabricated `hero` and `paragraph` values in `data/asean/country-profiles.ts` with cite-ready figures, and **explicitly resolve the long-standing top-exports/imports data-source question** that has blocked this file since BF-55.

Two parts:

1. **Unblocked, high-value (do now):** Each of the 9 countries' `hero` becomes a real "two-way trade with China, 2024" figure, **generated deterministically** from the same canonical CSV BF-56 already proved (`_data/wrangled/asean-flows-yearly.csv`, `metric=trade_goods`, partner `CHN`, both directions summed). Each `paragraph` becomes **curated prose constrained to real anchors** from `_data/wrangled/asean-headline-stats.json` and the `_data/sources/*.SCOUT.md` files — every quantitative claim in a paragraph must trace to a real anchor or be removed. The placeholder-mirror comment block at the top of the file is removed.

2. **Blocked, honestly deferred:** `topExports[]` / `topImports[]` need HS-product-level composition (Coal, Palm oil, Integrated circuits…). **No HS-product source exists or is cheaply recoverable** (see Decision D1 — investigated exhaustively, including the data branch). These arrays are **left untouched but clearly marked as unverified placeholder**, with a documented rationale and a written follow-up note. They are NOT fabricated, regenerated, or guessed — this is a portfolio piece where a wrong sourced-looking number is worse than an honest deferral.

The `CountryProfile` / `TradeItem` interface shape is preserved exactly (D5). `npm run build` must pass; profile cards must stay intact at 1280×800.

This is a **headless / autonomous-mode** plan: there is no upstream `ce-brainstorm` doc for BF-57 (the only brainstorms in `docs/brainstorms/` are straits-related), and no user is available to resolve choices. Every ambiguity is auto-resolved inline and recorded as a `Decision (auto): … because …` line.

---

## Problem Frame

`data/asean/country-profiles.ts` drives the ASEAN infographic's right-side title block (`components/infographics/AseanInfographic.vue` → flag, name, `hero.value`, `hero.label`, `paragraph`) and the dock cards (`components/asean/CountryNarrativeCard.vue`, `CountryParagraphCard.vue`, `CountryTradeBalanceBars.vue`). It currently carries hand-fabricated placeholder values across all four content fields per country, with a file-header comment that openly admits the hero values "mirror placeholder-data.ts (China two-way trade)" and that top-exports/imports are "OEC 2023 / UN Comtrade composition snapshots — directionally accurate, ranking-correct."

BF-56 (just merged) established the pattern for this kind of work: a deterministic, fail-loud, no-dependency Node ESM generator under `scripts/` that turns a canonical `_data/wrangled/*.csv` into a byte-stable TS module the components consume unchanged. BF-57 extends the same pattern to the profile hero, and confronts the part BF-56 deferred: the profile's qualitative + composition content.

The `_data/README.md` flags this exact issue as the **"Open mapping question"**: `topExports/topImports` need HS-product composition, but the pulled BACI bilateral is country-level only. This plan's central job is to resolve that question with a decision and evidence, not to hand-wave it.

---

## Requirements

- **R1.** Each of the 9 profiles' `hero` carries a real, citable "two-way trade with China, 2024" value derived from `_data/wrangled/asean-flows-yearly.csv` (`metric=trade_goods`, `partner_group=CHN`, both `direction` rows summed for `year=2024`). The Indonesia value must reconcile to ≈`$143B` (68211.7 + 74356.3 = 142568 → "$143B"), confirming the derivation matches the headline-stats anchor `thesis_a_d_flows.indonesia_china_trade_2024`.
- **R2.** The hero `value` string format and `label` string stay consistent with the consuming component's expectation (`AseanInfographic.vue` and `CountryNarrativeCard.vue` render `hero.value` then `hero.label` as-is). Format: `value` like `"$143B"`, `label` like `"Two-way trade with China, 2024"`.
- **R3.** Each of the 9 profiles' `paragraph` is rewritten so that **every quantitative or factual claim traces to a real anchor** in `_data/wrangled/asean-headline-stats.json` or a `_data/sources/*.SCOUT.md` file. Claims with no backing anchor are softened to qualitative framing or removed. No invented percentages, multiples, or dollar figures.
- **R4.** The top-of-file comment block that admits the placeholder-mirror provenance is removed and replaced with an honest comment describing the new provenance (generated hero from BACI; curated paragraph from headline-stats anchors; top-trade composition explicitly deferred — see R6).
- **R5.** The exported `CountryProfile` and `TradeItem` interface shapes, the `PROFILES` record keys (9 slugs), the `flag()` helper, and the `profileBySlug()` function are preserved exactly. `components/asean/*` cards and `components/infographics/AseanInfographic.vue` compile and render with no component edits.
- **R6.** The top-trade data-source question is **explicitly resolved and documented** (D1). `topExports[]` / `topImports[]` arrays are left in place (so cards keep rendering) but marked in-code as unverified placeholder, and a written follow-up note is added to `docs/` capturing the rationale and what a future HS-product wiring would require. No fabricated/guessed product composition is introduced; the existing arrays are not "refreshed" with new made-up numbers.
- **R7.** `npm run build` (`nuxt build`) passes after the change. The profile cards (`CountryNarrativeCard`, `CountryParagraphCard`, `CountryTradeBalanceBars`) and the title block render intact at 1280×800 for all 9 countries, with the new hero values visible and non-empty.
- **R8.** The hero derivation is reproducible: a generator (extending the BF-56 pattern) emits the hero values deterministically (same input → byte-identical output), invocable via `npm run` and direct `node`, fail-loud on source drift.

---

## Scope Boundaries

**In scope**
- A generator (BF-56-pattern, plain Node ESM under `scripts/`) that derives each country's 2024 two-way-China-trade hero figure from `_data/wrangled/asean-flows-yearly.csv` and writes it into `data/asean/country-profiles.ts`.
- Curated rewrite of all 9 `paragraph` strings, constrained to real anchors (a manual editorial step, anchor-checked — see D4).
- Removal of the placeholder-mirror comment; honest replacement provenance comment.
- An in-code marker on `topExports`/`topImports` plus a written follow-up note documenting the deferred HS-product source (D1).
- An npm script entry for the generator.

**Deferred to Follow-Up Work**
- **`topExports[]` / `topImports[]` real HS-product composition.** Explicitly deferred per D1. A follow-up note (`docs/plans/` companion or a `todos/` entry — see U4) records: the blocker, why no source exists, and the concrete path to wire it later (re-download BACI HS07 V202601 ZIP → write an HS-product filter notebook → new `_data/wrangled/asean-trade-composition.csv` → extend the generator). This is a separate ticket.
- The "Green Transition" / critical-minerals back-of-card layer (`AseanInfographic.vue` stub) — separate dataset, separate ticket (already deferred by BF-56).
- Wiring GBR/JPN/KOR or USA hero alternates — the design surfaces a single China-trade hero; the others exist in the CSV and are a one-line config change later.
- The Singapore entrepot re-export caveat (BACI does not strip SGP re-exports, per `_data/sources/baci-trade.SCOUT.md` §8) — a methodology footnote, editorial, noted not actioned (consistent with BF-56's treatment).

**Not a goal**
- Editing any `components/asean/*` or `components/infographics/AseanInfographic.vue` render logic. The only component-facing change is the data they import. A required component edit means the D5 contract assumption was wrong and the plan must be revisited.
- Fabricating, estimating, or "directionally approximating" product composition for `topExports`/`topImports`. Explicitly forbidden by the ticket and D1.
- Changing `data/asean/trade-stacked.ts` (BF-56's output) or `data/asean/country-tiers.ts`.

---

## Key Technical Decisions

- **D1 (Decision, auto): Resolve the HS-product blocker as Option (b) — wire hero+paragraph now, explicitly DEFER `topExports`/`topImports`, do not fabricate — because an exhaustive search confirms no HS-product-level source exists or is cheaply recoverable.** Evidence gathered during planning:
  - `_data/raw/baci-asean-bilateral-2010-2024.csv` header is `t,i,j,trade_usd_thousands,qty_tons,i_iso3,i_name,j_iso3,j_name,direction` — country↔country totals, **no `k`/HS6 column**. Cannot give product composition.
  - The file the ticket asked me to check for, `baci-asean-bilateral-2010-2024-raw-codes.csv`, **does not exist in `_data/raw/`**. It exists only on the data branch at `origin/claudio/asean-third-infographic-data:_process/asean/data-raw/baci-trade/baci-asean-bilateral-2010-2024-raw-codes.csv`, and its header is `t,i,j,trade_usd_thousands,qty_tons` — "raw-codes" means *raw ISO-numeric country codes* (`i`/`j` not yet ISO3-mapped), **NOT HS product codes**. Still country-level only. Verified by `git show`.
  - `_data/raw/` contains exactly three CSVs: `baci-asean-bilateral-2010-2024.csv`, `baci-asean-by-partner-group-2010-2024.csv`, `baci-asean-minerals-bilateral-2010-2024.csv`. Only the minerals file has an `hs6` column, and it is restricted to **15 critical-mineral HS6 codes** (per `_data/sources/baci-trade-minerals.SCOUT.md` §2: nickel ore, ferronickel, cobalt ore, copper ore, etc.). It cannot produce general top-export/import composition — no coal, palm oil, garments, telephones, integrated circuits, rice, footwear, vehicles.
  - `_data/sources/baci-trade.SCOUT.md` §6 confirms product-level was always optional ("Country totals sufficient for fault-line/hedging thesis. HS chapter breakdowns optional for 'what's traded' annotation layer") and never pulled at HS-product granularity for general trade.
  - The data-branch wrangle notebooks (`_process/asean/notebooks/01..06`) contain no general HS-product composition wrangle. Recovering composition would require re-downloading the 1.68 GB BACI HS07 V202601 ZIP and authoring a new filter — out of scope for a data-wiring ticket and not a planning-time action.
  - Per the ticket's own guidance and CCM's "design is the pitch" posture, a wrong sourced-looking number is worse than an honest deferral. **Therefore: Option (a) is impossible; Option (b) is the default and is selected.** The placeholder arrays stay (cards keep rendering) but are marked unverified in-code with a follow-up note (U4). They are not regenerated with new guesses.
- **D2 (Decision, auto): The hero is generator-driven; the paragraph is curated-from-anchors. Because hero is a single deterministic number from a canonical CSV (fully automatable, BF-56 already proved the exact pipeline), but a paragraph is editorial prose that cannot be machine-generated without inventing connective language — and inventing prose that *sounds* sourced is the exact failure mode D1 forbids.** The generator owns `hero.value` + `hero.label` for all 9. The 9 `paragraph` strings are hand-rewritten in a single reviewed pass, each claim cross-checked against a named anchor (D4). This split keeps the reproducible part reproducible and the editorial part honest and auditable.
- **D3 (Decision, auto): Hero source = `_data/wrangled/asean-flows-yearly.csv`, `metric=trade_goods`, `partner_group=CHN`, sum both `direction` rows for `year=2024`, per country. Because this is the *identical* canonical source and aggregation BF-56 used for the trade-stacked chart, and it reconciles exactly to the existing Indonesia `$143B` hero** (IDN 2024 CHN: `asean_to_partner` 68211.72932 + `partner_to_asean` 74356.27893 = 142568.0 → rounds to "$143B"). It also matches `_data/wrangled/asean-headline-stats.json` → `thesis_a_d_flows.indonesia_china_trade_2024` (exports 68211.7M / imports 74356.3M), giving an independent cross-check. Reusing BF-56's exact source avoids a second provenance and a second source string.
- **D4 (Decision, auto): Every paragraph claim must name-trace to one of: `_data/wrangled/asean-headline-stats.json` keys, a `_data/sources/*.SCOUT.md` figure, or the generated hero itself. Claims without an anchor are softened to qualitative framing or cut. Because R3 requires it and D1's no-fabrication rule applies to prose as much as numbers.** Concretely, the available anchor inventory is thin and Indonesia-heavy, so paragraphs will be uneven by design (Indonesia gets specific numbers; smaller countries get honest qualitative framing). Anchor inventory available:
  - **Indonesia:** `thesis_a_d_flows.indonesia_china_trade_2024` (China trade), `thesis_b_minerals.iea_nickel_growth_indonesia_share` (90% of 2020–2024 global nickel-supply *growth*), `thesis_b_minerals.indonesia_nickel_exports_2024` (~$21.0B, ~90% to China), `thesis_b_minerals.asean_nickel_exports_growth` (5.9×), `policy_anchors.indonesia_esdm_17_2025_quota_cut` (44.85% quota cut), `japan_indonesia_fdi_stock_growth`.
  - **Multi-country:** `thesis_a_d_flows.china_dev_finance_to_asean_2010_2021` (top-3 recipients IDN $39.3B / VNM $21.2B / LAO $18.6B) — anchors Vietnam and Laos dev-finance framing.
  - **Philippines:** `thesis_b_minerals.philippines_nickel_2025` (6.92% world nickel).
  - **Myanmar (not a profiled slug — excluded):** rare-earths anchor unused.
  - **Defense:** `thesis_c_defense` per-country milex/GDP for Singapore (2.80%), Indonesia (0.86%) — usable as qualitative defense framing.
  - **Policy:** `policy_anchors` (OECD export-restriction 5×, EU CRMA targets, Lynas LAMP 12–15% — Malaysia) for thesis framing.
  - Countries with no specific anchor (Thailand, Brunei, Cambodia, Singapore-economic) get paragraphs built from the **generated China-trade hero + qualitative, non-numeric strategic framing only**. No invented figures.
- **D5 (Decision, auto): The current exported shape of `country-profiles.ts` is a hard contract. Because R5 requires zero component edits and `components/asean/*` + `AseanInfographic.vue` import `CountryProfile`, `TradeItem`, `PROFILES`, `profileBySlug` directly.** The generator and the editorial pass must preserve: `interface TradeItem { label; valueUsdB; detail? }`, `interface CountryProfile { slug; name; flagUrl; tagline; hero{value;label}; paragraph; topExports; topImports }`, the `flag()` helper, the 9 `PROFILES` keys in current order, and `profileBySlug()`. Only `hero`, `paragraph`, the file-header comment, and an in-code marker on the top-trade arrays change. `slug`, `name`, `flagUrl`, `tagline`, `topExports`, `topImports` *values* are otherwise preserved.
- **D6 (Decision, auto): The generator rewrites only the `hero` block per country and leaves the rest of each profile literal — it is a targeted field-patcher, not a whole-file regenerator. Because `paragraph` is curated (D2) and `topExports`/`topImports` are deferred-not-regenerated (D1); a full BF-56-style "emit the entire module" generator would have to carry the curated prose and placeholder arrays as generator input, which is more fragile than patching one field.** Two viable implementation shapes; the generator unit (U2) picks one and documents it:
  - **(6a) Source-of-truth split:** generator emits a small `data/asean/country-hero.generated.ts` (slug → `{value,label}`); `country-profiles.ts` imports it and spreads into each profile's `hero`. Cleanest separation; one extra file; a structural import change to `country-profiles.ts` (touches the D5 contract surface only by *adding* an import, not changing exports).
  - **(6b) In-place field patch:** generator parses `country-profiles.ts`, replaces each `hero: { … }` block deterministically, rewrites the file. No new file; no structural change; but the generator must do a careful, fail-loud, anchored text replacement.
  - **Decision (auto): default to (6a) because it is deterministic, byte-stable, and avoids regex-rewriting a hand-curated source file** (the paragraph prose lives in the same file and must never be touched by a generator). (6a) keeps the generated artifact and the curated artifact in physically separate files — the safest separation given D1/D2. The added import is shape-preserving for downstream consumers (they import from `country-profiles.ts`, which still re-exports the same `CountryProfile`/`PROFILES`).
- **D7 (Decision, auto): Hero value formatting: round 2024 two-way China trade (USD millions) to USD billions, integer for ≥ $10B, one decimal for < $10B; format as `"$<n>B"`. Because the existing placeholder heroes use exactly this style** (`"$143B"`, `"$2.8B"`, `"$8B"`) and `CountryNarrativeCard.vue` / `AseanInfographic.vue` render the string verbatim with no further math. Indonesia: 142568M → `$143B`. Brunei (small): keeps one-decimal style if < $10B. Rounding applied once at emit, deterministic. The `label` is the fixed string `"Two-way trade with China, 2024"` for all 9 (matches current).
- **D8 (Decision, auto): No automated test runner is added. Verification is `nuxt build` + a deterministic re-run + named spot-checks + a 1280×800 visual pass. Because `package.json` has only `build`/`dev`/`generate`/`preview` (no `test`), exactly as BF-56 established; introducing a test framework is out of scope and inconsistent with the established pattern.** Test scenarios below are expressed as build/diff/trace/visual checks accordingly.

---

## High-Level Technical Design

This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.

```
                _data/wrangled/asean-flows-yearly.csv  (same source as BF-56)
                          │  filter: metric=trade_goods, partner_group=CHN, year=2024
                          ▼  sum the 2 direction rows per country_iso3
   per-country 2024 two-way China trade (USD millions)
                          │  round → USD billions, format "$<n>B" (D7)
                          ▼
   scripts/build-asean-country-hero.mjs  ──emits──▶  data/asean/country-hero.generated.ts
                                                      (slug → { value, label })   [GENERATED]
                          ┌───────────────────────────────────────────────┘
                          ▼  imported + spread into each profile's hero
   data/asean/country-profiles.ts   [CURATED, hand-edited]
     • hero:        ← spread from country-hero.generated.ts        (D6a, generator-owned)
     • paragraph:   ← rewritten, every claim anchor-traced (D4)    (curated, U3)
     • topExports/topImports: UNCHANGED values + // UNVERIFIED PLACEHOLDER marker (D1, U4)
     • header comment: placeholder-mirror block removed, honest provenance added (R4)
     • interfaces / PROFILES keys / flag() / profileBySlug(): UNCHANGED (D5)
                          │
                          ▼
   components/infographics/AseanInfographic.vue  +  components/asean/{CountryNarrativeCard,
   CountryParagraphCard,CountryTradeBalanceBars}.vue   render unchanged (R5/R7)
```

Anchor-trace discipline for paragraphs (U3): for each country, before writing the paragraph, list the anchors that exist for it (from the D4 inventory). Every sentence with a number must point at one. If the inventory is empty for a country, the paragraph is qualitative-only and uses the generated hero as its single quantitative anchor.

Determinism (generator): fixed slug order (mirror current `PROFILES` key order), single source CSV, sum both directions, round once at emit, no timestamps — identical to BF-56's determinism guarantees.

---

## Implementation Units

### U1. Confirm hero derivation + write the deferral note (planning→evidence lock)

**Goal:** Lock the two evidence-based foundations before any code: (a) the hero derivation reconciles to the known Indonesia `$143B`, proving D3; (b) the HS-product deferral (D1) is captured as a written, discoverable follow-up note.

**Requirements:** R1 (reconciliation), R6 (written deferral note).

**Dependencies:** none (first unit).

**Files:**
- `docs/plans/2026-05-18-002-feat-asean-hero-paragraph-from-headline-stats-plan.md` (this plan — already records the evidence; U1 is the explicit checkpoint).
- `todos/BF-57-defer-top-trade-hs-product-composition.md` (create) — the standalone follow-up note. (`todos/` is the repo's established convention for tracked deferred work, per the data-branch listing; if `todos/` is absent on this branch, create it.)

**Approach:**
- Re-derive Indonesia 2024 two-way China trade from `_data/wrangled/asean-flows-yearly.csv`: confirm the two `IDN,2024,CHN,*,trade_goods,*` rows sum to `142568.00825…` → formats to `$143B` (D7). This is the hard proof of D3 before the generator is written.
- Author `todos/BF-57-defer-top-trade-hs-product-composition.md`: state the blocker (topExports/topImports need HS-product composition), the evidence that no source exists (D1 bullet list, condensed), the explicit decision (Option b), and the concrete future-wiring path: re-download CEPII BACI HS07 V202601 ZIP → write an HS-product filter (`_process/asean/notebooks/`) → emit `_data/wrangled/asean-trade-composition.csv` → extend the generator to populate `topExports`/`topImports`. Cite `_data/sources/baci-trade.SCOUT.md` and `baci-trade-minerals.SCOUT.md`.

**Patterns to follow:**
- The data-branch `todos/NNN-pending-pN-*.md` naming/format (seen in `git ls-tree origin/claudio/asean-third-infographic-data`) for the deferral note style.
- BF-56 plan's "Open question (non-blocking, deferred)" framing for the rationale tone.

**Test scenarios:**
- Reconciliation: the two `IDN,2024,CHN,{asean_to_partner,partner_to_asean},trade_goods` values from `_data/wrangled/asean-flows-yearly.csv` sum to `142568.0…`, which formats to `"$143B"` under D7 — matches the current Indonesia hero exactly and the `thesis_a_d_flows.indonesia_china_trade_2024` anchor (68211.7 + 74356.3).
- Deferral note exists, is committed (not gitignored), names the blocker, the no-source evidence, the decision, and the future path.
- Test expectation: none for the note itself beyond existence/content review — this unit produces evidence + a doc, no runtime behavior.

**Verification:** The Indonesia sum is hand-confirmed to format to `$143B`; `todos/BF-57-defer-top-trade-hs-product-composition.md` exists and is complete.

---

### U2. Hero generator: derive + emit `country-hero.generated.ts`

**Goal:** A deterministic, fail-loud Node ESM generator (BF-56 pattern) that reads `_data/wrangled/asean-flows-yearly.csv`, computes each of the 9 countries' 2024 two-way China-trade hero, and emits `data/asean/country-hero.generated.ts` (slug → `{value,label}`).

**Requirements:** R1, R2, R8, D3, D6a, D7.

**Dependencies:** U1 (derivation proven).

**Files:**
- `scripts/build-asean-country-hero.mjs` (create) — name mirrors `scripts/build-asean-trade-stacked.mjs`.
- `data/asean/country-hero.generated.ts` (generated output — not hand-edited).
- `package.json` (modify) — add `"gen:country-hero": "node scripts/build-asean-country-hero.mjs"` to `scripts` (no dependency changes).

**Approach:**
- Header comment block in the exact style of `scripts/build-asean-trade-stacked.mjs`: what it does, the run line, the source→output mapping, the determinism guarantees. State explicitly that it owns only the hero, that paragraphs are curated, and that top-trade is deferred (cross-reference the U1 note).
- Resolve `ROOT` from `import.meta.url` (same pattern). `SOURCE = _data/wrangled/asean-flows-yearly.csv`, `OUT = data/asean/country-hero.generated.ts`.
- Reuse BF-56's constants/structure: `ISO3_TO_SLUG` 9-entry table, `SLUG_ORDER` mirroring the `PROFILES` key order in `country-profiles.ts` (`indonesia, thailand, singapore, malaysia, vietnam, philippines, brunei, cambodia, laos`), `IGNORE_ISO3 = new Set(['MMR'])`, fail-loud on unknown ISO3.
- Filter rows to `metric === 'trade_goods'` AND `partner_group === 'CHN'` AND `year === 2024`. Sum the two `direction` values per `country_iso3`.
- Format per D7: millions → billions; `Math.round` for ≥ $10B, one decimal for < $10B; string `"$<n>B"`. `label` = constant `"Two-way trade with China, 2024"`.
- Emit a deterministic TS module: a typed `Record<string, { value: string; label: string }>` keyed by slug in `SLUG_ORDER`, hand-built emitter (template strings, bare keys), `GENERATED FILE — do not hand-edit` banner, no timestamps. Mirror BF-56's emitter shape.
- Fail-loud guards: every slug in `SLUG_ORDER` must get exactly one summed 2024 CHN trade_goods pair (2 direction rows); missing/extra → non-zero exit with the offending slug. Total contributing rows must equal `9 countries × 1 partner × 2 directions × 1 year = 18`.
- Add the npm alias; confirm `npm run gen:country-hero` and direct `node` produce byte-identical output.

**Patterns to follow:**
- `scripts/build-asean-trade-stacked.mjs` — header style, `import.meta.url`→`ROOT`, `ISO3_TO_SLUG`/`SLUG_ORDER`/`IGNORE_ISO3` constants, the `fail()` helper + non-zero exit, the contributing-row-count assertion, hand-built emitter, final `console.log` summary lines.
- `package.json` existing `scripts` block (BF-56 added `gen:trade-stacked` the same way).

**Test scenarios:**
- Happy path: running the script writes `data/asean/country-hero.generated.ts` with all 9 slugs, each `{ value: "$<n>B", label: "Two-way trade with China, 2024" }`.
- Determinism: two consecutive runs with no source change produce a byte-identical file (`git diff --quiet` after the second run).
- Reconciliation (traces to CSV): Indonesia emits `"$143B"` (142568M); the value equals the sum of the two `IDN,2024,CHN,*,trade_goods` rows. Spot-check a second country (e.g. Vietnam) and a small one (Brunei → one-decimal format under D7) against the hand-summed CSV rows.
- Filtering: no non-2024 year, no non-CHN partner, no `fdi_*`/`china_*` metric row contributes (verify a known FDI value never influences any hero).
- Fail-loud: a synthetic `trade_goods` row with an unknown ISO3 (e.g. `XXX`) for 2024/CHN causes a non-zero exit naming the code; an `MMR` row is silently ignored (in `IGNORE_ISO3`), not an error; a slug missing its 2024 CHN pair causes a non-zero exit naming the slug.
- Invocation parity: `npm run gen:country-hero` and `node scripts/build-asean-country-hero.mjs` yield an identical file.

**Verification:** Script exits 0, prints a BF-56-style summary, writes the generated module; second run = no diff; Indonesia = `$143B` traced to the CSV; both invocation paths identical.

---

### U3. Curated paragraph rewrite (anchor-traced) + wire hero import + provenance comment

**Goal:** Hand-rewrite all 9 `paragraph` strings so every claim traces to a real anchor (D4); wire `country-profiles.ts` to consume the generated hero (D6a); replace the placeholder-mirror header comment with honest provenance (R4).

**Requirements:** R2, R3, R4, R5, D2, D4, D5, D6a.

**Dependencies:** U2 (generated hero module must exist to import).

**Files:**
- `data/asean/country-profiles.ts` (modify) — header comment; `hero` wiring via import+spread; 9 `paragraph` strings; in-code marker on `topExports`/`topImports` (the marker text is finalized in U4, but the structural edit lands here to keep the file edited once).
- `data/asean/country-hero.generated.ts` (read-only consumer; not edited).

**Approach:**
- Add `import { COUNTRY_HERO } from './country-hero.generated'` (or the chosen name from U2). For each profile, replace the literal `hero: { value: '…', label: '…' }` with the generated value, e.g. spread `...COUNTRY_HERO[slug]` or explicit `hero: COUNTRY_HERO.indonesia`. Keep `CountryProfile`, `TradeItem`, `PROFILES` keys, `flag()`, `profileBySlug()` exactly (D5). Verify `hero` still satisfies `{ value: string; label: string }` so no consumer breaks.
- Rewrite each `paragraph` under the D4 discipline. Per country, before writing, enumerate its anchors (from the D4 inventory) in a code comment or commit note, then write prose where every numeric/factual claim points at one. Examples of the discipline:
  - **Indonesia:** may state the ~$143B China trade (generated hero / `indonesia_china_trade_2024`), ~90% of refined-nickel exports to China and ~90% of 2020–2024 global nickel-supply *growth* (`indonesia_nickel_exports_2024` / `iea_nickel_growth_indonesia_share`), the 5.9× nickel-export growth (`asean_nickel_exports_growth`), the 44.85% 2025 quota cut (`indonesia_esdm_17_2025_quota_cut`). The old paragraph's "grown four times as fast as the United States'" claim has **no anchor** → must be removed or replaced with an anchored comparison or qualitative framing.
  - **Vietnam / Laos:** may reference China development finance (`china_dev_finance_to_asean_2010_2021` top-3: VNM $21.2B, LAO $18.6B) plus the generated China-trade hero. The old Vietnam "$100B-plus surplus with the US" figure has **no anchor** → soften to qualitative ("runs a large surplus with the US and a near-equal deficit with China") or remove the number.
  - **Philippines:** may cite ~6.92% world nickel (`philippines_nickel_2025`); EDCA basing is qualitative/strategic framing (no number invented).
  - **Malaysia:** Lynas LAMP ~12–15% of global rare earths (`lynas_lamp_world_rare_earths_share`); semiconductor framing stays qualitative.
  - **Singapore / Thailand / Brunei / Cambodia:** no specific economic anchors → paragraphs use the generated China-trade hero as the single quantitative anchor and otherwise qualitative strategic framing. No invented percentages, multiples, or dollar amounts (e.g. drop Brunei's "90%+ of exports" unless an anchor is found; if kept it must be sourced — default: soften to "the overwhelming majority of exports").
- Replace the top-of-file comment block (lines ~1–6, the "Hero values mirror placeholder-data.ts … OEC 2023 / UN Comtrade composition snapshots" text) with an honest provenance comment: hero is generated from `_data/wrangled/asean-flows-yearly.csv` (BACI HS07 V202601) via `scripts/build-asean-country-hero.mjs`; paragraphs are curated and anchor-traced to `_data/wrangled/asean-headline-stats.json` + `_data/sources/*.SCOUT.md`; `topExports`/`topImports` are **unverified placeholder pending an HS-product source** — see `todos/BF-57-defer-top-trade-hs-product-composition.md`.

**Patterns to follow:**
- `_data/wrangled/asean-headline-stats.json` exact key names and values for anchor citations.
- `_data/sources/baci-trade-minerals.SCOUT.md` §4 (Indonesia nickel destinations / growth) and the `policy_anchors` block for the few rich-anchor countries.
- The existing paragraph voice/length (1–3 sentences, strategic-analyst register) — preserve tone, change only sourcing.
- BF-56's provenance-comment replacement approach (honest source string, no "placeholder/IEA/plausible" residue).

**Test scenarios:**
- Anchor trace (the core check): for each of the 9 paragraphs, every quantitative or hard-factual claim maps to a named anchor in `_data/wrangled/asean-headline-stats.json` or a `_data/sources/*.SCOUT.md` figure, or to the generated hero. Specifically: Indonesia's removed "four times as fast" claim no longer appears unanchored; Vietnam's "$100B-plus surplus" number is either anchored or softened to qualitative; no paragraph contains a percentage/multiple/dollar figure without a traceable source.
- Hero wiring: `profileBySlug('indonesia').hero.value === '$143B'` (sourced from the generated module, not a literal); all 9 profiles' `hero` is `{ value:string, label:string }`; `label` is `"Two-way trade with China, 2024"` for all 9.
- Contract preserved (D5): `country-profiles.ts` still exports `CountryProfile`, `TradeItem`, `PROFILES` (9 keys, same order), `profileBySlug`; `topExports`/`topImports` array *values* are byte-unchanged from the pre-edit file (only a comment marker added).
- Provenance scrub: the strings `placeholder-data.ts`, `OEC 2023`, `directionally accurate`, `ranking-correct` do not appear in `country-profiles.ts`; the new header comment references the generator, the headline-stats anchors, and the U1 deferral note.
- Edge: a country with no economic anchor (e.g. Thailand) has a paragraph whose only quantitative element is the generated China-trade hero figure; no other numbers present.

**Verification:** Each paragraph's claims are anchor-traceable (reviewed line-by-line against the D4 inventory); hero comes from the generated module; the interface/exports contract is intact; no placeholder-era provenance text remains.

---

### U4. Mark deferred top-trade arrays + build & 1280×800 visual acceptance

**Goal:** Finalize the in-code "unverified placeholder" marker on `topExports`/`topImports` (closing R6), then prove the whole change compiles and renders intact for all 9 countries at the target embed size.

**Requirements:** R5, R6, R7, D1, D8.

**Dependencies:** U2, U3.

**Files:**
- `data/asean/country-profiles.ts` (finalize the `topExports`/`topImports` comment marker started in U3 — single concise block comment above the arrays, or one marker comment per `topExports:`/`topImports:` field, pointing to `todos/BF-57-defer-top-trade-hs-product-composition.md`).
- No component edits. Exercises `components/infographics/AseanInfographic.vue`, `components/asean/CountryNarrativeCard.vue`, `CountryParagraphCard.vue`, `CountryTradeBalanceBars.vue` against the updated profile module.

**Approach:**
- Add the marker comment: `topExports`/`topImports` are unverified placeholder composition retained only so the trade-balance card keeps rendering; no HS-product source exists (D1); replace when `todos/BF-57-defer-top-trade-hs-product-composition.md` is actioned. Do not alter the array values.
- Run `npm run build` (`nuxt build`); must pass with no TypeScript errors against the new import (`country-hero.generated.ts`) and the unchanged interfaces (D5 gate).
- Run the infographic; for each of the 9 countries (default Indonesia + cycle the other 8 via the map): confirm the title block shows the new `hero.value` (e.g. Indonesia `$143B`, non-empty for all 9) and the rewritten `paragraph`; confirm `CountryNarrativeCard` (hero + top exports list), `CountryParagraphCard` (paragraph), and `CountryTradeBalanceBars` (exports/imports bars from the retained arrays) all render with no layout break.
- Confirm at 1280×800 (the BF-56 acceptance viewport) there is no clipped/overflowing hero, paragraph, or card content.

**Patterns to follow:**
- BF-56 plan U3 ("Build + visual acceptance") — same `nuxt build` gate + 9-country cycle + 1280×800 check methodology and screenshot/`test-screenshots/` convention if proof capture is wanted.

**Test scenarios:**
- `nuxt build` exits 0 with no TypeScript errors referencing `country-profiles`, `country-hero.generated`, `CountryProfile`, or `TradeItem`.
- All 9 countries render a non-empty hero value and the rewritten paragraph in the title block (`AseanInfographic.vue`) and in `CountryNarrativeCard` / `CountryParagraphCard`.
- `CountryTradeBalanceBars` still renders exports/imports bars for all 9 (retained placeholder arrays unbroken) — confirms D1's "cards keep rendering" goal.
- At 1280×800: no clipped or overflowing hero, paragraph, or card text for the 3 longest-content countries (e.g. Indonesia, Vietnam, Singapore).
- Marker present: `topExports`/`topImports` carry the in-code unverified-placeholder comment pointing at the deferral note.
- Test expectation: manual/visual + build gate — no automated runner exists (D8); acceptance is the build pass plus the documented 9-country visual cycle, mirroring BF-56.

**Verification:** `nuxt build` passes; all 9 countries show real generated heroes + anchor-traced paragraphs; trade-balance cards still render from the marked-deferred arrays; layout intact at 1280×800.

---

## System-Wide Impact

- **Consumers of `data/asean/country-profiles.ts`:** `components/infographics/AseanInfographic.vue` (`profileBySlug`, `PROFILES`), `components/asean/CountryNarrativeCard.vue`, `CountryParagraphCard.vue`, `CountryTradeBalanceBars.vue` (all import `CountryProfile`/`TradeItem`). The D5 contract (interfaces, `PROFILES` keys, `profileBySlug`, `flag()` unchanged; only `hero`/`paragraph` values + a header comment + an added internal import + a comment marker change) keeps every consumer working with no component edit.
- **New generated artifact:** `data/asean/country-hero.generated.ts` is a new static TS module imported at build time by `country-profiles.ts` only. No runtime fetch, no new dependency, no Nuxt config change — same posture as BF-56's `trade-stacked.ts`.
- **Honest-deferral surface:** `topExports`/`topImports` remain *visually* identical (cards unchanged) but are now in-code marked unverified with a tracked follow-up (`todos/BF-57-...md`). This is the deliberate, documented outcome of D1 — not a regression. Reviewers must understand the trade-balance card is intentionally still placeholder-backed pending a separate HS-product ticket.
- **Reproducibility:** `_data/` is tracked (per `_data/README.md`); the hero generator is idempotent (BF-56 determinism guarantees), so regeneration is a safe reviewable commit. The paragraph rewrite is a one-time curated edit, auditable via the anchor-trace discipline (D4).
- **No straits/renewables impact:** zero files outside `data/asean/`, `scripts/`, `package.json`, and `docs/`+`todos/` are touched.

---

## Risks & Mitigations

- **R: A paragraph ships with an unanchored number (the exact D1 failure mode).** Mitigation: U3's anchor-trace test scenario requires every numeric/factual claim to name a `_data/wrangled/asean-headline-stats.json` key or `*.SCOUT.md` figure; the known offenders (Indonesia "four times as fast", Vietnam "$100B surplus", Brunei "90%+") are called out by name to be removed/softened. Review is line-by-line, not spot-check.
- **R: The hero generator's 2024 China-trade sum diverges from the existing `$143B` (wrong filter/aggregation).** Mitigation: U1 locks the reconciliation as a hard precondition before U2 codes; U2's test traces Indonesia to the two named CSV rows and to the `indonesia_china_trade_2024` headline anchor (independent cross-check).
- **R: D6a's added import subtly breaks a typed consumer or SSR.** Mitigation: it is an internal import within `country-profiles.ts`; the *exported* surface (`CountryProfile`/`PROFILES`/`profileBySlug`) is unchanged (D5); U4's `nuxt build` is the type+SSR gate. If a consumer breaks, the D5 assumption was wrong and the plan is revisited before merge.
- **R: Deferring `topExports`/`topImports` reads as "unfinished" rather than "honest."** Mitigation: explicit in-code marker + a tracked `todos/` note with the concrete future-wiring path + a Scope Boundaries entry + this plan's D1 evidence. The deferral is documented as a deliberate quality decision, consistent with CCM "design is the pitch."
- **R: CSV format drift (new ISO3, missing 2024 row, quoted field).** Mitigation: U2 reuses BF-56's fail-loud guards (unknown ISO3 throws; per-slug 2024-CHN-pair completeness asserted; expected total contributing rows = 18 asserted). The no-quoting assumption is the same one BF-56 verified for this file family.
- **R: Singapore hero overstates trade (entrepot re-exports, SCOUT §8).** Mitigation: out of scope (methodology footnote, deferred — consistent with BF-56). Noted so reviewers don't read the inflated SGP figure as a generator bug.

---

## Acceptance Criteria (BF-57)

1. All 9 profiles' `hero` carries a real generated "two-way trade with China, 2024" value; Indonesia = `$143B`, traceable to `_data/wrangled/asean-flows-yearly.csv` and the `thesis_a_d_flows.indonesia_china_trade_2024` anchor.
2. All 9 profiles' `paragraph` is anchor-traced: every quantitative/factual claim maps to a real `_data/wrangled/asean-headline-stats.json` key, a `_data/sources/*.SCOUT.md` figure, or the generated hero. No invented numbers (the named offenders are removed/softened).
3. The placeholder-mirror header comment is removed; replaced with honest provenance referencing the generator, the headline-stats anchors, and the deferral note.
4. The top-trade data-source question is explicitly resolved: Option (b), documented in D1 with evidence, an in-code `topExports`/`topImports` unverified-placeholder marker, and a tracked `todos/BF-57-defer-top-trade-hs-product-composition.md` with the concrete future path. No fabricated/guessed composition introduced.
5. The `CountryProfile`/`TradeItem` interfaces, `PROFILES` keys, `flag()`, `profileBySlug()` are unchanged; no `components/asean/*` or `AseanInfographic.vue` edit required.
6. `npm run build` passes.
7. Profile cards + title block render intact at 1280×800 for all 9 countries with visible non-empty heroes and the rewritten paragraphs.
8. The hero generator is invocable as `npm run gen:country-hero` and `node scripts/build-asean-country-hero.mjs`, and is deterministic (second run = no diff).

---

## Auto-Resolved Decisions Summary

Solo / headless invocation — no upstream brainstorm doc, no user available. All ambiguities resolved inline (full rationale in Key Technical Decisions):

- **D1 — the central blocker:** Option **(b)**. Wire hero+paragraph now; **explicitly defer** `topExports`/`topImports`; do **not** fabricate. Chosen because an exhaustive search (raw dir, the data branch's `-raw-codes.csv`, the minerals-only HS6 file, the wrangle notebooks, both BACI SCOUT docs) proves **no HS-product source exists or is cheaply recoverable**; the `-raw-codes.csv` the ticket flagged is raw *country* codes, not HS codes. A wrong sourced-looking number is worse than an honest, tracked deferral for a "design is the pitch" portfolio piece.
- **D2:** Hero = generator-driven; paragraph = curated-from-anchors — because the hero is a single deterministic CSV number (fully automatable) but prose cannot be machine-written without inventing connective claims (the D1 failure mode).
- **D3:** Hero source = the *same* canonical `_data/wrangled/asean-flows-yearly.csv` + aggregation BF-56 used (`trade_goods`, `CHN`, both directions, 2024) — because it reconciles exactly to the existing `$143B` and to the headline-stats anchor, and avoids a second provenance.
- **D4:** Every paragraph claim must name-trace to a real anchor or be softened/cut; the anchor inventory is thin and Indonesia-heavy, so paragraphs are uneven by design (honest, not padded).
- **D5:** Current `country-profiles.ts` exported shape is a hard contract → zero component edits.
- **D6:** Generator is a targeted hero-only field source via a separate generated file (**6a**), not a whole-file regenerator — because the curated prose and deferred arrays must never be touched by a generator.
- **D7:** Hero formatting mirrors the existing `"$<n>B"` style (int ≥ $10B, 1dp < $10B).
- **D8:** No test runner added; verification = `nuxt build` + deterministic re-run + named spot-checks + 1280×800 visual pass — matches the BF-56 precedent.

**Open question (non-blocking, deferred):** the Singapore entrepot re-export caveat (BACI does not strip SGP re-exports, `_data/sources/baci-trade.SCOUT.md` §8) is a real data-quality footnote but an editorial/methodology concern, not a generator concern — explicitly deferred, consistent with BF-56.
