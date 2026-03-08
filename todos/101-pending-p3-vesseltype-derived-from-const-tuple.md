---
status: pending
priority: p3
issue_id: "101"
tags: [code-review, types, quality]
dependencies: ["097"]
---

# VesselType Not Derived from VESSEL_TYPES Const Tuple

## Problem Statement

`VESSEL_TYPES` is exported as `['container', 'dryBulk', 'tanker'] as const` (line 43 in composable) but `VesselType` in `types/strait.ts` is a standalone string union. These two definitions can diverge silently.

**Why it matters:** Adding a vessel type to one source but not the other would cause a type mismatch at runtime without a compile-time error.

## Findings

- **Source:** `composables/useShipSimulation.ts` line 43, `types/strait.ts` line 121
- **Evidence:** `VESSEL_TYPES` const array and `VesselType` union are independently defined.

## Proposed Solutions

### Option A: Derive VesselType from VESSEL_TYPES
- Move `VESSEL_TYPES` to `types/strait.ts`, define `type VesselType = typeof VESSEL_TYPES[number]`
- **Pros:** Single source of truth for both runtime and type
- **Cons:** Minor refactor
- **Effort:** Small
- **Risk:** None

## Recommended Action

_Pending triage._

## Technical Details

- **Affected files:** `types/strait.ts`, `composables/useShipSimulation.ts`

## Acceptance Criteria

- [ ] `VesselType` is derived from `VESSEL_TYPES` (or vice versa)
- [ ] No independent string union definitions

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-07 | Created | PR #24 code review finding |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/24
