---
status: completed
type: fix
plan_depth: standard
created: 2026-05-18
ticket: BF-59
epic: ASEAN real-data (closes BF-56/57/58 → BF-59)
mode: headless
---

# fix: ASEAN — real source attribution + final verification pass

## Summary

BF-59 is the **closing ticket** of the ASEAN real-data epic. BF-56/57/58 wired
real trade, hero/paragraph, and critical-minerals data into the ASEAN
infographic. This ticket makes **attribution real everywhere**, removes the
remaining unintentional placeholder/stale strings, fixes one carried-forward
cosmetic label-collision bug, and runs the **final integrity + visual
verification pass** against `DESIGN.md` / `PRODUCT.md`.

Three behavioral surfaces are in scope:

1. **Attribution truth** — the page-level `footerSource` is a literal
   placeholder (`'Source: placeholder, real attribution wires May 2026'`); the
   per-chart `source:` props must each be cross-checked against the matching
   `_data/sources/*.SCOUT.md`. The single most dangerous artifact is the Card B
   *front* face: it renders the BF-57 **UNVERIFIED PLACEHOLDER**
   `topExports/topImports` under a specific, real-sounding citation
   (`source="OEC 2023 / UN Comtrade"`). That fabricated-looking attribution over
   admittedly-unverified data is exactly the "defensibly sourced" violation
   `PRODUCT.md §Design Principles 3` exists to prevent. The fix is to make the
   *attribution honest*, **not** to fabricate the data.
2. **Stale/placeholder string cleanup** — `AseanInfographic.vue:107` carries a
   now-false comment ("data is placeholder until the minerals layer is wired" —
   minerals IS wired, BF-58). Sweep the ASEAN surface for any other
   unintentional placeholder/TODO/stale strings. The intentional, honest
   `UNVERIFIED PLACEHOLDER` markers in `country-profiles.ts` are **explicitly
   excluded** — see Scope Boundaries.
3. **Visual QA** — fix the Card B (`CountryMineralFlowBand.vue`) below-band
   destination-label collision at small segment widths (renders like
   "Japan 5%Other 5%"), then run the full `DESIGN.md` / `PRODUCT.md`
   verification checklist (AA contrast, reduced-motion, 1280×800 light+dark,
   portrait rotate overlay, embed parity).

**The deferred-data tension (resolved up front).** `country-profiles.ts` carries
19 `UNVERIFIED PLACEHOLDER` markers on `topExports`/`topImports`. These are the
**deliberate, honest BF-57 deferral** (Decision D1: no HS-product source exists
or is cheaply recoverable). They are **CORRECT as-is**. This plan **keeps** them,
does **not** fabricate / regenerate / guess the data, and does **not** delete
the markers (deleting them would make fake data masquerade as real — strictly
worse). The only change touching this data is making its *presentation
attribution* honest (Unit U1), which reinforces the deferral rather than
undermining it. The deferral is documented below as **accepted scope**.

---

## Decisions (auto-resolved — headless mode)

> Headless/autonomous mode: every open question is resolved here with rationale.
> No user prompts.

- **Decision (auto): The page `footerSource` becomes `Source: CEPII BACI &
  USGS` linking to the CEPII BACI download page** — because the ASEAN
  infographic's quantitative spine is BACI HS07 V202601 (trade-stacked, hero,
  nickel flows) plus USGS MCS2026 (mineral production). Sibling pages establish
  the convention of *one canonical institutional source name + one stable
  canonical URL* (`Source: Our World in Data`, `Source: IMF PortWatch`). A
  single combined label keeps the footer chrome to one line per `DESIGN.md §5
  Footer Chrome` while being defensible: both are the real, dominant sources.
  The URL points to the BACI data page from `baci-trade.SCOUT.md §1`
  (`https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37`, the
  stable dataset landing page rather than the raw ZIP). Exact final label/URL is
  pinned in Unit U1; both are real and defensible, which is the bar.
- **Decision (auto): Card B front face attribution is corrected to signal
  "indicative, not sourced" rather than citing OEC/UN Comtrade** — because the
  data behind it (`topExports/topImports`) is the BF-57 honest deferral with no
  real source. Citing a specific real database over unverified data is the worst
  outcome (`PRODUCT.md`: "A wrong sourced-looking number is worse than an honest,
  tracked deferral"). The card keeps rendering (no empty-state regression, per
  BF-57 D1), but its `eyebrow`/`source` text changes to an honest
  "Indicative composition — not individually sourced" treatment. This is a
  low-risk, design-consistent **text/label** change inside the existing
  `CountryChartCard` slots — **no data is touched, no marker deleted**.
- **Decision (auto): No new visual "indicative" chrome (badges, watermarks,
  hatching) is added to the trade-balance chart body** — because `DESIGN.md`
  forbids second saturated accents and chartjunk, and `PRODUCT.md` Design
  Principle 1 says visual integrity outranks authoring convenience. The honest
  signal is carried by the **card eyebrow + source line** (existing typographic
  α-ladder chrome), which is the design-consistent, lowest-risk treatment and is
  sufficient for reader integrity. Documented here as the deliberate choice
  (the ticket explicitly allowed "leave as-is and document why" for the chart
  body itself; the attribution line is the part that must change).
- **Decision (auto): The Card B label-collision fix uses below-band label
  collision-avoidance within the existing D3-in-Vue pattern, not a redesign** —
  because the ticket scopes this as a "small, contained label-layout fix" and
  the file already has a width-based fold guard (`layoutSegments`) and a
  reduced-motion gate. The fix nudges adjacent below-band labels apart (and/or
  shares a fold), mirroring `CountryStackedArea.vue`'s "skip cramped bands"
  precedent, and is gated for reduced-motion like the rest of the file.
- **Decision (auto): SIPRI / IEA / ACLED / FDI SCOUT sources are reference-only
  for this ticket** — because the defense layer and other thesis layers are
  *not wired into any visible ASEAN chart yet* (`_data/README.md`: defense layer
  is "future"; layer tabs are Trade + Green Transition only). Only BACI HS07
  V202601 and USGS MCS2026 back rendered charts, so only those need per-chart
  attribution verification. SIPRI/IEA strings are not introduced.
- **Decision (auto): `_data/README.md` line 44-47 "Open mapping question"
  about `topExports/topImports` is left intact** — it is accurate
  documentation of the real, accepted deferral, not a stale string. Only
  *false* / *obsolete* comments are cleaned (e.g. the "until the minerals layer
  is wired" comment, which is now factually wrong).
- **Decision (auto): No regeneration of generated `.ts` files is performed
  unless a `source` constant in them is provably wrong** — the SCOUT
  cross-check (Unit U2) is read-only verification; the generated files
  (`trade-stacked.ts`, `country-hero.generated.ts`, `minerals.generated.ts`)
  already carry correct `BACI HS07 V202601` / `USGS MCS2026` strings. If a
  string is wrong, the fix is in the **generator script** then regenerate via
  the existing `npm run gen:*` script, never a hand-edit of the generated file.

---

## Requirements Traceability

| Req | Description | Unit(s) |
|-----|-------------|---------|
| R1 | Page-level `footerSource` is a real, defensible citation + URL; embed page inherits it | U1 |
| R2 | Card B front-face attribution is honest (no fabricated-looking source over unverified data) | U1 |
| R3 | Every per-chart `source:` string cross-checked against the matching SCOUT doc; vague/wrong ones fixed | U2 |
| R4 | No UNINTENTIONAL placeholder/TODO/stale-comment strings remain in the ASEAN surface | U3 |
| R5 | Intentional honest `UNVERIFIED PLACEHOLDER` deferral preserved, not fabricated, markers not deleted | U1, U3 (guard) |
| R6 | Card B (`CountryMineralFlowBand.vue`) below-band label collision fixed, reduced-motion gated | U4 |
| R7 | `npm run build` passes | U5 |
| R8 | WCAG 2.1 AA contrast on the navy gradient (body 4.5:1, large 3:1; α≤0.6 ornamental only) | U5 |
| R9 | `prefers-reduced-motion: reduce` honored across the ASEAN surface | U5 |
| R10 | BFNA mark + source line visible; visual integrity at 1280×800 light AND dark; portrait shows rotate overlay | U5 |
| R11 | Embed page (`/embed/asean`) renders at parity with standalone (shared head + footer inheritance) | U5 |

---

## High-Level Technical Design

The ASEAN attribution surface has three tiers. This map shows *where each
citation lives* and *which source backs it* — directional context for review,
not implementation specification.

```
PAGE FOOTER (layouts/default.vue ← route.meta.footerSource)
  pages/infographics/asean.vue  →  footerSource {url,label}   [PLACEHOLDER — fix U1]
  pages/embed/asean.vue         →  inherits via useAseanHead   [verify U5]
        (NOTE: footerSource is page-meta, NOT in useAseanHead — embed.vue
         layout must still surface it; confirm parity in U5)

PER-CHART SOURCE PROPS (components/infographics/AseanInfographic.vue)
  Card A front  CountryTradeBalanceBars   source="OEC 2023 / UN Comtrade"   ← UNVERIFIED data  [fix U1: honest label]
                eyebrow="Top trade · 2023"                                   ← misleading       [fix U1]
  Card A back   CountryMineralShareBars   source="USGS MCS2026"             ← matches usgs-minerals.SCOUT  [verify U2 ✓]
  Card B front  CountryStackedArea        :source=activeTradeStacked.source  → "BACI HS07 V202601"  [verify U2 ✓]
  Card B back   CountryMineralFlowBand    source="BACI HS07 V202601 (mineral HS6 codes)"  [verify U2 ✓]

GENERATED-FILE source CONSTANTS (read-only cross-check, U2)
  data/asean/trade-stacked.ts          BASE_SOURCE        = 'BACI HS07 V202601'   ✓ baci-trade.SCOUT
  data/asean/country-hero.generated.ts (header provenance) 'BACI HS07 V202601'    ✓ baci-trade.SCOUT
  data/asean/minerals.generated.ts     PROD_SOURCE_LABEL  = 'USGS MCS2026'        ✓ usgs-minerals.SCOUT
                                       FLOW_SOURCE_LABEL  = 'BACI HS07 V202601'   ✓ baci-trade-minerals.SCOUT

STALE COMMENT (U3)
  AseanInfographic.vue:107  "...placeholder until the minerals layer is wired"  ← FALSE (BF-58 wired it)
```

*This illustrates the intended approach and is directional guidance for review,
not implementation specification. The implementing agent should treat it as
context, not code to reproduce.*

---

## Implementation Units

### U1. Real footer citation + honest Card B front-face attribution

**Goal:** Replace the literal placeholder `footerSource` with a real,
defensible BACI+USGS citation, and correct the Card B *front-face* eyebrow +
source so a fabricated-looking citation no longer sits over the BF-57 unverified
`topExports/topImports`.

**Requirements:** R1, R2, R5 (guard)

**Dependencies:** none

**Files:**
- `pages/infographics/asean.vue` — `footerSource.url` + `footerSource.label`
- `components/infographics/AseanInfographic.vue` — Card A front `<CountryChartCard>` `eyebrow` + `source` props (lines ~112-119 region)
- (read-only reference) `_data/sources/baci-trade.SCOUT.md`, `_data/sources/usgs-minerals.SCOUT.md`, `todos/BF-57-defer-top-trade-hs-product-composition.md`, `pages/infographics/renewables.vue` (sibling label convention)

**Approach:**
- `footerSource.label` → a one-line canonical institutional citation naming the
  two dominant real sources (BACI HS07 V202601 + USGS MCS2026), styled to match
  the sibling convention (`Source: …`). `footerSource.url` → the stable CEPII
  BACI dataset landing page from `baci-trade.SCOUT.md §1`. Keep it a single
  source link (footer chrome is one line per `DESIGN.md §5`).
- Card B **front** (`CountryTradeBalanceBars` — the `topExports/topImports`
  card): change `eyebrow="Top trade · 2023"` and `source="OEC 2023 / UN Comtrade"`
  to an honest treatment that signals the composition is **indicative, not
  individually sourced** (e.g. eyebrow conveys "Indicative composition",
  source line states it is not individually sourced / see methodology). Exact
  copy finalized at implementation; the bar is: no specific real database is
  cited over the unverified arrays, and the wording is honest and
  design-consistent (plain α-ladder source text, no new chrome).
- **Guard (R5):** do NOT touch `data/asean/country-profiles.ts`. The
  `topExports/topImports` arrays and their `UNVERIFIED PLACEHOLDER` comments
  stay byte-identical. This unit only changes *presentation attribution* in the
  `.vue` files.

**Patterns to follow:** `pages/infographics/renewables.vue` and
`pages/infographics/straits/[[id]].vue` `footerSource` shape (one
`{url,label}`, `label` starts `Source: `). `CountryChartCard` `eyebrow`/`source`
prop usage already in `AseanInfographic.vue` (Card A back / Card B faces).

**Test scenarios:**
- Covers R1. Standalone `/infographics/asean`: footer renders the new label,
  no "placeholder" / "wires May 2026" substring anywhere in rendered DOM; the
  `<a class="source-link">` href is the real CEPII URL and opens
  (`target=_blank rel=noopener`).
- Covers R2. Card A front (trade-balance): rendered eyebrow + source line do
  NOT contain "OEC" or "UN Comtrade"; the source line honestly communicates the
  composition is indicative / not individually sourced.
- Covers R5 (guard). `git diff data/asean/country-profiles.ts` is empty after
  this unit (no data, no marker, no comment changed).
- Edge: a country with `hasMaterialData:false` for minerals (e.g. Brunei) still
  shows the corrected honest front-face attribution (attribution is card-level,
  not data-conditional).

**Verification:** Footer + Card B front attribution read as honest and
defensible on the running page; `country-profiles.ts` untouched in `git diff`.

---

### U2. Cross-check every per-chart `source:` string against its SCOUT doc

**Goal:** Verify each rendered per-chart citation + each generated-file
`source` constant matches the exact real citation in the corresponding
`_data/sources/*.SCOUT.md`. Fix only provably-wrong/vague ones (via generator
script if generated).

**Requirements:** R3

**Dependencies:** U1 (U1 owns the Card A front-face string; U2 verifies the
remaining three chart faces + the generated constants do not regress)

**Files:**
- (read-only verify) `components/infographics/AseanInfographic.vue` — Card A back `source="USGS MCS2026"`, Card B front `:source="activeTradeStacked.source"`, Card B back `source="BACI HS07 V202601 (mineral HS6 codes)"`
- (read-only verify) `data/asean/trade-stacked.ts` `BASE_SOURCE`, `data/asean/country-hero.generated.ts` header, `data/asean/minerals.generated.ts` `PROD_SOURCE_LABEL` / `FLOW_SOURCE_LABEL`
- (read-only reference) `_data/sources/baci-trade.SCOUT.md`, `_data/sources/baci-trade-minerals.SCOUT.md`, `_data/sources/usgs-minerals.SCOUT.md`
- (fix-only-if-wrong) the matching `scripts/build-asean-*.mjs` generator, then `npm run gen:*`

**Approach:** Build a small verification matrix: each visible `source:`/`meta:`
citation and each generated `source` constant → its SCOUT doc → expected exact
string. Expected, from the SCOUT docs: trade = `BACI HS07 V202601` (release
V202601, `baci-trade.SCOUT.md §1`); minerals production = `USGS MCS2026`
(`usgs-minerals.SCOUT.md §1`); nickel flows = `BACI HS07 V202601` restricted to
the 15 critical-mineral HS6 codes (`baci-trade-minerals.SCOUT.md §2`). Current
strings already match — this unit is primarily a **read-only audit that
produces a documented matrix**. Only if a string is provably wrong or vague:
fix the source in the **generator script**, rerun `npm run gen:<x>`, and
confirm byte-stable deterministic output. Never hand-edit a generated file.

**Patterns to follow:** generated-file headers already document provenance
(`trade-stacked.ts:1-10`, `minerals.generated.ts:8-22`) — the audit confirms
the rendered strings match those headers and the headers match the SCOUTs.

**Test scenarios:**
- Covers R3. For each of the 4 chart faces, the rendered `Source: …` line
  string is asserted equal to the SCOUT-derived expected string (USGS MCS2026 /
  BACI HS07 V202601 / BACI HS07 V202601 mineral-HS6 / BACI HS07 V202601).
- `data/asean/*.ts` `source` constants grep-match the SCOUT citations exactly
  (`BACI HS07 V202601`, `USGS MCS2026`); no `Comtrade`, `OEC`, `placeholder`,
  `TODO`, or bare `BACI` (without version) in any rendered chart citation.
- If any generator was touched: re-running `npm run gen:<x>` twice produces
  byte-identical output (determinism preserved per `minerals.generated.ts`
  header contract).

**Verification:** A written source-attribution matrix (chart face → SCOUT →
string) with every row PASS; no generated file hand-edited.

---

### U3. Remove stale / unintentional placeholder comments (deferral markers preserved)

**Goal:** Delete the now-false `AseanInfographic.vue:107` comment and sweep the
ASEAN surface for any other unintentional placeholder/TODO/stale strings,
**without touching** the intentional honest `UNVERIFIED PLACEHOLDER` markers.

**Requirements:** R4, R5 (guard)

**Dependencies:** U1 (U1 may rewrite the Card B front-face block; U3 reconciles
the surrounding dock comment so they do not conflict)

**Files:**
- `components/infographics/AseanInfographic.vue` — the dock comment block at line ~104-107 ("Back-face data is placeholder until the minerals layer is wired") and the line-29 inline comment `// Layer 2 data lands next pass.` (also now stale — minerals layer shipped in BF-58)
- (sweep, read-only unless a true stale string is found) `pages/infographics/asean.vue`, `pages/embed/asean.vue`, `components/asean/*`, `composables/useAseanHead.ts`, `data/asean/*.ts`

**Approach:** Rewrite the dock comment to describe the *current* reality (front
= Trade layer, back = Green Transition / critical-minerals layer, both wired).
Remove/repair the stale `// Layer 2 data lands next pass.` comment. Re-run the
placeholder sweep grep (the one used during planning) and confirm the only
remaining `placeholder`-class matches are: (a) the intentional
`UNVERIFIED PLACEHOLDER` markers + the `todos/BF-57-…` comment references in
`country-profiles.ts`, and (b) `_data/README.md`'s accurate "Open mapping
question" documentation. Everything else must be gone.

- **Guard (R5):** the 19 `UNVERIFIED PLACEHOLDER` comment lines and the
  `country-profiles.ts` header block (lines 14-17) are **intentional honest
  deferral documentation** and must remain byte-identical. They are NOT stale
  strings. Deleting them is explicitly out of scope and would be a regression
  (fake data masquerading as real).

**Patterns to follow:** existing accurate provenance comments in the generated
files (`minerals.generated.ts` header) as the model for what a *correct,
non-stale* comment looks like.

**Test scenarios:**
- Covers R4. Post-change grep over the ASEAN surface for
  `placeholder|TODO|FIXME|wires May|until the minerals|is wired|next pass`
  (case-insensitive), excluding `UNVERIFIED PLACEHOLDER` and the
  `country-profiles.ts` deferral header / `_data/README.md` mapping note,
  returns zero matches.
- Covers R5 (guard). `git diff data/asean/country-profiles.ts` is still empty
  after this unit; the 19 marker lines and header block are intact.
- Edge: the rewritten dock comment accurately states both card faces are wired
  (no future-tense "until …", no "next pass").

**Verification:** Sweep grep clean except the documented intentional
exclusions; `country-profiles.ts` untouched.

---

### U4. Fix Card B below-band destination-label collision

**Goal:** Stop adjacent narrow-segment below-band labels in
`CountryMineralFlowBand.vue` from overlapping (rendered like "Japan 5%Other
5%"), using a contained collision-avoidance fix that matches the existing
D3-in-Vue label pattern and is reduced-motion safe.

**Requirements:** R6

**Dependencies:** none (independent of U1-U3; can land in parallel)

**Files:**
- `components/asean/CountryMineralFlowBand.vue` — the `else` branch of the
  per-segment label block (lines ~225-249, the "Tick + label beneath narrow
  segments" path) and/or `layoutSegments` (lines ~74-104)

**Approach:** The collision is structural: every narrow segment places its
tick + below-band label centered at the segment midpoint (`cx`,
`text-anchor: middle`) with no awareness of neighbours, so two adjacent thin
slices (e.g. JPN 5% then OTHER 5%) print their labels on top of each other.
Contained fix options (implementer picks the lowest-risk one that holds at
1280×800 and at narrower embed widths):
- After computing all below-band label x-positions, run a single
  left-to-right pass that pushes any label whose measured/estimated extent
  overlaps the previous one rightward by the minimum delta (a 1-D label
  declutter, the standard D3-in-Vue pattern), keeping the leader tick at the
  true segment center.
- And/or tighten `layoutSegments`' fold threshold so sub-label-width slivers
  fold into the trailing `OTHER` earlier (mirrors `CountryStackedArea.vue`'s
  "skip cramped bands" precedent at line ~145), reducing the number of
  below-band labels that can collide.
- Keep the China-always-explicit rule and the existing
  `prefersReducedMotion()` gate intact; any added transition must no-op under
  reduced motion exactly as the existing bar grow does.

**Technical design (directional, not specification):**

```
existing (collision):           fixed (declutter pass):
 ┌──┐┌──┐                        ┌──┐┌──┐
 JPN 5%OTHER 5%   →              JPN 5%   OTHER 5%
   (labels centered,               (overlapping labels nudged
    overlap when both narrow)       apart; ticks stay at center)
```
*Directional guidance for review only — the implementer chooses declutter vs.
earlier-fold vs. both based on what holds across tested widths.*

**Patterns to follow:** `CountryStackedArea.vue` "skip cramped bands"
(`bandHeight < 14`) as the precedent for width/space-aware label suppression;
the existing `layoutSegments` fold-into-OTHER mechanism in the same file;
`prefersReducedMotion()` gate already in `CountryMineralFlowBand.vue`.

**Execution note:** Visual-regression-shaped — eyeball at 1280×800 and at a
narrow embed width *before* and *after* on a country known to produce ≥2 thin
non-China segments (Malaysia: USA 0.1% / KOR 5.1%; Philippines: EU 0% / KOR 0%;
or Indonesia's USA/EU/KOR/OTHER tail), and on Brunei/Cambodia which hit the
`hasData=false` honest state (must remain unaffected).

**Test scenarios:**
- Covers R6. Indonesia Green-Transition Card B (flows: CHN 90.3, JPN 5,
  EU 1.3, KOR 1.3, OTHER 1.9, USA 0.1): no two below-band labels overlap; every
  visible segment still labelled; China still explicit.
- Edge: Malaysia (CHN 67.7, JPN 14.3, EU 12.7, KOR 5.1, USA 0.1) — multiple
  mid/narrow segments, labels remain individually legible at narrow embed
  width.
- Edge: Laos (single KOR 100% segment) — single label still centered, no
  regression from the declutter pass.
- Edge: Brunei / Cambodia (`hasMaterialData:false`, `flows:[]`) — honest
  empty-state copy renders unchanged (label path not entered).
- Reduced-motion: with `prefers-reduced-motion: reduce`, segments + labels
  render in final position with no transition; label declutter still applied.

**Verification:** On the running app at 1280×800 and one narrow embed width,
no overlapping destination labels on any of the 6 material-minerals countries;
reduced-motion path visually identical minus animation.

---

### U5. Final verification pass — build, AA contrast, reduced-motion, 1280×800 light+dark, embed parity

**Goal:** Execute the full `DESIGN.md` / `PRODUCT.md` acceptance checklist and
record the result. This is the ticket's closing gate.

**Requirements:** R7, R8, R9, R10, R11

**Dependencies:** U1, U2, U3, U4 (verification runs against the finished
surface)

**Files:** none modified by default (verification unit). If a defect is found,
the fix lands in the owning unit's files and that unit's scenarios are re-run.

**Approach:** Run the **Final-Verification Checklist** below end-to-end against
the running app (standalone `/infographics/asean` and embed `/embed/asean`) in
both light and dark rendering contexts at 1280×800, plus a portrait check.
Production build must pass. Record each checklist item PASS/FAIL with evidence
(the verification artifact can be the PR description / ticket comment — do not
create a standalone report `.md`).

**Execution note:** Verification-first for this unit — confirm actual command
output and actual rendered pixels, not "should pass". `npm run build` output
must be read, not assumed. Visual checks use the browser at exactly 1280×800.

**Test scenarios (this IS the acceptance checklist):**

- **R7 — Build.** `npm run build` (Nuxt 4) completes with no errors; no new TS
  errors introduced by U1/U3/U4 edits.
- **R8 — AA contrast.** On the `ink → abyss` navy gradient: body/data text ≥
  4.5:1, large/display ≥ 3:1. Every `rgba(255,255,255, α)` with α ≤ 0.6 carries
  only ornamental labels (axis/meta/source chrome), never body data — spot-check
  the corrected footer label, Card A front honest source line, Card B
  declutered labels, and the minerals honest-empty-state copy (α 0.92 / 0.78
  per component CSS comments).
- **R9 — Reduced-motion.** With `prefers-reduced-motion: reduce`: layer-tab
  transition, `CountryStackedArea`, `CountryMineralShareBars`,
  `CountryMineralFlowBand` (incl. the U4 declutter), and any FLIP/card-flip all
  render final-state with no animation.
- **R10 — Mark + integrity + portrait.** BFNA logo + footer source line visible
  on standalone and embed; visual integrity holds at exactly 1280×800 in both
  light and dark; portrait viewport below breakpoint shows
  `RotateDeviceOverlay` (standalone — embed inherits per layout).
- **R11 — Embed parity.** `/embed/asean` renders the same infographic; head
  comes from `useAseanHead` (title parity) and `robots: noindex` is present;
  confirm the footer source line + BFNA mark also appear on the embed layout
  (embed uses `layout: embed` — verify it surfaces `footerSource`/logo, since
  `footerSource` is page-meta not part of `useAseanHead`; if the embed layout
  legitimately omits the footer by design, document that as expected parity,
  not a defect).
- No "placeholder" / "wires May 2026" / "OEC" / "UN Comtrade" string in the
  rendered DOM of either route (final regression sweep over U1+U3).
- `git diff data/asean/country-profiles.ts` empty (final guard that the BF-57
  honest deferral survived the whole ticket untouched).

**Verification:** Every checklist row PASS with recorded evidence; the
`country-profiles.ts` guard diff is empty; build is green.

---

## Final-Verification Checklist (acceptance criteria)

This is the concrete pass/fail gate for BF-59. The ticket is **done** only when
every box is checked with evidence.

- [ ] **Real footer attribution** — page `footerSource` is a real, defensible
      BACI+USGS citation with a working CEPII URL; zero placeholder/"wires May
      2026" substring anywhere rendered. *(R1, U1)*
- [ ] **Honest Card A front attribution** — the trade-balance card no longer
      cites OEC/UN Comtrade over the unverified composition; its eyebrow/source
      honestly reads as indicative / not individually sourced. *(R2, U1)*
- [ ] **Per-chart attribution verified** — all 4 chart faces + generated
      `source` constants match their SCOUT docs (`BACI HS07 V202601`,
      `USGS MCS2026`); audit matrix all-PASS. *(R3, U2)*
- [ ] **No unintentional placeholder/stale strings** — sweep grep clean except
      the documented intentional exclusions. *(R4, U3)*
- [ ] **Intentional UNVERIFIED deferral preserved** — `country-profiles.ts`
      `git diff` empty; 19 markers + header intact; data NOT fabricated,
      regenerated, guessed, or markers deleted. **(R5 — KEEP, DON'T FABRICATE)**
- [ ] **Card B label collision fixed** — no overlapping below-band destination
      labels on any material-minerals country at 1280×800 and a narrow embed
      width; reduced-motion safe. *(R6, U4)*
- [ ] **`npm run build` passes** — green, no new TS errors. *(R7, U5)*
- [ ] **WCAG 2.1 AA contrast** — body 4.5:1 / large 3:1 on the navy gradient;
      α≤0.6 text ornamental only. *(R8, U5)*
- [ ] **Reduced-motion honored** — all ASEAN motion no-ops under
      `prefers-reduced-motion: reduce`. *(R9, U5)*
- [ ] **1280×800 light + dark integrity + portrait** — BFNA mark + source line
      visible; visual integrity holds both rendering contexts; portrait shows
      rotate overlay. *(R10, U5)*
- [ ] **Embed parity** — `/embed/asean` matches standalone (shared head,
      `noindex`, footer/mark behavior documented). *(R11, U5)*

---

## Scope Boundaries

### In scope
- Page `footerSource` real citation + URL (`pages/infographics/asean.vue`).
- Card A front-face honest attribution (eyebrow + source) in
  `AseanInfographic.vue`.
- Read-only audit of all per-chart `source:` strings vs SCOUT docs; generator
  fix only if a string is provably wrong.
- Removal of the stale `AseanInfographic.vue:107` comment + the stale
  `// Layer 2 data lands next pass.` comment + any other unintentional
  placeholder/TODO/stale strings on the ASEAN surface.
- The contained `CountryMineralFlowBand.vue` below-band label-collision fix.
- The full final `DESIGN.md`/`PRODUCT.md` verification pass.

### Explicitly NOT in scope — accepted deferral (KEEP, DO NOT FABRICATE)
- **`data/asean/country-profiles.ts` `topExports`/`topImports` and their 19
  `UNVERIFIED PLACEHOLDER` markers.** This is the deliberate, honest BF-57
  Decision D1 deferral: no HS-product source exists or is cheaply recoverable
  (`todos/BF-57-defer-top-trade-hs-product-composition.md`). This plan
  **keeps** the data and markers byte-identical, does **NOT** fabricate /
  regenerate / estimate / "directionally approximate" the values, and does
  **NOT** delete the markers (deleting them would make fake data masquerade as
  real — strictly worse, and an integrity regression under `PRODUCT.md`). The
  only related change is making the *card's presentation attribution honest*
  (U1), which reinforces the deferral. The chart body itself gets **no** new
  "indicative" chrome (badges/watermarks) — that was evaluated and rejected as
  unnecessary chartjunk; the honest signal rides on the existing source-line
  typography (auto-decision documented above). A `git diff
  country-profiles.ts` empty check is an acceptance gate in U1/U3/U5.

### Deferred to Follow-Up Work (separate tickets, not this PR)
- Wiring real HS-product `topExports`/`topImports` composition (the full path
  is already specified in `todos/BF-57-defer-top-trade-hs-product-composition.md`
  §"Future path": re-download CEPII BACI HS07 ZIP, author an HS-product filter
  notebook, emit `_data/wrangled/asean-trade-composition.csv`, add a sibling
  generator). Out of scope here by accepted BF-57 decision.
- Wiring the defense layer (SIPRI milex) / other thesis layers — not rendered
  on the current Trade + Green Transition surface; future epic.
- `todos/152-deferred-p2-brunei-label-visual-verification.md` (Brunei `dy`
  offset in `AseanMap.vue`) — a *separate* pre-existing P2 label-verification
  item, distinct from the U4 `CountryMineralFlowBand` collision. May be
  opportunistically confirmed during the U5 1280×800 visual pass, but is not a
  BF-59 acceptance gate.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Scope-creep into fabricating the deferred trade composition (the central trap of this ticket) | Hard guard: `git diff data/asean/country-profiles.ts` must be empty — asserted in U1, U3, and U5. Plan states KEEP/DON'T-FABRICATE in Summary, Decisions, Scope Boundaries, and the checklist. |
| Footer label/URL chosen is not actually defensible | Both BACI HS07 V202601 and USGS MCS2026 are the real dominant sources per the SCOUT docs and generated-file headers; URL is the stable CEPII dataset landing page from `baci-trade.SCOUT.md §1`, not a volatile deep link. |
| Card B label fix regresses the China-always-explicit rule or the honest empty-state | U4 scenarios explicitly cover Laos (single segment), Brunei/Cambodia (empty state), and assert China stays explicit; reduced-motion path asserted. |
| Hand-editing a generated `.ts` file to "fix" a source string | U2 mandates: fix the generator script + rerun `npm run gen:*`, never hand-edit; determinism re-checked. |
| Embed footer parity ambiguity (`footerSource` is page-meta, not in `useAseanHead`) | U5 R11 explicitly investigates whether the embed layout surfaces the footer; documents the actual designed behavior rather than assuming a defect. |
| "Visual integrity at 1280×800 light AND dark" — app may be dark-only | Verify the actual rendering contexts the app supports; if there is no light mode, record that the "light" check = the lightest rendered region contrast still meets AA (don't invent a theme). |

---

## Notes / Observations (noticed, not touched)

- `todos/152-deferred-p2-brunei-label-visual-verification.md` is a real,
  separate pre-existing P2 (Brunei `dy` offset in `AseanMap.vue`). Logged in
  Deferred Follow-Up; not fixed here to keep BF-59 contained.
- `AseanInfographic.vue:29` `// Layer 2 data lands next pass.` is a second
  stale comment beyond the line-107 one the ticket named — folded into U3 since
  it is the same class of now-false comment (minerals layer shipped in BF-58).
