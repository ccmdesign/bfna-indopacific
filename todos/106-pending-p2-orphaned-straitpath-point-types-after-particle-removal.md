---
status: pending
priority: p2
issue_id: "BF-101"
tags: [code-review, quality, dead-code]
dependencies: []
---

# Orphaned StraitPath and Point types after particle system removal

## Problem Statement

The `Point` and `StraitPath` interfaces in `types/strait.ts` (lines 68-78) were used exclusively by the deleted `data/straits/strait-paths.ts` and the old particle system. With both removed in this PR, these types are now dead code. Leaving orphaned types in the shared type file creates confusion about what's actively used.

## Findings

- `types/strait.ts:68-78` — `Point` and `StraitPath` interfaces remain after deletion of their only consumers
- `data/straits/strait-paths.ts` — deleted in this PR (was the only file importing these types)
- `composables/useParticleSystem.ts` — deleted in this PR (used StraitPath via strait-paths.ts)
- No other files in the codebase reference `StraitPath` or the `Point` interface (the corridor system uses `Point2D` instead)

## Proposed Solutions

### Option 1: Remove orphaned types

**Approach:** Delete the `Point` and `StraitPath` interfaces from `types/strait.ts`.

**Pros:**
- Clean type file with only active types
- No confusion about which types are used

**Cons:**
- None

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

*To be filled during triage.*

## Technical Details

**Affected files:**
- `types/strait.ts:68-78` — orphaned `Point` and `StraitPath` interfaces

## Resources

- **PR:** #25
- **Related:** todo 078 (unused altPoints type, same area)

## Acceptance Criteria

- [ ] `Point` and `StraitPath` types removed from `types/strait.ts`
- [ ] No TypeScript compilation errors after removal
- [ ] No remaining references to these types in codebase

## Work Log

### 2026-03-08 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified orphaned types left behind by particle system removal
- Verified no other consumers exist in the codebase
