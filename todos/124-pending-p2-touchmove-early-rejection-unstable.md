---
status: pending
priority: p2
issue_id: "124"
tags: [code-review, quality, mobile-ux]
dependencies: []
---

# Touchmove Early Rejection Unstable on First Pixel

## Problem Statement

In `useSwipeNavigation.ts`, the `onTouchMove` handler evaluates the vertical-to-horizontal ratio on every `touchmove` event, including the very first one. When the touch has moved only 1-2 pixels (common noise on mobile touchscreens), the ratio is unreliable. A single noisy pixel of vertical movement (dx=1, dy=1, ratio=1.0) immediately and permanently rejects the gesture, even though the user's intent is clearly horizontal.

This makes swipe gestures feel unreliable on low-end Android devices with noisy touch digitizers.

## Findings

- **File:** `composables/useSwipeNavigation.ts`, lines 92-101
- The check `if (dx > 0 && dy / dx > maxVerticalRatio)` fires on every `touchmove`
- With `maxVerticalRatio = 0.5`, a 1px horizontal + 1px vertical movement gives ratio 1.0, immediately rejecting
- Once `rejected = true`, the gesture is permanently discarded -- no recovery
- Industry best practice is to require a minimum "dead zone" movement (e.g., 10px) before evaluating gesture direction

## Proposed Solutions

### Option A: Add minimum movement threshold before evaluation
Add a `const deadZone = 10` and skip the ratio check until `Math.max(dx, dy) > deadZone`.

- **Pros:** Simple, proven pattern used by Hammer.js and other gesture libraries
- **Effort:** Small
- **Risk:** Low

### Option B: Use first N touchmove events to accumulate direction signal
Average the ratio over the first 3-5 touchmove events before deciding.

- **Pros:** More robust against noise
- **Effort:** Medium
- **Risk:** Low, but adds complexity

## Recommended Action

Option A is simpler and well-understood.

## Technical Details

- **Affected files:** `composables/useSwipeNavigation.ts`

## Acceptance Criteria

- [ ] Swipe gestures are not rejected by 1-2px noise on first touchmove
- [ ] Truly vertical scrolling gestures are still correctly rejected
- [ ] A dead-zone threshold (e.g., 10px) is applied before direction evaluation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Code review finding | PR #31 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/31
- Hammer.js recognizer threshold pattern
