---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
title: "feat: ASEAN infographic — Marshall data + 3-tab prose restructure"
date: 2026-06-30
plane: BF-81
origin: _data/sources/marshall-infographic-copy-2026-06-30.md
---

# feat: ASEAN infographic — apply Marshall's data + 3-tab prose restructure (rename Green Transition → Critical Minerals)

## Summary

Marshall + Georgia (BFNA) sent finalized copy and statistics for the ASEAN infographic
(`_data/sources/marshall-infographic-copy-2026-06-30.md`, in-repo source of truth). This
plan does two things: **(A)** reconcile the country-panel prose with Marshall's figures,
attaching a visible source + year to every big number and qualitative claim while leaving
chart datasets unchanged (only appending the year to their `source=` strings); and **(B)**
restructure the focused country panel so Marshall's three prose blocks (Description /
Trade / Critical Minerals) land on the three existing tabs, and rename the third tab from
"Green Transition" to "Critical Minerals" across every user-visible surface.

The data model changes from a single `paragraph: string` to structured
`paragraphs: { description, trade, minerals }`, and the render adds per-tab prose that
swaps with the active tab (the Trade↔Minerals chart cards keep their shared flipped
tabpanel). The WAI-ARIA tablist keyboard model (roving tabindex, arrow/Home/End) stays
intact.

Scope is the **10 in-build countries** (Indonesia, Thailand, Singapore, Malaysia, Vietnam,
Philippines, Brunei, Cambodia, Laos, Myanmar). Timor-Leste is out of scope (no geo
feature / tier entry yet).

---

## Problem Frame

The current country panel (`components/infographics/AseanInfographic.vue`) renders one
curated `paragraph` per country on the Description tab, with the Trade and "Green
Transition" tabs sharing a single flipped chart tabpanel. The prose was first-pass
curated copy with thin, uneven sourcing. Marshall has now supplied authoritative,
per-country prose split into three blocks plus a corrected data table, and wants:

1. The prose reconciled to his figures, with visible source + year attribution.
2. His three blocks mapped onto the three tabs.
3. The third tab renamed "Critical Minerals" (the product never had a green-energy
   framing; "Green Transition" was a placeholder label).

The corrections themselves (7 number/typo fixes + label standardization) are **already
applied** in the in-repo `.md` — this plan consumes that corrected copy; it does not
re-derive the corrections. Two figures carry open caveats (Laos trade/GDP is a 2016
value; Vietnam's 7.1% growth is a 2024/25 actual, not a confirmed 2026 projection) that
must be surfaced as visible year caveats rather than silently presented as current.

---

## Requirements

- **R1** — Replace `paragraph: string` with `paragraphs: { description: string; trade: string; minerals: string }` on `CountryProfile`, populated for all 10 in-build countries from Marshall's corrected copy, each block trimmed to ~2–3 sentences keeping every hard number and named relationship.
- **R2** — The third tab reads **"Critical Minerals"** in every user-visible surface; the string "Green Transition" appears in no user-visible output (tab label, comments that ship, generated-file headers that are user-facing).
- **R3** — The Description tab renders `paragraphs.description` (+ hero); the Trade tab renders `paragraphs.trade` prose alongside the Trade chart card(s); the Critical Minerals tab renders `paragraphs.minerals` prose alongside the minerals chart card(s). The per-tab prose is the new element that swaps with the active tab.
- **R4** — Each tabpanel's prose carries a source/year footnote, mirroring the chart `source` prop pattern, populated per the A2 attribution map.
- **R5** — Big numbers + qualitative prose use Marshall's figures, each with a visible source + year. Chart datasets are **unchanged**; their `source=` strings now include the year (BACI hero/charts labelled `BACI HS07 V202601, 2024`).
- **R6** — Generated hero values (`country-hero.generated.ts`, two-way goods trade with China, 2024 BACI) are **not hand-edited**. The BACI hero stays, labelled with source + year; Marshall's 2025 bilateral figures live in the Trade prose with their own year so the two read as distinct metrics.
- **R7** — Open-flag figures show a visible year caveat: Laos "Total trade as % of GDP" labelled as a 2016 figure; Vietnam's 7.1% growth labelled with its true year context.
- **R8** — Typecheck + lint pass; the infographic renders for all 10 in-scope countries; **light and dark** verified; tablist keyboard a11y (arrow/Home/End, roving tabindex) intact.

**Out of scope (follow-ups, not this ticket):** verified Key-Facts stat strip (BF-57), Trade-Agreements (EU/US/China) component, Timor-Leste as the 11th profile.

---

## Source + Year Attribution Map (A2)

Apply wherever each figure type is shown (from the origin `.md`):

| Figure type | Source + year |
|---|---|
| GDP growth rate (2026) | IMF World Economic Outlook |
| GDP per capita, PPP (2024) | World Bank (`NY.GDP.PCAP.PP.CD`) |
| Total trade as % of GDP (2024) | World Bank (`NE.TRD.GNFS.ZS`) |
| FDI net inflows (2024) | World Bank (`BX.KLT.DINV.CD.WD`) |
| Bilateral-trade / mineral figures in prose | Marshall's stated year; "BFNA research brief, Jun 2026" where no upstream source is named |
| BACI hero + BACI charts | `BACI HS07 V202601, 2024` |

Since the prose blocks blend several figure types, the **per-tab prose footnote** should
be a concise composite attribution rather than a per-number citation — e.g. the Trade tab
footnote names the dominant source(s) for that block plus "BFNA research brief, Jun 2026".
Keep footnotes short (one line, mirroring `chart-card__source`).

---

## Key Technical Decisions

- **KTD1 — Structured prose object, not an array.** Use `paragraphs: { description, trade, minerals }` (named keys) rather than a positional array, so each tab binds to its key explicitly and a missing block is a type error, not a silent index slip.
- **KTD2 — Rename the internal `Tab` value `'green'` → `'minerals'` fully.** The CardFlip choreography keys off `tab === 'green'` in two `:flipped` bindings and `chartsPanelLabelledBy`. These are simple string comparisons with no animation-state coupling, so a full rename (type, `TAB_ORDER`, computed, bindings, comments) is safe and leaves no stale "green" identifier. The label-only fallback in the brief is the contingency if review finds coupling; it is not expected to be needed.
- **KTD3 — Per-tab prose footnote via a small local component or inline markup mirroring `CountryChartCard`'s `source` row.** Reuse the visual pattern (`chart-card__source`: `Source: {{ source }}`) for the prose footnote so the attribution reads consistently with the chart cards. Inline `<p class="...__source">` within each tabpanel is sufficient — no new shared component required unless the markup repeats more than twice.
- **KTD4 — Footnote text lives in the data model alongside the prose.** Add a parallel `sources: { description, trade, minerals }` (or fold source strings into the prose object) so attribution is data-driven per country, not hardcoded in the template. This keeps the template generic and lets each country override where its dominant source differs (e.g. Myanmar trade/GDP "not available").
- **KTD5 — Chart `source=` year append done at the lowest honest layer.** For the inline component chart sources (the hardcoded `source="..."` props in `AseanInfographic.vue`), append the year directly. For the **generated** `trade-stacked.ts` source (`BASE_SOURCE`/`SOURCE_STRING = 'BACI HS07 V202601'`), update the constant in `scripts/build-asean-trade-stacked.mjs` and regenerate via `npm run gen:trade-stacked` rather than hand-editing the generated file. Same approach for `minerals.generated.ts` header text via `scripts/build-asean-minerals.mjs` + `npm run gen:minerals`.
- **KTD6 — Description-tab cross-fade keying unchanged.** The existing `<Transition name="desc-fade">` keyed on `activeSlug` stays. New Trade/Minerals prose can reuse the same keyed cross-fade pattern so all three tabs animate consistently on country switch.

---

## High-Level Technical Design

Tab → content mapping after the restructure:

```
Tabs:   [ Description ]   [ Trade ]            [ Critical Minerals ]
         tab='description' tab='trade'          tab='minerals'   (renamed from 'green')

Panel:  #tabpanel-description  #tabpanel-charts (shared, flipped on tab==='minerals')
        ┌────────────────┐     ┌──────────────────────────────────────────┐
        │ hero number    │     │  prose: paragraphs.trade  | .minerals     │ ← NEW: swaps w/ tab
        │ paragraphs.    │     │  ───────────────────────────────────────  │
        │   description  │     │  CardFlip 1 (tornado bars / mineral share) │
        │ source footnote│     │  CardFlip 2 (stacked area / mineral flows) │ ← charts unchanged,
        └────────────────┘     │  flipped:tab==='minerals'                  │   flip key renamed
                               └──────────────────────────────────────────┘
```

The charts tabpanel (`#asean-tabpanel-charts`) keeps its shared-panel APG variation: both
CardFlips flip in unison on `tab === 'minerals'`. The **new** element is per-tab prose +
footnote that swaps with the active chart tab inside (or above) that shared panel.

---

## Implementation Units

### U1. Restructure the data model — `paragraphs` + `sources` on `CountryProfile`

**Goal:** Replace `paragraph: string` with structured per-tab prose and attribution for all 10 in-build countries, sourced from the corrected `.md`.

**Requirements:** R1, R4, R7

**Dependencies:** none

**Files:**
- `data/asean/country-profiles.ts` (modify: `CountryProfile` interface + all 10 entries)
- `_data/sources/marshall-infographic-copy-2026-06-30.md` (read-only source)

**Approach:**
- Add `paragraphs: { description: string; trade: string; minerals: string }` to `CountryProfile`; remove `paragraph: string`.
- Add `sources: { description: string; trade: string; minerals: string }` (per KTD4) — one concise footnote line per tab, populated from the A2 map.
- For each of the 10 countries, transcribe Marshall's Description / Trade / Critical Minerals blocks **trimmed to ~2–3 sentences**, keeping every hard number and named relationship. Use straight curly-apostrophe style consistent with existing entries (`'`).
- Preserve `hero`, `topExports`, `topImports`, `tagline` unchanged. Update the file header comment block to describe the new `paragraphs`/`sources` shape and that prose now traces to Marshall's corrected copy (replacing the "thin anchor inventory" note).
- Surface open-flag caveats in the relevant prose or source footnote: Laos trade/GDP "(2016)"; Vietnam growth year context. (These mostly live in Key Facts which is out of scope — only carry the caveat where the figure actually appears in the trimmed prose.)

**Patterns to follow:** existing `PROFILES` record structure and per-country comment style in `data/asean/country-profiles.ts`.

**Test scenarios:**
- Covers R1. Typecheck: every entry in `PROFILES` satisfies the new `CountryProfile` (all 10 have `paragraphs.description/trade/minerals` and `sources.*`); a missing key is a compile error.
- `profileBySlug('indonesia')?.paragraphs.minerals` returns Marshall's minerals prose (nickel 62% global output, etc.), not the old combined paragraph.
- No entry references the removed `paragraph` field anywhere in the codebase (grep clean).

Test expectation: data-only module — verification is the typecheck + a grep that no `.paragraph` access survives. No runtime test harness exists in this repo.

---

### U2. Rename `Tab` value `'green'` → `'minerals'` and label → "Critical Minerals"

**Goal:** Eliminate "Green Transition" from every user-visible surface and rename the internal tab identifier per KTD2.

**Requirements:** R2

**Dependencies:** none (independent of U1)

**Files:**
- `components/infographics/AseanInfographic.vue` (modify: type `:74`, `TAB_ORDER` `:75`, `chartsPanelLabelledBy` `:99`, flip bindings `:384`/`:420`, label expression `:303`, comments `:69`/`:73`/`:264`/`:281`/`:367`)

**Approach:**
- Change `type Tab = 'description' | 'trade' | 'green'` → `'minerals'`; `TAB_ORDER` accordingly.
- Update `chartsPanelLabelledBy` computed (`tab.value === 'trade' || tab.value === 'minerals'`).
- Update both `:flipped="tab === 'green'"` → `:flipped="tab === 'minerals'"`.
- Update the label ternary at `:303` to output `'Critical Minerals'` for the third tab.
- Update all shipping comments that say "Green Transition" / "Green" / "green" to "Critical Minerals" / "minerals".
- Confirm `aria-controls` mapping still resolves (`description` → `description`, else → `charts`) — unaffected by the rename.

**Patterns to follow:** existing tablist + `selectTab`/`focusTab`/`onTabKeydown` keyboard model — do not alter the APG behavior, only the identifier string.

**Test scenarios:**
- Covers R2. Grep for "Green Transition" / "green" (case-insensitive) across `components/`, `data/`, rendered output → no user-visible match; only `docs/plans/` archive may retain historical mentions.
- Tab label renders "Critical Minerals" as the third tab.
- Selecting the third tab still flips both CardFlips in unison (flip binding now keyed on `'minerals'`).
- Tablist a11y unchanged: ArrowRight/Left/Down/Up cycle, Home/End jump, roving tabindex (`tabindex` 0 on active, -1 elsewhere) preserved.

---

### U3. Render per-tab prose + source footnotes on all three tabs

**Goal:** Bind `paragraphs.description/trade/minerals` to the three tabs and add a source/year footnote under each tabpanel's prose.

**Requirements:** R3, R4, R7

**Dependencies:** U1 (data shape), U2 (renamed `'minerals'` value)

**Files:**
- `components/infographics/AseanInfographic.vue` (modify: Description tabpanel `~:360`; charts tabpanel `~:374`)

**Approach:**
- **Description tab:** swap `{{ activeProfile.paragraph }}` → `{{ activeProfile.paragraphs.description }}`; add a `<p class="asean-infographic__source">Source: {{ activeProfile.sources.description }}</p>` footnote under the paragraph.
- **Charts tab:** add per-tab prose above (or below) the two CardFlips inside `#asean-tabpanel-charts`, bound to `activeProfile.paragraphs.trade` when `tab === 'trade'` and `paragraphs.minerals` when `tab === 'minerals'`. Use a keyed `<Transition name="desc-fade">` (reuse pattern from KTD6) keyed on `` `${activeSlug}-${tab}` `` so the prose swaps both on country switch and on Trade↔Minerals tab change.
- Add the matching source footnote under that prose, bound to `sources.trade` / `sources.minerals`.
- Add a `.asean-infographic__source` scoped style mirroring `chart-card__source` (small, low-opacity, letter-spaced) so the footnotes read consistently in both light and dark.

**Patterns to follow:** `CountryChartCard.vue:32` `chart-card__source` markup + style; the existing `desc-fade` `<Transition>` and `__title-paragraph` style in `AseanInfographic.vue`.

**Technical design (directional):**
```
#asean-tabpanel-charts:
  <Transition name="desc-fade" mode="out-in">
    <div :key="`${activeSlug}-${tab}`">
      <p>{{ tab === 'trade' ? paragraphs.trade : paragraphs.minerals }}</p>
      <p class="...__source">Source: {{ tab === 'trade' ? sources.trade : sources.minerals }}</p>
    </div>
  </Transition>
  ...existing two CardFlips...
```

**Test scenarios:**
- Covers R3. Description tab shows `paragraphs.description` + its footnote; switching to Trade shows `paragraphs.trade` + footnote; switching to Critical Minerals shows `paragraphs.minerals` + footnote.
- Covers R4. Each footnote renders "Source: …" with the A2-mapped attribution.
- Country switch while on the Trade tab cross-fades to the new country's trade prose (keyed transition fires).
- Covers R7. Laos minerals/trade prose (where the 2016 trade/GDP or year caveat appears) shows the year inline.
- Light + dark: footnote text stays legible against the glass sidebar in both themes.

---

### U4. Append source year to chart `source=` strings + rename generated-file headers

**Goal:** Add the year to chart attribution strings without changing any dataset, and remove "Green Transition" from generated-file headers.

**Requirements:** R5, R6, R2

**Dependencies:** none (independent; can land before or after U1–U3)

**Files:**
- `components/infographics/AseanInfographic.vue` (modify: inline chart `source` props at `~:390`, `~:404`, `~:441`)
- `scripts/build-asean-trade-stacked.mjs` (modify: `SOURCE_STRING` → append `, 2024`)
- `scripts/build-asean-minerals.mjs` (modify: generated-header text "Green Transition" → "Critical Minerals"; line `:2` + `:505`)
- `data/asean/trade-stacked.ts` (regenerated artifact — via `npm run gen:trade-stacked`)
- `data/asean/minerals.generated.ts` (regenerated artifact — via `npm run gen:minerals`)

**Approach:**
- Inline chart sources in the component: `"USGS MCS2026"` → `"USGS MCS2026 (2025)"` (mineral share is 2025 per its eyebrow); `"BACI HS07 V202601 (mineral HS6 codes)"` → append `, 2024`; the trade-stacked card uses `:source="activeTradeStacked.source"` so its year comes from the regenerated data (below). The "indicative — not individually sourced" placeholder source is left as-is (no dataset, no year).
- `scripts/build-asean-trade-stacked.mjs`: `SOURCE_STRING = 'BACI HS07 V202601, 2024'`; regenerate `trade-stacked.ts`.
- `scripts/build-asean-minerals.mjs`: replace "Green Transition" in the generated-file header comment with "Critical Minerals"; regenerate `minerals.generated.ts`. Confirm **no dataset values change** in the regen diff — only the header/source strings.
- Do **not** touch `country-hero.generated.ts` values (R6); if its source label is surfaced anywhere user-visible, append `, 2024` to the label only.

**Patterns to follow:** existing `BASE_SOURCE`/`SOURCE_STRING` constants and the `// GENERATED FILE — do not hand-edit` convention.

**Test scenarios:**
- Covers R5. After regen, `trade-stacked.ts` `source` reads `BACI HS07 V202601, 2024`; the stacked-area card footnote shows the year.
- Covers R6. `country-hero.generated.ts` numeric values are byte-identical pre/post (git diff shows no value change).
- Regenerating minerals/trade-stacked produces a diff limited to header/source strings — no row or value churn.
- Covers R2. Generated headers contain no "Green Transition".

Test expectation: generated-data units — verification is the regen diff (values unchanged, strings updated) + typecheck, not a runtime test.

---

## Verification Contract

- **Typecheck:** `npx nuxt typecheck` (or `npx vue-tsc --noEmit`) passes — the `paragraphs`/`sources` shape change compiles across all 10 entries and the component bindings.
- **Lint:** repo lint passes (no script defined; run the project's configured linter if present, otherwise rely on typecheck + build).
- **Build/render:** `npm run dev` (or `nuxt generate`) renders the infographic; dock each of the 10 in-scope countries and confirm all three tabs render the matching Marshall prose + footnote.
- **Regen integrity:** `git diff` after `npm run gen:trade-stacked` and `npm run gen:minerals` shows only string/header changes, no dataset value changes; `country-hero.generated.ts` untouched.
- **Grep gate:** no user-visible "Green Transition" remains (components/, data/, generated headers).
- **Browser (light + dark):** the three tabs swap prose with the active tab; source/year footnotes show; tablist keyboard a11y (arrow/Home/End + roving tabindex) intact in both themes.

---

## Scope Boundaries

**In scope:** the 10 in-build countries' prose + attribution; the tab rename; per-tab prose render + footnotes; chart `source=` year append via regen.

### Deferred to Follow-Up Work
- Verified Key-Facts stat strip (GDP growth / per-capita PPP / trade-GDP / FDI) replacing the placeholder export/import bars — **BF-57**.
- Trade-Agreements (EU / US / China) component.
- Add Timor-Leste as the 11th profile (needs geo feature + tier entry).

**Not touched:** chart datasets (values unchanged); generated hero values; the APG tablist behavior; `docs/plans/` archive's historical "Green Transition" mentions.

---

## Open Questions (deferred to implementation)

- **Footnote granularity:** whether each tab's footnote is a single composite source line or a short multi-source line. Default: one concise line per tab (KTD3/KTD4); refine during U3 if a block's figures span clearly distinct sources worth naming separately.
- **Where the per-tab Trade/Minerals prose sits** relative to the two chart cards (above vs. between). Default: above the cards, so the prose reads first; adjust in U3 if it crowds the glass sidebar at narrow widths.
- **Timor-Leste prose** is present in the source `.md` but the country is not in the build — left untranscribed (out of scope).
