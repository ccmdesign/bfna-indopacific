---
status: pending
priority: p3
issue_id: "102"
tags: [code-review, performance]
dependencies: []
---

# computeTargetCount() Called Every Frame

## Problem Statement

`computeTargetCount()` reads `window.innerWidth` on every animation frame (line 342 in `tick()`). The window width only changes on resize, not every 16ms.

**Why it matters:** Minor unnecessary work every frame. More importantly, it means ship target count could flicker between mobile/desktop thresholds if the user is resizing the window, causing rapid spawn/despawn bursts.

## Findings

- **Source:** `composables/useShipSimulation.ts` lines 180-187, 342
- **Evidence:** `computeTargetCount()` called inside `tick()` without caching.

## Proposed Solutions

### Option A: Cache target count and update on resize
- Compute once on start, update via a `resize` event listener with debounce.
- **Pros:** No per-frame property access; stable target count
- **Cons:** One more event listener to manage
- **Effort:** Small
- **Risk:** None

### Option B: Leave as-is with a comment
- `window.innerWidth` access is very cheap and the resize flicker is unlikely to be noticed.
- **Pros:** No code change
- **Cons:** Not idiomatic
- **Effort:** None
- **Risk:** None

## Recommended Action

_Pending triage._

## Technical Details

- **Affected files:** `composables/useShipSimulation.ts`

## Acceptance Criteria

- [ ] `computeTargetCount()` result is stable within a resize cycle

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-07 | Created | PR #24 code review finding |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/24
