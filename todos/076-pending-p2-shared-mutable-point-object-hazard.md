---
status: resolved
priority: p2
issue_id: "076"
tags: [code-review, architecture, BF-78]
dependencies: []
---

# Shared Mutable `_pt` Object in evalCubicBezier

## Problem Statement

`evalCubicBezier()` in `useParticleSystem.ts` (line 57-68) writes to a module-level mutable singleton `_pt` and returns it. This is an intentional hot-path optimization to avoid allocations, but it creates a latent bug vector: if the return value is ever stored or if `evalCubicBezier` is called from two composable instances simultaneously (e.g., two canvases), the shared state will silently corrupt positions.

Currently safe because only one `useParticleSystem` instance exists at a time, but the pattern is fragile for future refactors.

## Findings

- **Source:** `composables/useParticleSystem.ts`, lines 57-68
- **Evidence:** `const _pt = { x: 0, y: 0 }` at module scope, mutated and returned by `evalCubicBezier`
- **Impact:** No current bug, but a maintenance hazard -- any future code that stores the returned point or calls `evalCubicBezier` from a second instance will silently get wrong values

## Proposed Solutions

### Option A: Move `_pt` into the composable closure
- **Approach:** Declare `_pt` inside `useParticleSystem()` so each instance gets its own scratch object
- **Pros:** Eliminates the shared-state hazard entirely
- **Cons:** Negligible -- one object per composable instance
- **Effort:** Small
- **Risk:** Low

### Option B: Accept and document the constraint
- **Approach:** Add a JSDoc `@internal` / `@nonreentrant` annotation
- **Pros:** Zero code change
- **Cons:** Relies on future developers reading the comment
- **Effort:** Small
- **Risk:** Low (but defers the risk)

## Recommended Action

Option A

## Technical Details

- **Affected files:** `composables/useParticleSystem.ts`

## Acceptance Criteria

- [ ] `_pt` is scoped per composable instance, not module-level
- [ ] No rendering or performance regression

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #21 code review | Module-level mutable state is a reentrancy hazard |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/21
- File: `composables/useParticleSystem.ts`, lines 57-68
