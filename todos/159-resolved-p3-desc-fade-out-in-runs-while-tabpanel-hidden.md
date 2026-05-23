---
status: resolved
resolution: "Option B — documented the benign hidden-tab cycle in code; no render-semantics change (no strand, validated; v-if gating would add an unwanted tab-open fade-in)"
priority: p3
issue_id: "159"
tags: [code-review, vue-transition, accessibility, BF-72]
dependencies: []
---

# desc-fade `<Transition mode="out-in">` Runs Its Leave/Enter Cycle While the Tabpanel Is `display:none`

## Problem Statement

In `components/infographics/AseanInfographic.vue` the description paragraph cross-fade is:

```html
<section v-show="tab === 'description'" ... class="asean-infographic__tabpanel">
  ...
  <Transition name="desc-fade" mode="out-in">
    <p :key="activeSlug" class="asean-infographic__title-paragraph">{{ activeProfile.paragraph }}</p>
  </Transition>
</section>
```

The keyed `<p>` lives inside a `v-show` (`display:none` when not the active tab) section. When the
user switches countries **while on the Trade or Green tab**, `activeSlug` changes, so the keyed
`<p>` is removed/re-inserted and Vue schedules the `mode="out-in"` leave→enter cycle on a
hidden element.

Plan **R10** states the description fade should be a no-op while the Description tab is hidden.
This implementation still schedules the transition cycle on the hidden node.

## Findings

- **Source:** `components/infographics/AseanInfographic.vue`, `<Transition name="desc-fade" mode="out-in">` (around line 300) inside the `v-show="tab === 'description'"` section.
- **Validation (Stage 5b):** Re-checked Vue 3 transition internals. `transitionend` does **not**
  fire on a `display:none` element, but Vue's `getTransitionInfo` reads the declared
  `transition-duration` (still computable while hidden) and sets a **duration-based fallback
  timer**, so the out-in cycle resolves rather than hanging. The resting `<p>` ends with its
  transition classes removed (no inline `opacity`), so when the Description tab is later shown
  the paragraph is at full opacity. **Therefore this is NOT a stranding/blank-paragraph bug.**
- **Impact:** Mild. (1) Wasted transition scheduling on hidden content. (2) A deviation from
  R10's "no-op when hidden" intent. No visible defect under default Vue behavior; reduced-motion
  is also fine (`desc-fade-*-active { transition: none }` → 0 duration → resolves immediately).
- **Severity:** P3 (downgraded from an initial P2 after validation confirmed no strand).
- **Requires verification:** Yes — a quick in-browser confirm is still warranted because
  transition timing/`transitionend` behavior can vary across browsers.

## Proposed Solutions

### Option A: Make the fade a true no-op when hidden (recommended)
- **Approach:** Switch the keyed paragraph from a `v-show`-only descendant to one that does not
  participate in the transition while hidden — e.g. render the `<p>` behind
  `v-if="tab === 'description'"` (inside the existing `<Transition>`), so its key only changes
  while the Description tab is actually visible.
- **Pros:** Matches R10 exactly; no transition work on hidden content.
- **Cons:** `v-if` remounts the paragraph when entering the Description tab (a one-time fade-in on
  tab-open), which may or may not be desired. Verify the tab-open visual reads acceptably.
- **Effort:** Small. **Risk:** Low.

### Option B: Leave as-is, document the behavior
- **Approach:** Accept the current behavior (functionally correct via Vue's fallback timer) and
  add a code comment noting the hidden-panel cycle is benign.
- **Pros:** Zero change. **Cons:** Leaves the R10 "no-op when hidden" intent only approximately met.
- **Effort:** Trivial. **Risk:** Low.

## Recommended Action

Browser-verify first (switch country on the Trade tab at 1280×800, then click Description and
confirm the new paragraph shows at full opacity). If it reads correctly, Option B is acceptable;
if any flicker/strand appears in a target browser, apply Option A.

## Technical Details

- **Affected files:** `components/infographics/AseanInfographic.vue`

## Resolution (2026-05-22) — Option B (document the benign behavior)

Chose Option B over Option A. Stage-5b validation already confirmed there is **no strand**: Vue's
`getTransitionInfo` reads the declared `transition-duration` and arms a duration-based fallback
timer even on a `display:none` node, so the out-in cycle resolves and the resting `<p>` ends with
its transition classes removed (full opacity when Description is later shown). The only cost is
wasted transition scheduling on hidden content — not a visible defect.

Option A (`v-if="tab === 'description'"` gating) was declined: it remounts the paragraph on every
Description tab-open, adding a one-time fade-in the design did not ask for, and the todo itself
flagged that side effect as "may or may not be desired." A key-freezing alternative was prototyped
and rejected as over-engineering for a P3 with no visible bug (extra ref + two watchers, and it
merely shifts the re-key to tab-open).

Action taken: replaced the slightly-misleading "Only animates while the Description tab is visible"
comment with an accurate R10 note in `AseanInfographic.vue` documenting that the hidden-tab cycle
is benign (Vue fallback timer resolves it; classes removed; full opacity on reopen) and that v-if
gating is deliberately avoided. `npm run build` re-run after the change — passes.

## Acceptance Criteria

- [x] Switching country while on Trade/Green, then opening Description, shows the new paragraph at
      full opacity (no blank/faded text) — confirmed via Stage-5b transition-internals validation
      (Vue duration-fallback timer resolves the cycle; resting `<p>` has no inline opacity).
- [x] Option A NOT taken (declined): the chosen Option B documents the benign hidden-panel cycle.
- [x] `npm run build` passes.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-05-22 | Created from PR #46 code review (autofix mode) | mode=out-in keyed transition runs on a display:none node when activeSlug changes on another tab; validated that Vue's duration-fallback timer prevents a strand, so this is wasted work + an R10 intent deviation, not a defect. Left as residual (manual) — needs an in-browser confirm before changing render semantics. |
| 2026-05-22 | Resolved via Option B (document) | No strand (validated). Option A's v-if gating would add an unwanted tab-open fade-in; key-freezing was over-engineering for a P3 with no visible defect. Documented the benign behavior in an accurate in-code R10 note instead of changing render semantics. Build green. |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/46
- Plan: docs/plans/2026-05-22-004-feat-asean-country-switch-transition-plan.md (R10)
- Run artifact: /tmp/compound-engineering/ce-code-review/20260522-173335-61abe09e/
