---
status: pending
priority: p3
issue_id: "BF-101"
tags: [code-review, quality, documentation]
dependencies: []
---

# Stale comment references deleted particle system

## Problem Statement

The JSDoc comment on line 58 of `types/strait.ts` still references "particle system" which was removed in this PR: `"Vessel classification used by both the ship simulation and particle system."` This is misleading since only the ship simulation remains.

## Findings

- `types/strait.ts:58` — Comment says "ship simulation and particle system" but particle system was deleted
- The particle system (`useParticleSystem.ts`, `StraitParticleCanvas.vue`) was fully removed in this PR

## Proposed Solutions

### Option 1: Update comment

**Approach:** Change to `"Vessel classification used by the ship simulation."` or similar.

**Pros:**
- Accurate documentation
- Trivial fix

**Cons:**
- None

**Effort:** 2 minutes

**Risk:** Low

## Recommended Action

*To be filled during triage.*

## Technical Details

**Affected files:**
- `types/strait.ts:58` — stale JSDoc comment

## Resources

- **PR:** #25

## Acceptance Criteria

- [ ] Comment no longer references particle system

## Work Log

### 2026-03-08 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified stale documentation reference to deleted particle system
