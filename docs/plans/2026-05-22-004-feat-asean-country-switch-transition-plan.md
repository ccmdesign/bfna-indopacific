---
title: "feat: ASEAN sidebar country-switch transition + Description tab [BF-72]"
type: feat
status: active
date: 2026-05-22
---

# feat: ASEAN sidebar country-switch transition + Description tab [BF-72]

## Summary

When a user switches from one country to another while the focused-state sidebar is already open, four animations fire concurrently at `t=0` so the change reads as a single synchronized card turning over: the flag 3D-flips, the country name retypes via typewriter, the hero big-number scrambles into place, and the description paragraph cross-fades — all riding alongside the existing 600 ms map re-zoom. The binary `layer` toggle is replaced by a real 3-tab WAI-ARIA tablist (Description | Trade | Green Transition), and the hero/paragraph move out of the always-visible identity header into a new Description tabpanel.

---

## Problem Frame

The sidebar (`components/infographics/AseanInfographic.vue`) was just refactored into a single right-hand column (commit `dfdc37f`). Today, switching countries swaps all sidebar content instantly with no transition — the flag, name, hero number, and paragraph all hard-cut, which feels abrupt and disconnected from the smooth 600 ms map re-zoom happening at the same time. There is also no "Description" surface: the hero number and narrative paragraph live permanently in the identity header, and the only toggle (`layer`) just flips the two chart cards between Trade and Green Transition lenses. BF-72 makes the country-switch feel like one deliberate, choreographed motion and introduces a Description tab as the default landing view.

---

## Requirements

- R1. Replace the binary `layer` ref with a 3-value tab ref `type Tab = 'description' | 'trade' | 'green'` defaulting to `'description'`. Tab order: Description | Trade | Green Transition.
- R2. The tab group is a real WAI-ARIA tablist: `role="tablist"`/`"tab"`/`"tabpanel"`, `aria-selected`, `aria-controls`, roving `tabindex`, arrow-key navigation. This intentionally **reverses** commit `84d0274` (BF-71) which demoted these to an `aria-pressed` toggle group — it is a deliberate restoration, not a regression.
- R3. Description tab shows the hero big-number (`hero.value`) + `hero.label` + `paragraph`. Trade/Green tabs show the two `CountryChartCard` panels wrapped in the existing `CardFlip`, with `:flipped="tab === 'green'"` preserved on both. Description tab hides the chart panels.
- R4. Flag + country name stay always-visible in the identity header (they animate on switch). The hero block + paragraph move OUT of the header INTO the Description tabpanel.
- R5. Sidebar width cap raised from 480px to 600px: `width: clamp(340px, 34vw, 600px)`.
- R6. A `watch(activeSlug, ...)` fires the four switch effects ONLY when `prev && next && prev !== next` (country↔country). First open (idle→country, i.e. `prev` null) keeps the existing `panel-rise` entrance unchanged.
- R7. Switch effect (a) — Flag: 3D flip via `CardFlip` on the flag. Front = outgoing flag, back = incoming. Toggle `flipped` on switch; after the ~700 ms rotate settles, normalize faces so the next switch flips the same direction.
- R8. Switch effect (b) — Country name: typewriter (char-by-char, ~40 ms/char, blinking caret). Extract the existing typewriter from `AseanMap.vue` into `composables/useTypewriter.ts`; reuse in both `AseanMap.vue` (no behavior change) and the sidebar. Clear → retype the new name.
- R9. Switch effect (c) — Big number: scramble via new `composables/useScramble.ts`. A `requestAnimationFrame` loop renders unsettled positions as random 0–9 glyphs, locking left→right over ~500 ms until the real value shows. Hold `$` and `B` (and any non-digit affix) static; scramble only digit/`.` glyphs.
- R10. Switch effect (d) — Description paragraph: cross-fade via `<Transition>` keyed on `activeSlug` (~500 ms out-then-in). Only runs when the Description tab is active.
- R11. All four effects + the existing 600 ms map re-zoom run concurrently at `t=0` with no added delay — one synchronized motion.
- R12. All effects honor `prefers-reduced-motion`. Flag: `CardFlip` already cross-fades under reduced motion. Typewriter/scramble: skip animation, set final string immediately. Description fade: opacity-only or shortened, matching existing `panel-rise` reduced-motion handling.

---

## Scope Boundaries

- No change to `CardFlip.vue` internals — it is reused as-is for both the chart-panel flip (existing) and the new flag flip. (Its reduced-motion cross-fade already satisfies R12 for the flag.)
- No change to the chart components (`CountryChartCard`, `CountryTradeBalanceBars`, `CountryStackedArea`, `CountryMineralShareBars`, `CountryMineralFlowBand`) or to the trade/minerals data.
- No change to `AseanMap.vue` hover/typewriter *behavior* — only the typewriter logic is extracted into a composable and re-wired so the visible effect is identical.
- No change to the map re-zoom timing (600 ms) or the `panel-rise` first-open entrance.
- No change to `country-profiles.ts` data shape.
- Idle→country (first open) and country→idle (deselect) transitions are out of scope for the new choreography; only country↔country switches trigger it.

---

## Context & Research

### Relevant Code and Patterns

- `components/infographics/AseanInfographic.vue` — the target. Current state: `layer = ref<Layer>('trade')`; identity header (`.asean-infographic__title`) carries flag (`.asean-infographic__title-flag`), name (`.asean-infographic__title-name`), the toggle (`.asean-infographic__tabs` with two `.asean-infographic__tab` buttons using `aria-pressed`), hero (`.asean-infographic__title-hero`), and paragraph (`.asean-infographic__title-paragraph`). Two `.asean-infographic__panel` blocks each wrap a `CardFlip :flipped="layer === 'green'"`. Sidebar rule at `.asean-infographic__sidebar` has `width: clamp(340px, 34vw, 480px)`. Entrance is `<Transition name="panel-rise">` with reduced-motion handling already present (lines ~457–468).
- `components/asean/AseanMap.vue` — typewriter to extract lives at lines ~165–195: `typedName`/`isTyping` refs, `typeTimer` (`setInterval` at 40 ms), `clearTypeTimer()`, `watch(hoveredFeature, ...)` that resets + retypes, and `onUnmounted(() => clearTypeTimer())`. The caret is rendered as `<tspan v-if="isTyping" class="asean-map__caret">▌</tspan>` with the `caret-blink` keyframe in `<style>`. The composable must preserve this exact visible behavior.
- `components/asean/CardFlip.vue` — generic 3D flip: `front`/`back` named slots, `:flipped` prop, `durationMs` prop (default 700), Y-axis `rotateY(180deg)`, `backface-visibility: hidden`. Under `prefers-reduced-motion` it cross-fades faces instead of rotating. Reused unchanged for the flag.
- `data/asean/country-profiles.ts` — `CountryProfile` has `name`, `flagUrl`, `hero: { value: string; label: string }`, `paragraph`. `hero.value` examples: `"$143B"`, `"$2.7B"`, `"$7.3B"`, `"$95B"` (generated from `country-hero.generated.ts`). Affixes to hold static: leading `$`, trailing `B`; scramble the digits and `.`.
- `composables/` conventions — see `composables/useViewport.ts` and `composables/useStraitTransition.ts`: SSR-safe (`import.meta.client` guards), `onScopeDispose` cleanup, reduced-motion detected in JS via `window.matchMedia('(prefers-reduced-motion: reduce)')` (pattern at `useStraitTransition.ts:116`, `useParticleFlow.ts:597`). New composables should follow this shape.
- Route/verification surface — `pages/infographics/asean.vue` renders the infographic; BF-71 was browser-verified at 1280×800 (commit `9c9864e`). There is **no unit-test runner** in this repo (no `test` script, no vitest config) — verification is browser-based at fixed viewports, consistent with prior ASEAN work.

### Institutional Learnings

- No `docs/solutions/` directory exists in this repo. Closest prior art is the BF-71 plan series (`docs/plans/2026-05-22-002`, `-003`) and the existing transition composable `useStraitTransition.ts`, which already encapsulates a reduced-motion-aware multi-effect transition driven by `matchMedia`.

### External References

- Not required. The codebase already has strong local patterns for every piece: `CardFlip` for the flip, the `AseanMap` typewriter for the typewriter, `matchMedia` reduced-motion in composables, and `<Transition>` keying for the cross-fade. WAI-ARIA tablist is a well-established pattern; the implementer should follow the APG tablist keyboard model (arrow keys move selection, roving tabindex) — no external research dispatched.

---

## Key Technical Decisions

- **No GSAP for these effects.** `gsap` is in `package.json`, but every existing animation in this area uses CSS transitions + vanilla `requestAnimationFrame`/`setInterval`. The typewriter and scramble loops should stay vanilla (rAF for scramble, `setInterval` or rAF for typewriter) to match the codebase and keep the composables dependency-free. Rationale: consistency with `useParticleFlow`/`AseanMap` and zero new coupling.
- **Composables are timing engines, not renderers.** `useTypewriter` and `useScramble` own the animating *string state* + timers + reduced-motion shortcut; the component owns markup (caret element, affix layout). This is what lets `AseanMap.vue` reuse `useTypewriter` for an SVG `<text>`/`<tspan>` while the sidebar uses it for an HTML element. Rationale: maximizes reuse, keeps R8's "no behavior change in AseanMap" honest.
- **Flag-face normalization after settle.** `CardFlip` shows `front` when `flipped=false`, `back` when `flipped=true`. To keep flips going the same visual direction every switch (R7), after the ~700 ms rotate completes, the component copies the now-visible incoming flag into the front face and resets `flipped=false` (a non-animated "snap"), so the next switch again flips front→back. Held in component state (`flagFront`/`flagBack` refs + a `flagFlipped` ref + a settle timeout). Rationale: a single persistent `:flipped="tab === ..."`-style binding can't express "always flip forward"; an explicit toggle+normalize does.
- **Single `watch(activeSlug)` orchestrator.** One watcher with the `prev && next && prev !== next` guard (R6) triggers all four effects at `t=0` (R11). First-open (`!prev`) and deselect (`!next`) fall through to the existing `panel-rise`/CardFlip behavior untouched. Rationale: one guard, one trigger point, guarantees synchronization and keeps first-open semantics intact.
- **Tablist replaces toggle; chart binding preserved.** `tab` is the single source of truth. `:flipped="tab === 'green'"` replaces `:flipped="layer === 'green'"` on both chart `CardFlip`s — the Trade↔Green flip is unchanged; only `'description'` is a new third state that hides the panels. Rationale: minimal disturbance to the working chart flip while adding the third tab.
- **Description fade gated on active tab.** The paragraph `<Transition>` keyed on `activeSlug` only mounts/animates while `tab === 'description'` (R10). When the user is on Trade/Green during a switch, the description isn't visible, so its fade is a no-op. Rationale: avoids animating hidden content and matches the requirement.

---

## Open Questions

### Resolved During Planning

- **Test framework?** Resolved: none exists. Verification is browser-based at fixed viewports (1280×800, matching BF-71). Test scenarios below are written as browser/manual verification scenarios, not unit tests.
- **Where do hero/paragraph live now vs. after?** Resolved: currently in `.asean-infographic__title` header (always visible); after R4 they move into the Description tabpanel and the header keeps only flag + name.
- **Does the flag flip reuse CardFlip or a bespoke flipper?** Resolved by requirement: reuse `CardFlip` (R7). Reduced-motion is therefore already handled for the flag by CardFlip's internal cross-fade (R12).
- **Scramble affix handling?** Resolved (defaulted decision, keep): hold `$` and `B` (any non-digit) static; scramble only digit/`.` positions, locking left→right.

### Deferred to Implementation

- **Exact caret markup in the sidebar.** `AseanMap` uses an SVG `<tspan>`; the sidebar name is HTML. The composable exposes `displayText` + `isTyping`; the sidebar renders its own caret span. Final element/class naming is an execution detail.
- **rAF vs. setInterval for the typewriter inside the composable.** Either satisfies "~40 ms/char". Keeping `setInterval` mirrors the current `AseanMap` code most closely; the implementer may switch to rAF if it simplifies cleanup. Visible cadence must remain ~40 ms/char.
- **Whether `useScramble` needs per-position lock timing tuning.** "~500 ms, left→right" is the target; the exact per-glyph lock schedule (linear vs. eased) is a tuning detail to settle in-browser.
- **Sidebar height/`min-height` impact of moving the hero+paragraph into a tabpanel.** Moving content between header and tabpanel may shift the column's natural height; verify the chart panels' `min-height: clamp(240px, 30vh, 300px)` and scroll behavior still look right at the 600px cap.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

Switch orchestration (single watcher, all effects at t=0):

```
watch(activeSlug, (next, prev) => {
  if (!prev || !next || prev === next) return   // R6: only country↔country
  // t=0, concurrent (R11):
  //  (a) flag    → flagBack = incoming flag; flagFlipped = true;
  //                after ~700ms: flagFront = incoming; flagFlipped = false (normalize)
  //  (b) name    → useTypewriter.play(incomingName)         // clear → retype
  //  (c) hero    → useScramble.play(incomingHero.value)     // affix-aware
  //  (d) paragraph → handled declaratively by <Transition key=activeSlug> (R10)
  // map re-zoom (600ms) already fires from AseanMap's own activeSlug-driven frameStyle
})
```

Tab → visible content mapping (R3):

| `tab` value   | Identity header | Description tabpanel | Chart panels (CardFlip)       |
|---------------|-----------------|----------------------|-------------------------------|
| `description` | flag + name     | hero + label + para  | hidden                        |
| `trade`       | flag + name     | hidden               | visible, `flipped=false`      |
| `green`       | flag + name     | hidden               | visible, `flipped=true`       |

Composable contract (directional):

```
useTypewriter(opts?) → { displayText: Ref<string>, isTyping: Ref<boolean>, play(text), stop() }
useScramble(opts?)   → { displayText: Ref<string>, isScrambling: Ref<boolean>, play(value), stop() }
// both: SSR-safe, matchMedia('(prefers-reduced-motion: reduce)') → play() sets final string immediately
// both: onScopeDispose cleanup of timers/rAF
```

---

## Implementation Units

### U1. Extract typewriter into `composables/useTypewriter.ts` and re-wire `AseanMap.vue`

**Goal:** Move the hover-label typewriter logic out of `AseanMap.vue` into a reusable, reduced-motion-aware composable, and re-wire `AseanMap.vue` to consume it with zero visible behavior change.

**Requirements:** R8 (partial — extraction), R12 (partial — typewriter reduced-motion).

**Dependencies:** None.

**Files:**
- Create: `composables/useTypewriter.ts`
- Modify: `components/asean/AseanMap.vue`

**Approach:**
- Composable owns: `displayText` ref, `isTyping` ref, internal timer, `play(text: string)` (clears then types char-by-char at ~40 ms/char), `stop()`. SSR-safe (`import.meta.client`); cleanup via `onScopeDispose`.
- Reduced-motion: when `matchMedia('(prefers-reduced-motion: reduce)').matches`, `play()` sets `displayText` to the full string immediately and leaves `isTyping=false`.
- In `AseanMap.vue`: remove `typedName`/`isTyping`/`typeTimer`/`clearTypeTimer`/`onUnmounted` typewriter code; replace the `watch(hoveredFeature, ...)` body with `play(name)` on hover-in and `stop()`/clear on hover-out. Bind the existing `<text>` to `displayText` and the caret `<tspan v-if="isTyping">` to the composable's `isTyping`.
- Configurable speed (default ~40 ms) so the sidebar can reuse identical cadence.

**Patterns to follow:**
- `composables/useViewport.ts` (SSR guard + `onScopeDispose`); `useStraitTransition.ts:116` / `useParticleFlow.ts:597` for the `matchMedia` reduced-motion pattern.
- Preserve the exact current cadence and caret semantics from `AseanMap.vue:165-195` + the `caret-blink` keyframe (stays in `AseanMap`'s `<style>`).

**Test scenarios:**
- Happy path (browser): hover a country on `pages/infographics/asean.vue` (or `/test/*` map) → name types in char-by-char with a blinking caret; matches pre-refactor behavior.
- Edge case (browser): rapidly hover between two countries → previous type animation is cancelled and the new name types cleanly (no interleaving/leftover chars).
- Edge case (browser): hover out mid-type → label clears, caret disappears, no dangling timer (no console errors, animation stops).
- Reduced-motion (browser, OS reduced-motion on): hover → full name appears instantly, no caret animation.
- Verification that AseanMap is unchanged: visual diff of hover behavior before/after is identical.

**Verification:**
- AseanMap hover-label looks and behaves exactly as before the extraction; `useTypewriter` is imported and used by AseanMap; no leftover typewriter state in the component.

---

### U2. Add `composables/useScramble.ts` (affix-aware number scramble)

**Goal:** New composable that animates a numeric-with-affix string by churning unsettled digit positions through random 0–9 glyphs and locking them left→right over ~500 ms, holding non-digit affixes (`$`, `B`, `.` optional) static.

**Requirements:** R9, R12 (partial — scramble reduced-motion).

**Dependencies:** None.

**Files:**
- Create: `composables/useScramble.ts`

**Approach:**
- Composable owns: `displayText` ref, `isScrambling` ref, internal `requestAnimationFrame` handle, `play(value: string)`, `stop()`. SSR-safe; `onScopeDispose` cleanup.
- Parse the target string into positions; classify each as scrambleable (digit, and per the defaulted decision, scramble digits while holding `$`/`B`/non-digits — treat `.` as a held affix or scrambleable per tuning, but `$` and `B` are always held). Compute a per-position lock time spanning ~500 ms left→right. On each rAF frame, render locked positions as their final glyph and unlocked digit positions as a random 0–9.
- Reduced-motion: `play()` sets `displayText` to the final value immediately, `isScrambling=false`.

**Patterns to follow:**
- `composables/useParticleFlow.ts` rAF loop + `matchMedia` reduced-motion gate (lines ~547, ~597) for the cancel/cleanup shape; `useViewport.ts` for SSR + scope-dispose.

**Test scenarios:**
- Happy path (browser): call `play("$143B")` → `$` and `B` stay fixed throughout; the three digits churn random 0–9 and lock left→right, ending on `143`, total ~500 ms.
- Edge case (browser): single-digit-ish value like `"$2.7B"` → `$`/`B` held, `2`, `.`(per chosen rule), `7` settle left→right ending correct.
- Edge case (browser): calling `play()` again before the previous settle completes → previous rAF cancelled, new scramble starts cleanly to the new value.
- Edge case: empty or affix-only string → renders the literal string, `isScrambling` resolves false without errors.
- Reduced-motion (browser): `play()` → final value shown instantly, no glyph churn.

**Verification:**
- A standalone exercise (e.g., on a `/test` scratch or via the sidebar in U4) shows digits scrambling and locking left→right with affixes static; reduced-motion shows the value instantly; no rAF leaks on unmount.

---

### U3. Convert the layer toggle to a 3-tab WAI-ARIA tablist + restructure markup

**Goal:** Replace `layer` with `tab: Ref<Tab>` (`'description' | 'trade' | 'green'`, default `'description'`), build a real tablist (Description | Trade | Green Transition), move hero + paragraph into the Description tabpanel, keep flag + name in the header, and rebind the chart `CardFlip`s to `tab === 'green'`. Raise the sidebar width cap to 600px.

**Requirements:** R1, R2, R3, R4, R5.

**Dependencies:** None (but lands before U4/U5 which animate the restructured pieces).

**Files:**
- Modify: `components/infographics/AseanInfographic.vue`

**Approach:**
- State: remove `type Layer` / `layer`; add `type Tab = 'description' | 'trade' | 'green'` and `const tab = ref<Tab>('description')`.
- Tablist (replaces `.asean-infographic__tabs` group): three buttons in order Description, Trade, Green Transition. Apply `role="tablist"` to the container, `role="tab"` to each button, `aria-selected="tab === value"`, `aria-controls` pointing at the corresponding tabpanel `id`, and roving `tabindex` (0 for the selected tab, -1 for others). Arrow Left/Right (and Home/End) move selection following the APG tablist model; click selects. Keep `pointer-events: auto` on the tablist (sidebar is click-through).
- Tabpanels: Description tabpanel (`role="tabpanel"`, `id` matching the Description tab's `aria-controls`, hidden unless `tab === 'description'`) contains the hero block (`.asean-infographic__title-hero` with `hero.value` + `hero.label`) and the paragraph (`.asean-infographic__title-paragraph`), moved out of the header. The chart panels become the Trade/Green tabpanel content, shown when `tab === 'trade' || tab === 'green'` and hidden when `'description'`.
- Identity header (`.asean-infographic__title`) keeps only flag + name.
- Chart `CardFlip`s: change both `:flipped="layer === 'green'"` → `:flipped="tab === 'green'"`. Wrap/guard both `.asean-infographic__panel` blocks so they render only for Trade/Green.
- CSS: change `.asean-infographic__sidebar` `width: clamp(340px, 34vw, 480px)` → `clamp(340px, 34vw, 600px)`. Reuse existing `.asean-infographic__tab` styling; map `is-active` to the selected tab. Note in code comment that this reverses BF-71 commit `84d0274` by design (R2).

**Patterns to follow:**
- Existing `.asean-infographic__tabs`/`.asean-infographic__tab` styles and focus-visible handling (keep). WAI-ARIA APG Tabs pattern for roles + keyboard.

**Test scenarios:**
- Happy path (browser, 1280×800): select a country → sidebar opens on Description tab showing hero number + label + paragraph; flag + name visible in header; chart panels hidden.
- Happy path (browser): click Trade → description hidden, two chart cards show front faces; click Green Transition → cards flip to back faces (existing flip preserved); click Description → cards hidden, hero+paragraph return.
- Accessibility (browser/AT): tablist exposes `role=tablist` with three `role=tab` children; selected tab has `aria-selected=true` and `tabindex=0`, others `-1`; each tab's `aria-controls` resolves to its tabpanel.
- Keyboard (browser): focus a tab → Arrow Right/Left moves selection across the three tabs (wrapping per APG), Home/End jump to first/last; Enter/Space/auto-activation selects; focus ring visible (`:focus-visible`).
- Layout (browser): at viewport widths spanning the clamp, sidebar caps at 600px (was 480px); content remains legible and scrolls if it overflows.
- Edge case (browser): switch country while on Trade tab → tab selection persists (stays on Trade), charts update for the new country.

**Verification:**
- Three working tabs with correct ARIA + keyboard nav; hero/paragraph live in the Description panel; charts only on Trade/Green with the Trade↔Green flip intact; sidebar caps at 600px.

---

### U4. Wire the country-switch orchestrator (typewriter + scramble + paragraph fade)

**Goal:** Add the single `watch(activeSlug, ...)` orchestrator that, on a true country↔country switch, fires the name typewriter (U1), the hero scramble (U2), and the description paragraph cross-fade concurrently at `t=0` — leaving first-open and deselect untouched.

**Requirements:** R6, R8 (sidebar reuse), R9 (sidebar wire), R10, R11, R12 (typewriter/scramble/fade reduced-motion).

**Dependencies:** U1, U2, U3.

**Files:**
- Modify: `components/infographics/AseanInfographic.vue`

**Approach:**
- Consume `useTypewriter()` for the country name and `useScramble()` for `hero.value`. Render the name from the typewriter's `displayText` (+ a caret element bound to `isTyping`), and the hero number from the scramble's `displayText`, inside the restructured markup from U3.
- Add `watch(activeSlug, (next, prev) => { if (!prev || !next || prev === next) return; ... })`. Inside: call typewriter `play(newName)` and scramble `play(newHero.value)`. The paragraph fade is declarative (U-handled by the `<Transition>` in U5) — the watcher does not imperatively drive it, but this unit verifies all three start together with no added delay (R11). First open (`!prev`) leaves `displayText` initialized to the static values so `panel-rise` shows them immediately without a switch animation.
- Initialization: when the sidebar first mounts for a country (idle→country), set the typewriter/scramble `displayText` to the final strings directly (no `play`), so first-open keeps the existing `panel-rise` entrance (R6) and doesn't type/scramble.
- Reduced-motion is inherited from the composables (instant final string) and from CardFlip/`<Transition>` CSS; no extra gating needed here beyond ensuring `play()` is still called (the composable short-circuits internally).

**Patterns to follow:**
- `AseanMap.vue`'s `activeSlug`-driven reactivity for how selection flows; `useStraitTransition.ts` for a reduced-motion-aware multi-effect coordinator.

**Test scenarios:**
- Happy path (browser, reduced-motion OFF): with sidebar open on Description, click a different country → at the same instant the map re-zooms (600 ms), the name retypes, the hero number scrambles and locks left→right (~500 ms), and the paragraph cross-fades — reading as one synchronized motion.
- Edge case (browser): first open (idle→country) → no typewriter/scramble/fade choreography; existing `panel-rise` entrance plays and content appears settled.
- Edge case (browser): selecting the same country again / deselect (country→idle) → no switch choreography (guard `prev && next && prev !== next`); deselect uses existing `panel-rise` leave.
- Edge case (browser): rapid A→B→C switches → each effect cancels and restarts cleanly (no overlapping scramble/type), final state matches country C.
- Switch on Trade/Green tab (browser): name + flag still animate; hero scramble state updates underneath; description fade is a no-op because the panel is hidden (R10) — verify no errors and that switching to Description afterward shows the correct settled values.
- Reduced-motion (browser, ON): switch → name and hero appear as final strings instantly; paragraph opacity-only/short fade; no churn or typing.

**Verification:**
- Country↔country switch triggers name typewriter + hero scramble + paragraph fade concurrently with the 600 ms re-zoom; first-open and deselect are unchanged; reduced-motion shows instant settled values.

---

### U5. Flag 3D-flip on switch (CardFlip reuse) + paragraph `<Transition>` + reduced-motion polish

**Goal:** Wrap the flag in `CardFlip` so a switch flips outgoing→incoming flag in unison with the other effects, normalizing faces after the ~700 ms settle so each switch flips the same direction; add the `activeSlug`-keyed `<Transition>` around the description paragraph; finalize reduced-motion behavior across all four effects.

**Requirements:** R7, R10, R11, R12.

**Dependencies:** U3 (restructured markup), U4 (orchestrator/timing).

**Files:**
- Modify: `components/infographics/AseanInfographic.vue`

**Approach:**
- Flag: wrap `.asean-infographic__title-flag` in `<CardFlip :flipped="flagFlipped">` with `#front`/`#back` slots rendering `flagFront`/`flagBack` flag `<img>`s. On a switch (driven from U4's watcher, or a dedicated watch on `activeProfile.flagUrl`): set `flagBack = incoming flagUrl`, `flagFlipped = true`; after ~700 ms (CardFlip default duration; use a matched timeout or `transitionend`) normalize — `flagFront = incoming`, `flagFlipped = false` — without animating (the snap is invisible because front already shows the incoming flag mid-rotate). This keeps every subsequent switch flipping front→back in the same direction (R7).
- Description paragraph: wrap in `<Transition name="desc-fade">` keyed on `activeSlug` for an out-then-in cross-fade (~500 ms, R10), inside the Description tabpanel so it only animates when visible.
- Reduced-motion (R12): flag relies on CardFlip's built-in cross-fade (already present, no work). Add `desc-fade` reduced-motion handling mirroring the existing `panel-rise` `@media (prefers-reduced-motion: reduce)` block (opacity-only or `transition: none`). Typewriter/scramble already short-circuit via their composables (U1/U2).
- Timing: the flag flip starts at `t=0` alongside the other effects (R11); its 700 ms duration overlaps the 600 ms re-zoom and ~500 ms scramble/fade — acceptable per "one synchronized motion" (effects start together; individual durations differ by design).

**Patterns to follow:**
- `CardFlip.vue` usage already in this same file for the chart panels (`<CardFlip :flipped="...">` with `#front`/`#back`). The existing `panel-rise` reduced-motion `@media` block as the template for `desc-fade` reduced-motion.

**Test scenarios:**
- Happy path (browser, reduced-motion OFF): switch countries → the flag performs a single Y-axis 3D flip from the old flag to the new one, concurrent with name/hero/paragraph and the re-zoom.
- Direction consistency (browser): perform several consecutive switches → every flip rotates the same direction (no alternating/reverse flip), confirming the post-settle normalization works.
- Happy path (browser): on Description tab, switch → paragraph fades out then in over ~500 ms (not a hard cut) keyed on `activeSlug`.
- Edge case (browser): rapid switches faster than 700 ms → flag flip restarts to the latest incoming flag without getting stuck mid-rotation showing a stale face.
- Reduced-motion (browser, ON): switch → flag cross-fades (CardFlip reduced-motion) instead of rotating; paragraph uses opacity-only/short fade or none per the matched `panel-rise` handling; overall no 3D motion.
- First-open (browser): idle→country shows the correct flag immediately via `panel-rise` with no flip.

**Verification:**
- Flag flips once per switch, same direction every time, in sync with the other effects; description cross-fades on switch when the Description tab is active; all four effects degrade correctly under `prefers-reduced-motion`.

---

## System-Wide Impact

- **Interaction graph:** `activeSlug` is owned by `AseanInfographic.vue` and updated from `AseanMap.vue`'s `@update:active-slug`. The new orchestrator (U4) keys off `activeSlug`; the map's existing `frameStyle` re-zoom also keys off `activeSlug` — both react to the same source, which is what produces the synchronized `t=0` start (R11). No new cross-component contract.
- **API surface parity:** `useTypewriter` becomes shared by `AseanMap.vue` and `AseanInfographic.vue`; any future typewriter consumer should use it too. `CardFlip` now has a second consumer pattern (flag) in addition to chart panels.
- **State lifecycle risks:** Both composables run rAF/`setInterval` timers; they must cancel on re-trigger and clean up via `onScopeDispose`/component unmount to avoid leaks during rapid switching or route changes. The flag-normalization timeout must be cleared if a new switch arrives before it fires.
- **Unchanged invariants:** `CardFlip.vue` is not modified; the chart Trade↔Green flip is unchanged aside from the `layer→tab` rename of its `:flipped` source; the 600 ms map re-zoom and `panel-rise` first-open entrance are untouched; `country-profiles.ts` data shape is unchanged; AseanMap hover behavior is visually identical post-extraction.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Typewriter extraction subtly changes AseanMap hover behavior (cadence, caret, cancel-on-rehover). | U1 explicitly preserves the 40 ms cadence and caret semantics; browser-verify hover before/after as identical. |
| Flag flip alternates direction or shows a stale face on rapid switches. | Post-settle face normalization (Key Decisions / U5) + cancel/restart on re-trigger; tested via consecutive-switch and rapid-switch scenarios. |
| Effects drift out of sync (added delay creeps in). | Single `watch(activeSlug)` orchestrator fires all imperative effects at `t=0`; paragraph fade is declarative on the same `activeSlug` key; re-zoom already reacts to `activeSlug`. R11 verified visually. |
| rAF/interval timer leaks during rapid switching or unmount. | SSR-safe composables with `onScopeDispose` cleanup; `play()` cancels any in-flight loop; flag-normalize timeout cleared on re-trigger. |
| Moving hero+paragraph into a tabpanel shifts sidebar height/scroll at the new 600px cap. | Deferred-to-implementation layout check; verify chart panel `min-height` + overflow scroll at 1280×800 and wider. |
| Reviewers read the tablist restoration as a regression of BF-71. | R2 + an in-code comment explicitly note this reverses commit `84d0274` by design. |

---

## Documentation / Operational Notes

- Per project `CLAUDE.md`: this work tracks to Plane issue **BF-72** (workspace `ccm-design`) — move to In Progress before work, In Review at PR, Done at merge; comment the PR link (run through `plane-markdown`). Branch is `feature/BF-72-country-switch-transition` off `dev`; PR targets `dev`.
- No runtime/ops impact (static Nuxt infographic). No new dependencies added.
- Verification is browser-based at 1280×800 (and a wider width to confirm the 600px cap), with `prefers-reduced-motion` toggled on/off — consistent with the BF-71 browser-verify convention.

---

## Sources & References

- Target components: `components/infographics/AseanInfographic.vue`, `components/asean/AseanMap.vue`
- Reused unchanged: `components/asean/CardFlip.vue`
- New: `composables/useTypewriter.ts`, `composables/useScramble.ts`
- Data shape: `data/asean/country-profiles.ts` (`hero.value`, `hero.label`, `paragraph`, `name`, `flagUrl`)
- Composable patterns: `composables/useViewport.ts`, `composables/useStraitTransition.ts`, `composables/useParticleFlow.ts`
- Route/verification surface: `pages/infographics/asean.vue`
- Prior art: `docs/plans/2026-05-22-003-feat-asean-focused-quadrant-content-plan.md` (BF-71); commits `84d0274` (tablist demotion this plan reverses), `dfdc37f` (sidebar consolidation)
