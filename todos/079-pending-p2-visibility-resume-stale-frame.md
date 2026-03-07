---
status: pending
priority: p2
issue_id: "079"
tags: [code-review, quality, canvas, BF-78]
dependencies: []
---

# Stale Frame on Tab Visibility Resume

## Problem Statement

In `useParticleSystem.ts` (lines 468-477), when the tab becomes visible again after being hidden, the animation loop resumes by resetting `lastTimestamp = 0` and scheduling a new `requestAnimationFrame(tick)`. However, the particle positions are not updated before the first visible frame -- the `tick` function skips the first frame (lines 362-365: `if (lastTimestamp === 0) { lastTimestamp = timestamp; ... return }`), meaning the canvas shows the stale positions from when the tab was hidden until the second frame fires.

Additionally, if the user switched straits while the tab was hidden (unlikely but possible via keyboard), the `cancelled` flag check on line 474 (`!cancelled`) may not reflect the current state correctly since `stop()` sets `cancelled = true` but the `straitId` watcher calls `start()` which resets `cancelled = false`.

## Findings

- **Source:** `composables/useParticleSystem.ts`, lines 468-477
- **Evidence:** On resume, first tick is a no-op (timestamp initialization), so particles briefly appear frozen at old positions before animating
- **Impact:** Low -- typically imperceptible (one frame delay at ~16ms), but can cause a visible "jump" if the tab was hidden for a long time since particle progress continues to be where it was

## Proposed Solutions

### Option A: Force a draw on resume before scheduling rAF
- **Approach:** Call `draw()` immediately in the visibility handler before scheduling `requestAnimationFrame(tick)`
- **Pros:** Eliminates the one-frame stale content
- **Cons:** Minimal
- **Effort:** Small
- **Risk:** Low

### Option B: Accept the current behavior
- **Approach:** The one-frame delay is imperceptible in practice
- **Pros:** No code change
- **Cons:** Technically incorrect
- **Effort:** None
- **Risk:** Low

## Recommended Action

Option A

## Technical Details

- **Affected files:** `composables/useParticleSystem.ts`

## Acceptance Criteria

- [ ] On tab resume, first visible frame shows correct particle positions
- [ ] No visual "jump" when returning to a long-hidden tab

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #21 code review | Visibility resume skips first draw frame |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/21
- File: `composables/useParticleSystem.ts`, lines 468-477
