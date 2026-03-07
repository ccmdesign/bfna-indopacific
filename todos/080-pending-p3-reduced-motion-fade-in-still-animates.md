---
status: pending
priority: p3
issue_id: "080"
tags: [code-review, accessibility, BF-78]
dependencies: []
---

# Particle Canvas Fade-In Still Animates Under Reduced Motion

## Problem Statement

In `StraitParticleCanvas.vue`, the CSS correctly sets `transition: none` under `@media (prefers-reduced-motion: reduce)` (lines 68-72). However, the component's `onMounted` hook (lines 35-39) still toggles the `visible` class via `requestAnimationFrame`, which means the canvas jumps from `opacity: 0` to `opacity: 1` in a single frame -- effectively an instant pop-in rather than a graceful transition.

While not technically an animation, the opacity starts at 0 and snaps to 1, which means the canvas is invisible for one frame. A more accessible approach would be to skip the opacity toggle entirely when reduced motion is preferred.

## Findings

- **Source:** `components/straits/StraitParticleCanvas.vue`, lines 35-39 and 68-72
- **Evidence:** `visible` is toggled regardless of motion preference; CSS handles the rest
- **Impact:** Minor -- the `transition: none` correctly prevents animation, but the canvas still starts invisible and pops in

## Proposed Solutions

### Option A: Set `visible = true` immediately when reduced motion is preferred
- **Approach:** Check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` in `onMounted` and set `visible.value = true` synchronously
- **Pros:** No flash of invisible content for reduced-motion users
- **Cons:** Slight added complexity
- **Effort:** Small
- **Risk:** Low

### Option B: Accept current behavior
- **Approach:** The pop-in is imperceptible at one frame
- **Pros:** No change
- **Cons:** Not ideal for accessibility purists
- **Effort:** None
- **Risk:** Low

## Recommended Action

Option A

## Technical Details

- **Affected files:** `components/straits/StraitParticleCanvas.vue`

## Acceptance Criteria

- [ ] Under `prefers-reduced-motion: reduce`, canvas appears immediately without opacity toggle
- [ ] Normal motion users still get the 0.4s fade-in with 0.3s delay

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #21 code review | Opacity toggle still fires under reduced motion |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/21
