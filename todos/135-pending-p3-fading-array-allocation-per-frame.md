---
status: resolved
priority: p3
issue_id: "BF-110"
tags: [code-review, performance]
dependencies: []
---

# Fading particle array allocated every frame in production renderer

## Problem Statement

In `composables/useParticleFlow.ts:410`, `const fading: Particle[] = []` creates a new array every animation frame. At 60fps this is 60 short-lived allocations per second that become GC pressure. The plan document itself acknowledges this and recommends starting simple, but it should be tracked.

## Findings

- `useParticleFlow.ts:410` — `const fading: Particle[] = []` inside `drawProduction()`
- `useParticleFlow.ts:411` — `grouped` record also allocates three arrays per frame (pre-existing)
- Plan doc recommends module-scoped reusable buffer if profiling shows GC spikes

## Proposed Solutions

### Option 1: Module-scoped reusable buffer

**Approach:** Declare `let fadingBuf: Particle[] = []` at module scope, reset with `fadingBuf.length = 0` each frame.

**Pros:**
- Zero allocation per frame for the fading array
- Trivial change

**Cons:**
- Module-scoped mutable state (already the pattern for `grouped`)

**Effort:** Small
**Risk:** Low

## Technical Details

**Affected files:** `composables/useParticleFlow.ts`

## Acceptance Criteria

- [ ] No new array allocations in the hot draw path

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-11 | Created | Code review of PR #34 (BF-110) |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/34
