---
status: pending
priority: p2
issue_id: "097"
tags: [code-review, architecture, types]
dependencies: []
---

# Duplicate Type Alias: VesselType vs ParticleType

## Problem Statement

`VesselType` (line 121 in `types/strait.ts`) is identical to `ParticleType` (line 55): both are `'container' | 'dryBulk' | 'tanker'`. Two independent type aliases for the same concept create drift risk -- if one gains a new variant (e.g., `'lng'`), the other must be updated manually.

**Why it matters:** Silent type divergence between the ship simulation and particle system could cause runtime bugs when both systems consume the same traffic data.

## Findings

- **Source:** `types/strait.ts` lines 55 and 121
- **Evidence:** `export type ParticleType = 'container' | 'dryBulk' | 'tanker'` and `export type VesselType = 'container' | 'dryBulk' | 'tanker'` are identical string unions.
- **Context:** `ParticleType` is consumed by `useParticleSystem.ts`; `VesselType` is consumed by `useShipSimulation.ts`. Both model the same domain concept (cargo vessel classification).

## Proposed Solutions

### Option A: Unify into a single `VesselType` alias
- Rename `ParticleType` to `VesselType` everywhere (composables, types, imports)
- **Pros:** Single source of truth; domain-correct naming
- **Cons:** Touches `useParticleSystem.ts` imports (minor churn)
- **Effort:** Small
- **Risk:** Low (find-and-replace)

### Option B: Derive `VesselType` from `ParticleType`
- `export type VesselType = ParticleType`
- **Pros:** Zero churn in particle system code
- **Cons:** Keeps the less-descriptive name as primary
- **Effort:** Trivial
- **Risk:** None

## Recommended Action

_Pending triage._

## Technical Details

- **Affected files:** `types/strait.ts`, `composables/useShipSimulation.ts`, `composables/useParticleSystem.ts`
- **Components:** Type system

## Acceptance Criteria

- [ ] Only one canonical type alias exists for vessel/cargo classification
- [ ] Both composables import from the same definition
- [ ] No duplicate string union definitions in `types/strait.ts`

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-07 | Created | PR #24 code review finding |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/24
- File: `types/strait.ts` lines 55, 121
