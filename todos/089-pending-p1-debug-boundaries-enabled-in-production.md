---
status: pending
priority: p1
issue_id: "089"
tags: [code-review, quality, production-readiness, BF-89]
dependencies: []
---

# DEBUG_BOUNDARIES Left Enabled in Production Code

## Problem Statement

`composables/useParticleSystem.ts` has `const DEBUG_BOUNDARIES = true` (line ~37 in the new code). This causes the particle system to render a full debug overlay on every frame: a blue grid of 270x270 cells, yellow boundary polygons, red island outlines, green/magenta edge lines, and centroid dots. This is visible to end users and adds significant per-frame rendering cost (iterating 72,900 grid cells every frame).

This **blocks merge** because it ships a debug visualization to production users.

## Findings

- **Agent:** quality-reviewer, performance-oracle
- **Evidence:** `composables/useParticleSystem.ts` — `const DEBUG_BOUNDARIES = true` and the ~50-line debug rendering block in `draw()`
- **Location:** `composables/useParticleSystem.ts` line ~37

## Proposed Solutions

### Option 1: Set DEBUG_BOUNDARIES to false
Change `const DEBUG_BOUNDARIES = true` to `const DEBUG_BOUNDARIES = false`.

- **Pros:** One-character fix, keeps debug code available for future development
- **Cons:** Debug code still ships in the bundle (dead code, but present)
- **Effort:** Small
- **Risk:** Low

### Option 2: Gate behind environment variable
Use `const DEBUG_BOUNDARIES = import.meta.dev` or a build-time flag.

- **Pros:** Automatically off in production, on in dev
- **Cons:** Slightly more complex
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option 1 is the minimum fix. Option 2 is preferable.

## Technical Details

- **Affected files:** `composables/useParticleSystem.ts`
- **Components:** StraitParticleCanvas, StraitCircle

## Acceptance Criteria

- [ ] `DEBUG_BOUNDARIES` is `false` (or gated behind dev-only flag) in the merged code
- [ ] No debug overlays visible in production build

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
