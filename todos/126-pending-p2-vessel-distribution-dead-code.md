---
status: pending
priority: p2
issue_id: "BF-104"
tags: [code-review, quality, dead-code]
dependencies: []
---

# vesselDistribution assigned but never read — type assignment uses fragile color parsing

## Problem Statement

In `useParticleFlow.ts`, the production vessel type assignment system has a disconnect:
1. `assignVesselColors()` stores a distribution array into `vesselDistribution` (line 559), but nothing ever reads it.
2. Instead, `typeFromColor()` (lines 507-511) reverse-engineers the particle type from the HSL color string using substring matching (`color.includes('218')`).

This means the careful largest-remainder distribution computed by `distributeByType()` is never actually used to assign particle types. Particles get random colors from the engine's `COLORS` array, then those colors are parsed back to types — losing the proportional distribution.

## Findings

- `useParticleFlow.ts:554-562` — `assignVesselColors()` sets `vesselDistribution` but it's never read.
- `useParticleFlow.ts:507-511` — `typeFromColor()` uses string matching on HSL color values.
- `utils/particleEngine.ts:421` — Engine's `COLORS` array uses the same hues, so the mapping works by coincidence.
- The engine randomly picks from 3 colors (line 528), giving ~33% each — not the vessel-proportional distribution.
- The `distributeByType()` function (line 74-102) carefully computes proportional counts, but the result is discarded.

## Proposed Solutions

### Option 1: Use vessel distribution to assign colors at spawn

**Approach:** Override the engine's color assignment by pre-computing a color array based on `vesselDistribution` and using it in the particle type map when particles are created.

**Pros:**
- Vessel type proportions actually match data
- Removes dead code

**Cons:**
- Requires hooking into particle spawn or post-spawn assignment

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Remove dead code, document that types are approximate

**Approach:** Remove `vesselDistribution`, `assignVesselColors()`, and `distributeByType()`. Document that vessel types are uniformly random.

**Pros:**
- Simplest fix — removes confusion
- Honest about behavior

**Cons:**
- Loses the proportional visualization intent

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `composables/useParticleFlow.ts:74-102` — `distributeByType()` (dead code path)
- `composables/useParticleFlow.ts:554-562` — `assignVesselColors()` and `vesselDistribution`
- `composables/useParticleFlow.ts:507-511` — `typeFromColor()` fragile parsing
- `utils/particleEngine.ts:421,528` — engine COLORS array and random assignment

## Resources

- **PR:** #32

## Acceptance Criteria

- [ ] Either vessel distribution is properly applied, or dead code is removed
- [ ] No variables are assigned but never read
- [ ] If proportional distribution is kept, particle type ratios visually match vessel data

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Traced vessel type assignment flow from data through to rendering
- Identified disconnect between distribution computation and actual assignment
- Confirmed typeFromColor works by coincidence of matching HSL hues
