---
status: resolved
priority: p2
issue_id: "074"
tags: [code-review, performance, canvas, BF-78]
dependencies: []
---

# Double Bezier Evaluation Per Frame

## Problem Statement

In `useParticleSystem.ts`, the `draw()` function evaluates `evalCubicBezier()` for every particle twice per frame -- once during the core dot pass (lines 314-315) and again during the glow pass (lines 338-339). Since the glow dot is drawn at the same position as the core dot (just with a larger radius and lower alpha), this doubles the hot-path math (~170 cubic Bezier evaluations per frame instead of ~85).

This is wasteful and will compound if particle budgets increase or if the system is extended to support multiple lanes per strait.

## Findings

- **Source:** `composables/useParticleSystem.ts`, lines 305-352
- **Evidence:** The `draw()` function has two separate `for (const type of PARTICLE_TYPES)` loops, each calling `evalCubicBezier()` and `toCanvasCoords()` independently for every particle
- **Impact:** ~2x unnecessary CPU work on the animation hot path per frame (at 60fps)
- The shared mutable `_pt` object pattern (line 57) was designed to avoid allocation, but the position is not cached between passes

## Proposed Solutions

### Option A: Cache positions in a typed array
- **Approach:** Allocate a `Float64Array(particles.length * 2)` once, fill it in pass 1, read from it in pass 2
- **Pros:** Zero allocations per frame, single Bezier eval per particle
- **Cons:** Slightly more memory, adds complexity
- **Effort:** Small
- **Risk:** Low

### Option B: Single-pass drawing with two arcs per particle
- **Approach:** In one loop, draw both the glow arc (larger radius, lower alpha) and the core arc for each particle, switching `globalAlpha` mid-path
- **Pros:** Simplest change, single Bezier eval
- **Cons:** Cannot batch `beginPath/fill` by type as cleanly (need separate paths for glow vs core or accept per-particle fill calls)
- **Effort:** Small
- **Risk:** Low -- but may lose the batching benefit if not careful

### Option C: Draw glow as a post-process blur filter
- **Approach:** Use `ctx.filter = 'blur(Npx)'` and redraw the same paths
- **Pros:** Eliminates the manual glow pass entirely
- **Cons:** Browser `filter` support varies in performance; Safari can be slow
- **Effort:** Small
- **Risk:** Medium -- performance regression on Safari

## Recommended Action

Option A (cache positions)

## Technical Details

- **Affected files:** `composables/useParticleSystem.ts`
- **Components:** useParticleSystem composable, draw() function

## Acceptance Criteria

- [ ] Each particle's Bezier position is evaluated exactly once per frame
- [ ] Both core and glow passes use the cached position
- [ ] No visible rendering difference
- [ ] No per-frame heap allocations from the cache

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #21 code review | Hot-path doubling found in draw() |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/21
- File: `composables/useParticleSystem.ts`, lines 305-352
