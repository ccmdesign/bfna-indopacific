---
status: deferred
priority: p3
issue_id: "156"
tags: [code-review, accessibility, BF-68]
dependencies: []
---

# Reduced Motion Does Not Pause the ASEAN Map Shine Sweep

> **DEFERRED:** Out of scope for BF-68 (purely the fill→border visual conversion); the SMIL-driven sweep pause is a separate behavior change and warrants its own accessibility ticket.

## Problem Statement

In `components/asean/AseanMap.vue`, the `@media (prefers-reduced-motion: reduce)` block
(lines ~469-473) sets `transition: none` on `.asean-map__border` and `.asean-map__plate`.
For `.asean-map__border` this is a no-op: the class defines no CSS `transition` property,
and the diagonal shine sweep is actually driven by an SVG `<animateTransform>` on
`#reveal-grad` (defs, lines ~222-229) — an SMIL animation that CSS `transition: none`
cannot stop. As a result, a user with "Reduce motion" enabled still sees the 16s shine
sweep loop continuously.

This is **pre-existing** behavior (the base `.asean-map__fill` rule had the identical
vacuous `transition: none`), and was **explicitly deferred** by the BF-68 plan
(`docs/plans/2026-05-22-002-feat-asean-border-shine-stroke-only-plan.md`, "Deferred to
Follow-Up Work", line 134). It is recorded here as the follow-up the plan asked the
reviewer to flag, NOT as a defect introduced by PR #44.

## Findings

- **Source:** `components/asean/AseanMap.vue`, reduced-motion block (lines ~469-473);
  SVG `<animateTransform>` on `#reveal-grad` (lines ~222-229).
- **Evidence:** `.asean-map__border` defines no `transition`, so `transition: none` under
  reduced motion has no target; the sweep is SMIL-driven, not CSS-transition-driven.
- **Impact:** Minor accessibility gap — reduced-motion users still get the looping sweep.
- **Known pattern:** Recurs across this repo's animated visuals — see
  `todos/004-pending-p3-prefers-reduced-motion.md`,
  `todos/038-pending-p3-backdrop-filter-reduced-motion.md`,
  `todos/080-pending-p3-reduced-motion-fade-in-still-animates.md`,
  `todos/132-pending-p3-reduced-motion-spawn-loop.md`.

## Proposed Solutions

### Option A: Pause SVG animations under reduced motion
- **Approach:** Gate `svgEl.pauseAnimations()` on a
  `window.matchMedia('(prefers-reduced-motion: reduce)').matches` check (the component
  already calls `pauseAnimations()` on hover/active, lines ~148-154), and resume on the
  inverse. Add a `matchMedia` change listener so toggling the OS setting takes effect.
- **Pros:** Actually honors the user's motion preference; reuses an existing mechanism.
- **Cons:** Small behavior change beyond pure CSS; needs care with the existing
  hover/active pause/resume bookkeeping so the two pause sources don't fight.
- **Effort:** Small.
- **Risk:** Low-Medium (interaction with existing pause/resume logic).

### Option B: Accept current behavior
- **Approach:** Leave as-is; the sweep is subtle and slow (16s loop).
- **Pros:** No change.
- **Cons:** Does not satisfy reduced-motion intent for motion-sensitive users.
- **Effort:** None.
- **Risk:** Low.

## Recommended Action

Option A — make it its own small accessibility ticket; coordinate the reduced-motion pause
with the existing hover/active `pauseAnimations()`/`unpauseAnimations()` calls so they share
a single resume policy.

## Technical Details

- **Affected files:** `components/asean/AseanMap.vue`

## Acceptance Criteria

- [ ] Under `prefers-reduced-motion: reduce`, the `#reveal-grad` sweep does not animate.
- [ ] Normal-motion users still get the full 16s diagonal sweep.
- [ ] Toggling the OS reduced-motion setting at runtime updates behavior without reload.
- [ ] Reduced-motion pause does not break the existing hover/active pause/resume behavior.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-05-22 | Created from PR #44 code review (autofix mode) | Pre-existing + plan-deferred; SMIL sweep is unaffected by CSS `transition: none`; recurring repo pattern |
| 2026-05-22 | Marked DEFERRED during todo-resolve | Out of scope for BF-68 (fill→border visual conversion only); reduced-motion SMIL pause is a separate behavior change — needs its own ticket |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/44
- Plan: docs/plans/2026-05-22-002-feat-asean-border-shine-stroke-only-plan.md (Deferred to Follow-Up Work)
