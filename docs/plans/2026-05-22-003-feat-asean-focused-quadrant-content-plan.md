---
title: "feat: ASEAN focused-state quadrant content (re-home legacy panels into TR/BL/BR)"
type: feat
status: active
date: 2026-05-22
ticket: BF-71
area: components/infographics/AseanInfographic.vue, components/asean/AseanMap.vue
---

# feat: ASEAN focused-state quadrant content

## Summary

Build the **FOCUSED** state of the ASEAN infographic. When a country is selected,
the map already docks it into the **top-left (TL)** quadrant (shipped via
`docs/plans/2026-05-22-001-feat-asean-map-quadrant-dock-spec.md`). This ticket fills
the **other three quadrants** with that country's content panels:

- **TL** — docked country on the fullscreen map (**already shipped — no change**).
- **TR** — country identity: flag + name, Trade / Green Transition layer tabs,
  hero big-number + label, narrative paragraph.
- **BR** — horizontal tornado bars (exports/imports balance), `CountryTradeBalanceBars`.
- **BL** — stacked area (trade with US / China / EU, 2010–2024), `CountryStackedArea`.

This is almost entirely a **re-layout**, not net-new construction. Everything is
already built and wired to live data behind a kill switch
(`const SHOW_LEGACY_PANELS = false` in `AseanInfographic.vue`). The work: retire the
kill switch, split the single legacy `__dock` (TR title block + bottom 2-card row)
into three independently-positioned quadrant panels, wire the layer tabs to flip
**BR + BL in unison** via the existing shared `layer` state, add fade/slide-in
transition choreography timed against the ~600 ms map re-zoom, suppress the in-map
country label collision in TR, and get pointer-events right so tabs work, the docked
country stays re-clickable, and bare map between cards stays clickable.

There is no upstream `ce-brainstorm` doc for BF-71. This plan is sourced from the
BF-71 ticket + the deferred quadrant-content half of the 2026-05-22-001 spec; design
choices resolved inline, biased toward DESIGN.md's cinematic register and the existing
component conventions.

---

## Problem Frame

`AseanInfographic.vue` (`position: fixed; inset: 0`, 100svw × 100svh) renders
`<AseanMap>` as the fullscreen base layer. On top of it:

- An **idle intro** (`__intro`, `v-if="!activeSlug"`) in the TR quadrant — title +
  subtitle + blurb. `pointer-events: none`. Shipped, keep working.
- A **legacy title block** (`__title`, `v-if="activeProfile && SHOW_LEGACY_PANELS"`):
  flag + name, Trade/Green tabs, hero value/label, paragraph. Positioned `top/right`,
  ~`clamp(360px, 36vw, 560px)` wide. Wired to `activeProfile` + `layer`.
- A **legacy bottom dock** (`__dock`, same gate): a 65/35 two-column grid spanning the
  full width near the bottom. Left = `CardFlip` (front `CountryTradeBalanceBars`, back
  `CountryMineralShareBars`); right = `CardFlip` (front `CountryStackedArea`, back
  `CountryMineralFlowBand`). Both `CardFlip`s read `:flipped="layer === 'green'"`.

Both legacy blocks are gated off (`SHOW_LEGACY_PANELS = false`) — the focused map
currently shows only the docked country with empty TR/BL/BR. This ticket re-homes the
gated content into proper quadrant positions and turns it on.

### Reactive data already available (no data work)

- `activeSlug: Ref<string | null>` — map selection (controlled `<AseanMap>` two-way bind).
- `activeProfile` — `{ name, flagUrl, hero.value, hero.label, paragraph, topExports,
  topImports, tagline, slug }` from `profileBySlug(activeSlug)`.
- `activeTradeStacked` — stacked-area series + `source`, or `undefined`.
- `activeMinerals` — `MINERALS_BY_SLUG[slug]`; **always defined for wired slugs**.
  Low-data countries (Brunei/Cambodia/Singapore) carry `hasMaterialData:false` and the
  mineral components render the **designed honest state internally** (verified — see D5).
- `layer: Ref<'trade' | 'green'>` — shared tab state driving both `CardFlip`s.

### Layout canon (PRODUCT.md / DESIGN.md)

- **1280×800 landscape is the canon** (16:9 stage; also runs in a 1280×800 iframe via
  `pages/embed/asean.vue`, and full-page via `pages/infographics/asean.vue`).
- Portrait / small screens get a **rotate overlay**, never a shrink-to-fit fallback —
  so mobile/portrait is correctly **out of scope** here (DESIGN.md:242, PRODUCT.md:44).
- The conceptual 2×2 grid is a **framing target on a fullscreen map**, not a CSS grid
  that crops the map. Panels are absolutely-positioned overlays in each quarter.

---

## Requirements

- **R1.** Remove the `SHOW_LEGACY_PANELS` kill switch. Focused-state panels render on
  `v-if="activeProfile"`; the idle intro renders on `v-if="!activeSlug"`. The two are
  **mutually exclusive** (active vs. no-active) and must never co-render.
- **R2.** **TR panel** = country identity: flag + name, Trade / Green Transition layer
  tabs, hero value + label, paragraph. Occupies ~the top-right quarter. No card chrome
  (sits directly on the dark map, like the current `__title`).
- **R3.** **BR panel** = `CountryChartCard` → `CardFlip` (front `CountryTradeBalanceBars`,
  back `CountryMineralShareBars`). Occupies ~the bottom-right quarter.
- **R4.** **BL panel** = `CountryChartCard` → `CardFlip` (front `CountryStackedArea`,
  back `CountryMineralFlowBand`). Occupies ~the bottom-left quarter.
- **R5.** Layer tabs in TR flip **BR + BL in unison** via the single `layer` ref
  (`:flipped="layer === 'green'"` on both cards — already the wiring; preserve it).
- **R6.** **Transition choreography:** focused panels fade/slide in as the map re-zooms
  (~600 ms, the map's existing `cubic-bezier(0.4, 0, 0.2, 1)` plate transition). Panels
  enter slightly **after** the map starts moving so content lands as the country settles
  into TL; on deselect, panels leave (fade) before/while the map zooms back out. Use Vue
  `<Transition>`/`<TransitionGroup>` with CSS — **no GSAP** (matches existing intro-fade
  and map conventions).
- **R7.** **Reduced motion:** under `prefers-reduced-motion: reduce`, panels appear/
  disappear instantly (no slide, no fade duration). Extend the existing reduced-motion
  blocks; `CardFlip` already cross-fades instead of rotating under reduced motion.
- **R8.** **In-map label collision (gotcha 1):** `AseanMap` renders the active country's
  name label to the RIGHT of its bbox (`labelX = bounds.right + 16`, `labelY = bbox
  vertical center`). In focused state the docked country sits in TL and its label lands
  rightward — into the TR identity panel, colliding with the flag/name. **Suppress the
  in-map active label in focused state** (the TR panel already shows flag + name). The
  hover label (typewriter) stays. See D1 for the mechanism.
- **R9.** **Pointer events (gotcha 2):**
  - TR tabs need `pointer-events: auto` (and the tab buttons must be clickable).
  - The rest of the TR identity text can be `pointer-events: none` so bare map behind it
    stays clickable, OR the whole TR panel is `auto` but sized to not overhang TL.
  - BL / BR cards are `pointer-events: auto` (cards capture clicks; that's fine —
    nothing under a card needs to be clicked).
  - **No panel may overlap the TL-docked country** — re-click-to-deselect must keep
    working. TR/BL/BR must leave the TL quarter (and a margin around the docked country)
    free of pointer-capturing surfaces. See D2.
- **R10.** **Honest data preserved (gotcha 3):**
  - BR trade card keeps eyebrow "Indicative composition" and source line
    "indicative — not individually sourced" (topExports/topImports are unverified
    placeholder composition, flagged in `data/asean/country-profiles.ts`; BF-57 deferred).
  - Green layer renders the **designed honest state** for `hasMaterialData:false`
    countries (Brunei/Cambodia/Singapore), never a blank/zero chart — already handled
    inside `CountryMineralShareBars` / `CountryMineralFlowBand` (verified, D5).
- **R11.** **Do NOT touch `PLATE` calibration** in `AseanMap.vue`, and do not change the
  docked-map re-zoom math (`frameStyle`, `QUADRANT_PAD`, `MIN/MAX_DOCK_ZOOM`).
- **R12.** `npm run build` passes with no type errors; visual check at 1280×800 in both
  the embed and full-page mounts, in default + reduced-motion, for at least one
  material-data country (Indonesia) and one `hasMaterialData:false` country (Brunei).

---

## Design Decisions

- **D1 — Suppress the in-map active label (gotcha 1).** Add an opt-in prop to
  `AseanMap` — `suppressActiveLabel?: boolean` (default `false`, preserving current
  behavior elsewhere) — and `v-if`-gate the `<text class="asean-map__label--active">`
  inside the active overlay group on `!suppressActiveLabel`. `AseanInfographic` passes
  `:suppress-active-label="true"`. This is a surgical, additive change that does **not**
  touch PLATE or the re-zoom transform (R11). Rejected alternative: offsetting `labelX`
  in focused state — fragile against per-country bbox geometry and still risks overlap.
- **D2 — Quadrant geometry & TL safe zone (gotcha 2 / R9).** Position each panel into
  its quarter with `position: absolute` + viewport units, leaving the **entire TL
  quarter (and a comfortable margin) clear**:
  - TR: `top: 0; right: 0;` width ≈ `clamp(360px, 42vw, 560px)`, `max-height: ~46svh`.
    Keep it from crossing the vertical midline into TL.
  - BL: `bottom; left;` width ≈ `min(46vw, …)`, height the card's measured frame
    (`min-height` ~300–340px as today). Stays in the lower-left quarter; its top edge
    sits well below the TL country.
  - BR: `bottom; right;` mirror of BL.
  - The docked country occupies roughly the TL quarter centered at viewBox `(480, 270)`;
    on a 16:9 stage that's the upper-left screen quarter. Reserve that quarter so
    re-click-to-deselect always lands on the country, not a panel. Tune the exact
    clamps visually at 1280×800.
- **D3 — Split the legacy `__dock` grid into two free panels.** The current single
  `.asean-infographic__dock` is one full-width 65/35 grid holding both cards. Replace it
  with two independently-positioned wrappers (`__panel-bl`, `__panel-br`), each a
  `CardFlip` inside a sizing wrapper that gives the 3D flip a measured frame (keep the
  existing `min-height` + `display:flex; align-items:stretch` pattern from `__dock-bars`
  / `__dock-chart` — `CardFlip` faces are absolutely positioned and need a sized parent).
  The 65/35 asymmetry is dropped; BL (stacked area, wider data) and BR (tornado bars)
  each get their own quarter. Chart `:height` props stay ~220 (tune if a quarter is tight).
- **D4 — Choreography (R6).** Wrap the focused-panel group in `<Transition>` (or per-panel
  transitions) named e.g. `panel-rise`: enter = `opacity 0 → 1` + `translateY(12px) → 0`
  over ~360–420 ms with a small enter-delay (~120–180 ms) so the map (600 ms) leads;
  leave = fade ~240 ms. Mirror the existing `intro-fade` block's reduced-motion guard
  (set `transition: none`). Keep durations subordinate to the 600 ms map move so the eye
  follows map → content, not content → map. Exact timings tunable in review.
- **D5 — Green honest state is component-owned (gotcha 3 / R10).** Verified:
  `CountryMineralShareBars` gates on `hasData = data.hasMaterialData &&
  production.length > 0`; `CountryMineralFlowBand` gates on `hasData =
  hasMaterialData && flows.length > 0 && flowsTotalUsdM > 0` and renders a designed
  `mineral-flow--empty` typographic block (lede + context) when false. So the parent
  only needs to keep passing `:data="activeMinerals"` — **no parent-side empty-state
  branching required**. The existing `v-if="activeMinerals"` guard on the back faces is
  belt-and-suspenders (slug always resolves) and can stay.
- **D6 — Idle ↔ focused mutual exclusivity (R1).** Idle intro: `v-if="!activeSlug"`.
  Focused panels: `v-if="activeProfile"` (equivalently `activeSlug && profile exists`).
  Since `onActiveSlugUpdate` only accepts `null` or a slug with a profile, `activeProfile`
  is truthy exactly when `activeSlug` is a valid selection — the two predicates are
  complementary, so intro and panels never co-render. Keep both inside their own
  `<Transition>` so the crossfade reads cleanly on select/deselect.

---

## Implementation Steps

All changes are in **`components/infographics/AseanInfographic.vue`** plus one additive
prop in **`components/asean/AseanMap.vue`**. No data files, no new components.

1. **AseanMap — add `suppressActiveLabel` prop (D1, R8).**
   - Add `suppressActiveLabel?: boolean` to `withDefaults(defineProps…)`, default `false`.
   - Gate the active-overlay `<text class="asean-map__label--active">` with
     `v-if="!suppressActiveLabel"`. Leave hover label, PLATE, and `frameStyle` untouched.

2. **AseanInfographic — retire the kill switch (R1).**
   - Delete `const SHOW_LEGACY_PANELS = false` and its comment.
   - Pass `:suppress-active-label="true"` to `<AseanMap>`.

3. **AseanInfographic — TR identity panel (R2, R5).**
   - Keep the existing `__title` markup (flag + name, tabs, hero, paragraph) but change
     its `v-if` to `activeProfile` (drop `&& SHOW_LEGACY_PANELS`).
   - Wrap in a `<Transition name="panel-rise">` (D4). Reposition CSS into the TR quarter
     per D2 (it's already `top/right`; verify width/height clamps keep it out of TL).
   - Tabs already wired to `layer` — confirm tab buttons have `pointer-events: auto` and
     the surrounding identity text does not capture clicks meant for the bare map (R9/D2).

4. **AseanInfographic — split dock into BL + BR panels (R3, R4, D3).**
   - Replace `.asean-infographic__dock` (single 65/35 grid) with two absolutely-positioned
     wrappers:
     - `__panel-bl` (bottom-left) → the `CardFlip` whose front is `CountryStackedArea`
       (guard with `v-if="activeTradeStacked"` as today) / back `CountryMineralFlowBand`.
     - `__panel-br` (bottom-right) → the `CardFlip` whose front is
       `CountryTradeBalanceBars` / back `CountryMineralShareBars`.
   - Preserve `CountryChartCard` eyebrows/titles/meta/source verbatim, **including the
     BR "indicative — not individually sourced" source line** (R10).
   - Each wrapper keeps the sized-frame pattern (`min-height`, `display:flex;
     align-items:stretch`, child `flex:1`) so `CardFlip` has a frame to rotate in.
   - Both cards keep `:flipped="layer === 'green'"` (R5).
   - Wrap each in `<Transition name="panel-rise">` (or one wrapping group) per D4.

5. **CSS — quadrant positioning + choreography (D2, D4, R6, R7).**
   - TR/BL/BR absolute positions + clamps per D2; verify none overhangs the TL quarter
     or the docked-country safe zone.
   - Add `.panel-rise-enter-active / -leave-active / -enter-from / -leave-to` per D4.
   - Extend the `@media (prefers-reduced-motion: reduce)` block to zero out
     `panel-rise` transitions (R7).
   - Keep the `__edge-fade` and `__intro` blocks; confirm the intro's
     `pointer-events: none` and TR panel pointer rules don't fight.

6. **Verify (R12).**
   - `npm run build` (nuxt build) — no type errors.
   - Visual at 1280×800 (embed + full page): Indonesia (material) and Brunei
     (`hasMaterialData:false`) — confirm green layer shows the honest state, not blank.
   - Toggle Trade ↔ Green — BL + BR flip in unison.
   - Re-click the docked country — deselects (no panel intercepts the click).
   - Click country A → B — panels swap, map re-frames, no label collision in TR.
   - Reduced-motion (emulate) — instant panel show/hide; CardFlip cross-fades.

---

## Files Touched

- `components/infographics/AseanInfographic.vue` — primary: retire kill switch, re-home
  TR/BL/BR panels, choreography CSS, pointer-events, pass `suppress-active-label`.
- `components/asean/AseanMap.vue` — additive `suppressActiveLabel` prop + `v-if` on the
  active label only. **No PLATE / re-zoom changes.**
- `docs/plans/2026-05-22-003-feat-asean-focused-quadrant-content-plan.md` — this plan.

**Not touched:** `CountryChartCard.vue`, `CardFlip.vue`, `CountryTradeBalanceBars.vue`,
`CountryStackedArea.vue`, `CountryMineralShareBars.vue`, `CountryMineralFlowBand.vue`,
`data/asean/*` — all reused as-is.

---

## Acceptance Criteria

1. On load: idle fullscreen map + TR intro; no focused panels.
2. Select a country: map docks it TL; TR identity, BL stacked area, BR tornado bars
   fade/slide in (~after the 600 ms re-zoom starts); intro is gone.
3. The in-map active-country label is suppressed in focused state (no collision with
   the TR panel); hover labels still work.
4. Trade / Green tabs flip BL **and** BR in unison.
5. `hasMaterialData:false` countries (Brunei/Cambodia/Singapore) show the designed honest
   green state, never a blank or zero chart.
6. BR trade card still reads "Indicative composition" / "indicative — not individually
   sourced".
7. Re-click the docked country deselects (no panel intercepts the click); country→country
   switch re-frames cleanly.
8. `prefers-reduced-motion: reduce`: panels appear/disappear instantly; CardFlip
   cross-fades.
9. `npm run build` passes; PLATE calibration and re-zoom math unchanged.

---

## Out of Scope

- Mobile / portrait layout (rotate-overlay canon covers it; deferred per ticket).
- New data sourcing — HS-product trade composition stays unverified placeholder (BF-57).
- Changing the docked-map re-zoom math / `PLATE` calibration.
- Any change to the mineral chart components' internal honest-state design.

---

## Open Questions / Decisions for the Implementer

- **Q1 — Exact TL safe-zone margin.** D2 reserves "the TL quarter + a margin." The precise
  pixel margin around the docked country (so a fat-finger re-click still deselects) is a
  visual tune at 1280×800. Suggest starting with panels strictly outside the screen
  quarter and nudging in only if a quarter looks empty.
- **Q2 — TR width vs. midline.** TR is currently `clamp(360px, 36vw, 560px)`. At 1280px,
  36vw ≈ 461px — under half-width, good. If copy wraps awkwardly, widen toward 42vw but
  keep the panel's left edge right of the vertical midline so it never crosses into TL.
- **Q3 — Panel enter-delay / durations (D4).** ~120–180 ms enter delay and ~360–420 ms
  rise are starting points; final timing is a feel call in review against the 600 ms map.
- **Q4 — Single wrapping `<Transition>` vs. per-panel.** A single group transition is
  simpler; per-panel allows staggered entry (TR → BL → BR). Recommend per-panel only if
  the simultaneous entry feels flat in review.
- **Q5 — Deselect affordance.** The 2026-05-22-001 spec left open whether deselect is
  re-click-only or also click-empty-sea / explicit close. This ticket only requires
  re-click-to-deselect keeps working (R9); a broader affordance is a separate decision.
- **Q6 — Chart heights in a true quarter.** Existing `:height="220"` was tuned for the
  full-width bottom dock. In a half-width quarter the stacked area / tornado bars may
  want a small height bump or margin tweak; verify legibility at 1280×800 (R12).
