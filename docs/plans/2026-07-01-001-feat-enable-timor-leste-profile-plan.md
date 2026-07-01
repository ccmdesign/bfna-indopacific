---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
title: "feat: Enable Timor-Leste as the 11th ASEAN country profile"
created: 2026-07-01
ticket: BF-82
---

# feat: Enable Timor-Leste as the 11th ASEAN country profile

## Summary

Today Timor-Leste renders on the ASEAN infographic as a dimmed, unclickable legend row — the only disabled country. Nearly all plumbing already exists (map geo feature id 626, generated hero `$0.3B`, trade-stacked chart data, and a `country-tiers.ts` registry entry). Two changes turn it interactive: flip the tier flag from `inert` to `stretch`, and add a curated `timor_leste` prose profile matching the shape of the other ten. No generated files are hand-edited; no component logic changes.

---

## Problem Frame

The ASEAN map only renders features whose tier is `inScope` or `stretch` (`components/asean/AseanMap.vue`), and the legend disables any row whose tier is neither (`components/asean/AseanLegend.vue`). Timor-Leste's registry entry is currently `tier: 'inert'`, so it is dimmed and non-interactive. Additionally, `data/asean/country-profiles.ts` has no `timor_leste` entry, so even if it were interactive the dock panel would have no Description / Trade / Critical Minerals prose to render. Both gaps are content/config — the render pipeline itself is complete from BF-80/BF-81.

---

## Requirements

- **R1.** Timor-Leste is a clickable legend row and map feature — no dimmed/disabled row remains.
- **R2.** Docking Timor-Leste opens a normal country panel with Description / Trade / Critical Minerals tabs, each rendering a trimmed Timor-Leste paragraph plus a visible source/year footnote.
- **R3.** The hero shows the existing generated `$0.3B` figure (unchanged; sourced from `COUNTRY_HERO.timor_leste`).
- **R4.** Prose is trimmed from the Marshall source (`_data/sources/marshall-infographic-copy-2026-06-30.md`, lines 288–299) to ~2–3 sentences per block, keeping every hard number (~$266M imports from China 2024; €17M EU trade 2025; nickel/copper/manganese; Estrella Resources manganese).
- **R5.** Source attribution mirrors the existing profiles — bilateral-trade / mineral figures with no upstream source attributed "BFNA research brief, Jun 2026", with year annotations where a block leans on a dated figure.
- **R6.** Typecheck and lint pass; the WAI-ARIA tablist keyboard a11y (arrow / Home / End, roving tabindex) remains intact (no component changes, so this is a non-regression check).

---

## Key Technical Decisions

- **KTD1 — `tier: 'stretch'`, not `inScope`.** The other later-added profiles (Brunei, Cambodia, Laos, Myanmar) are `stretch`; `inScope` is reserved for the five core economies. `stretch` is what makes the feature render and the legend row interactive without regrouping it with the core five. (Per brief Notes.)
- **KTD2 — `flag('tl')`.** The `flag()` helper builds `https://flagcdn.com/w160/tl.png`; Timor-Leste's ISO 3166-1 alpha-2 code is `tl`. Matches the pattern used by all ten existing profiles.
- **KTD3 — `topExports` / `topImports` are unverified placeholders.** No HS-product source exists for Timor-Leste (same as all profiles — see `todos/BF-57-defer-top-trade-hs-product-composition.md`, Decision D1). Populate with a small, plausible, clearly-commented placeholder set drawn from the prose (crude oil exports; refined oil / rice imports) so the trade-balance card keeps rendering. Not regenerated or guessed beyond that; carries the same `UNVERIFIED PLACEHOLDER` comment as its siblings.
- **KTD4 — Do not hand-edit `country-hero.generated.ts`.** The `COUNTRY_HERO.timor_leste` key already exists (`$0.3B`, two-way trade with China 2024). The profile spreads it via `hero: COUNTRY_HERO.timor_leste`, identical to every sibling.

---

## Implementation Units

### U1. Flip the Timor-Leste tier to `stretch`

**Goal:** Make Timor-Leste an interactive map feature and legend row.
**Requirements:** R1, R6.
**Dependencies:** none.
**Files:**
- `data/asean/country-tiers.ts` (modify)

**Approach:** In the `timor_leste` block (currently the last entry, id `'626'`, slug `timor_leste`, name `Timor-Leste`, flag `🇹🇱`), change `tier: 'inert'` to `tier: 'stretch'`. No other field changes — id/slug/name/flag are already correct. This alone flips both the map render filter (`AseanMap.vue`) and the legend disabled state (`AseanLegend.vue`), and adds the slug to any `stretch`-derived collections.

**Patterns to follow:** The `myanmar` block immediately above is already `tier: 'stretch'` — match it exactly.

**Test scenarios:** Test expectation: none — single enum value change in a data registry; behavior is verified end-to-end in U3 (typecheck) and the browser test step (interactivity). No unit test harness exists for this data module.

**Verification:** Typecheck passes; `IN_SCOPE_SLUGS` (filtered on `inScope`) is unchanged; any `stretch`/interactive-slug derivation now includes `timor_leste`.

---

### U2. Add the `timor_leste` country profile

**Goal:** Provide the dock panel with Description / Trade / Critical Minerals prose and source footnotes so docking Timor-Leste opens a complete country panel.
**Requirements:** R2, R3, R4, R5.
**Dependencies:** U1 (interactive feature must exist for the panel to be reachable; not a code dependency, an ordering one).
**Files:**
- `data/asean/country-profiles.ts` (modify — add one `timor_leste` entry to the `PROFILES` record)

**Approach:** Append a `timor_leste` entry to `PROFILES` matching the `CountryProfile` shape used by the other ten:
- `slug: 'timor_leste'`, `name: 'Timor-Leste'`, `flagUrl: flag('tl')` (KTD2).
- `tagline`: a short single-line phrase in the voice of the existing taglines (e.g. a young petro-economy inching into minerals).
- `hero: COUNTRY_HERO.timor_leste` (KTD4 — do not inline the value).
- `paragraphs.{description,trade,minerals}`: trim each Marshall block (source lines 291, 294, 297) to ~2–3 sentences, keeping every hard number: `~$266 million` imports from China 2024; `€17 million` EU trade 2025; untapped nickel / copper / manganese reserves; Australia's Estrella Resources securing manganese rights (R4).
- `sources.{description,trade,minerals}`: mirror sibling attributions — `"BFNA research brief, Jun 2026."` for description; trade with year annotations (China 2024, EU 2025); minerals `"BFNA research brief, Jun 2026."` (R5).
- `topExports` / `topImports`: small placeholder set with the sibling `UNVERIFIED PLACEHOLDER` comment (KTD3) — e.g. exports: crude petroleum, coffee; imports: refined petroleum, rice.

**Patterns to follow:** The `brunei` and `myanmar` entries (similarly small oil-driven economies with minimal minerals footprint) are the closest structural + tonal match — mirror their field order, comment placement, and source-line style.

**Test scenarios:** Test expectation: none — curated data entry, no behavioral logic. Correctness is verified by typecheck (U3, the entry must satisfy the `CountryProfile` interface) and by the browser test step (panel renders all three tabs with prose + footnotes, hero shows `$0.3B`).

**Verification:** `profileBySlug('timor_leste')` returns a fully-populated `CountryProfile`; typecheck passes against the `CountryProfile` interface; each paragraph retains its required hard numbers; hero value resolves to `$0.3B` via the spread.

---

### U3. Verify typecheck, lint, and no a11y regression

**Goal:** Confirm the two data changes compile cleanly and the tablist behavior is unaffected.
**Requirements:** R6.
**Dependencies:** U1, U2.
**Files:** none (verification only).

**Approach:** Run the project's typecheck and lint. Because no component code changed, the WAI-ARIA tablist (arrow / Home / End, roving tabindex) is a non-regression concern — confirm via the browser test step rather than code review. This unit is the gate before PR.

**Test scenarios:** Test expectation: none — this unit runs existing project checks; it adds no new tests.

**Verification:** Typecheck passes; lint passes; browser preview shows Timor-Leste interactive with a working three-tab panel and intact keyboard tab navigation.

---

## Scope Boundaries

**In scope:** the tier flip (U1) and the curated profile (U2), plus verification (U3).

**Out of scope / not touched:**
- `data/asean/country-hero.generated.ts` — generated; the `timor_leste` key already exists.
- `data/asean/countries.geo.json` — geo feature id 626 already present.
- `data/asean/trade-stacked.ts` — `timor_leste` chart data already present (line 294).
- Any component logic (`AseanMap.vue`, `AseanLegend.vue`, dock/panel components) — the render pipeline is complete; only data/config changes are required.

### Deferred to Follow-Up Work
- Real HS-product trade composition for `topExports` / `topImports` remains deferred for all countries (see `todos/BF-57-defer-top-trade-hs-product-composition.md`, D1). Timor-Leste inherits the same placeholder posture; no new follow-up is created by this plan.

---

## Definition of Done

- Timor-Leste is a clickable legend row and map feature; no dimmed row remains (R1).
- Docking Timor-Leste opens a panel with Description / Trade / Critical Minerals tabs, each showing its trimmed paragraph + a source/year footnote (R2, R4, R5).
- Hero shows `$0.3B` (R3).
- Typecheck + lint pass; tablist keyboard a11y intact (R6).
- PR targets `dev`.
