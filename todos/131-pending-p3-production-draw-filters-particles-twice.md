---
status: resolved
priority: p3
issue_id: "BF-104"
tags: [code-review, performance]
dependencies: []
---

# Production draw loops filter particles array twice per frame

## Problem Statement

In `drawProduction()` (`useParticleFlow.ts:439-467`), the rendering loop calls `sim.particles.filter()` once for the main dot pass and again for the glow pass — 6 filter calls total (3 types x 2 passes). Each filter creates a new array and iterates all particles. With 240 particles and 60fps, that's 360 array allocations and ~86,400 iterations per second.

## Findings

- `useParticleFlow.ts:440` — `sim.particles.filter(p => particleTypeMap.get(p) === type)` in dot pass
- `useParticleFlow.ts:455` — Same filter repeated in glow pass
- Could be resolved by grouping particles by type once, then drawing both passes from the grouped data

## Proposed Solutions

### Option 1: Pre-group particles by type once per frame

**Approach:** Before the draw passes, group particles into per-type arrays once. Use the grouped arrays for both dot and glow passes.

**Pros:**
- Halves the number of filter operations
- Cleaner separation of grouping vs. rendering

**Cons:**
- Minor refactor

**Effort:** 30 minutes

**Risk:** None

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `composables/useParticleFlow.ts:438-467` — `drawProduction()` render loops

## Resources

- **PR:** #32

## Acceptance Criteria

- [ ] Particles are grouped once per frame, not filtered repeatedly
- [ ] Visual output unchanged

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified repeated filter calls in hot render path
