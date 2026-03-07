---
status: resolved
priority: p3
issue_id: "077"
tags: [code-review, quality, BF-78]
dependencies: []
---

# Unused `isStatic` Parameter in `draw()` Function

## Problem Statement

The `draw()` function in `useParticleSystem.ts` accepts an `isStatic` parameter (line 267: `function draw(isStatic: boolean = false)`) but never reads it. The `drawStaticParticles()` function calls `draw(true)` (line 394), but the parameter has no effect on the rendering logic.

This is dead code that suggests an incomplete implementation or a leftover from development.

## Findings

- **Source:** `composables/useParticleSystem.ts`, line 267 and line 394
- **Evidence:** `isStatic` is declared but never referenced in the function body
- **Impact:** Minor -- confusing for maintainers, suggests the static path was meant to render differently

## Proposed Solutions

### Option A: Remove the parameter
- **Approach:** Remove `isStatic` from `draw()` signature and the `true` argument from `drawStaticParticles()`
- **Pros:** Clean, honest API
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

### Option B: Implement static-specific rendering
- **Approach:** If static mode should look different (e.g., no glow, higher opacity), implement that logic using the parameter
- **Pros:** Could improve reduced-motion UX
- **Cons:** Scope creep
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A (remove dead parameter)

## Technical Details

- **Affected files:** `composables/useParticleSystem.ts`

## Acceptance Criteria

- [ ] No unused parameters in `draw()` function
- [ ] TypeScript compiles cleanly with `noUnusedParameters`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #21 code review | Dead parameter found |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/21
