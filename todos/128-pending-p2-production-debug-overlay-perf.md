---
status: pending
priority: p2
issue_id: "BF-104"
tags: [code-review, performance]
dependencies: []
---

# Production debug overlay iterates 72,900 grid cells every frame in dev mode

## Problem Statement

In `useParticleFlow.ts:398-405`, the production-mode draw function (`drawProduction`) includes a debug overlay that iterates all 270x270 = 72,900 grid cells on every animation frame when `import.meta.dev` is true. Each water cell triggers a `fillRect` call, which can add hundreds of draw calls per frame and significantly impact frame rate during development.

## Findings

- `composables/useParticleFlow.ts:398-436` — dev-only debug overlay in `drawProduction()`.
- The overlay draws individual 4x4 pixel rects for each water cell, plus boundary/island/edge polylines.
- This runs on every `requestAnimationFrame` tick, not just on demand.
- The test-mode `drawTest()` has a similar overlay but is gated by `params.showDebug` (toggleable via Tweakpane).
- Production mode debug overlay has no toggle — it always renders in dev.

## Proposed Solutions

### Option 1: Gate behind a debug toggle

**Approach:** Add the same `params.showDebug` guard used in test mode, or use a separate dev-only ref.

**Pros:**
- Dev can toggle overlay on/off
- Consistent with test mode pattern

**Cons:**
- Minor code change

**Effort:** 15 minutes

**Risk:** None

---

### Option 2: Render debug overlay to an offscreen canvas once

**Approach:** Render the grid overlay once to a cached canvas, then composite it each frame with a single `drawImage` call.

**Pros:**
- Constant-time per frame regardless of grid size
- Still updates when polygon changes

**Cons:**
- Slightly more complex

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `composables/useParticleFlow.ts:398-436` — debug overlay in `drawProduction()`

## Resources

- **PR:** #32

## Acceptance Criteria

- [ ] Debug overlay in production mode is toggleable or cached
- [ ] Dev mode frame rate is smooth (>30fps) with overlay visible

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified per-frame grid iteration in production debug overlay
- Compared with test mode's toggleable pattern
