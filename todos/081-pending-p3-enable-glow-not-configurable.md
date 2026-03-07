---
status: resolved
priority: p3
issue_id: "081"
tags: [code-review, quality, BF-78]
dependencies: []
---

# ENABLE_GLOW Constant Not Configurable at Runtime

## Problem Statement

`ENABLE_GLOW` is a module-level `const` set to `true` (line 31 of `useParticleSystem.ts`). It cannot be toggled at runtime or passed as an option. Since the glow pass doubles the drawing work (and is the subject of finding 074 regarding double Bezier evaluation), having no way to disable it for performance debugging or on lower-end devices is a missed opportunity.

## Findings

- **Source:** `composables/useParticleSystem.ts`, line 31
- **Evidence:** `const ENABLE_GLOW = true` -- hardcoded, not exposed as a composable option
- **Impact:** Minor -- the glow effect cannot be disabled without code changes

## Proposed Solutions

### Option A: Add as composable option with default
- **Approach:** Add `enableGlow?: boolean` to the options object, default to `true`
- **Pros:** Runtime configurable, useful for performance tuning
- **Cons:** Marginal API surface increase
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A

## Technical Details

- **Affected files:** `composables/useParticleSystem.ts`

## Acceptance Criteria

- [ ] Glow can be toggled via composable option
- [ ] Default behavior unchanged (glow enabled)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #21 code review | Hardcoded rendering toggle |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/21
