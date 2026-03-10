---
status: pending
priority: p3
issue_id: "126"
tags: [code-review, quality, dead-code]
dependencies: []
---

# startTime Variable Assigned But Never Read

## Problem Statement

In `useSwipeNavigation.ts`, the `startTime` variable (line 67) is assigned `Date.now()` in `onTouchStart` (line 88) but is never read anywhere. It was planned for a velocity threshold feature that was not implemented.

## Findings

- **File:** `composables/useSwipeNavigation.ts`, lines 67, 88
- `let startTime = 0` declared on line 67
- `startTime = Date.now()` assigned on line 88
- Never read in `onTouchEnd` or anywhere else
- The plan mentions `velocityThreshold` as an optional parameter but it was not implemented

## Proposed Solutions

### Option A: Remove dead code
Delete `startTime` declaration and assignment.

- **Pros:** Cleaner code
- **Effort:** Small
- **Risk:** None

### Option B: Implement velocity-based swipe detection
Use `startTime` to calculate swipe velocity and allow short-distance fast flicks.

- **Pros:** Better UX for fast flick gestures
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `composables/useSwipeNavigation.ts`

## Acceptance Criteria

- [ ] No unused variables in the composable

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Code review finding | PR #31 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/31
