---
status: resolved
priority: p3
issue_id: "087"
tags: [code-review, quality, typescript, BF-96]
dependencies: []
---

# Inline Historical Type Should Use Existing StraitHistoricalEntry

## Problem Statement

`StraitMap.vue` line 21 has a very long inline type annotation for the `historical` variable:

```ts
const historical = straitsData.historical as Record<string, Record<string, { capacityMt: number; vessels: { total: number; container: number; dryBulk: number; tanker: number }; capacityByType: { container: number; dryBulk: number; tanker: number } }>>
```

The `StraitHistoricalEntry` type already exists in `types/strait.ts` and matches this shape exactly. The inline annotation is a maintenance hazard -- if the type changes in one place, the other drifts.

## Findings

- **Agent:** quality-reviewer
- **Evidence:** `components/StraitMap.vue` line 21 vs `types/strait.ts` lines 55-59

## Proposed Solutions

### Option 1: Import and use existing type (Recommended)
```ts
import type { StraitHistoricalEntry } from '~/types/strait'
const historical = straitsData.historical as Record<string, Record<string, StraitHistoricalEntry>>
```

- **Pros:** DRY, type-safe, shorter line
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `components/StraitMap.vue`

## Acceptance Criteria

- [ ] Inline type replaced with imported `StraitHistoricalEntry`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Identified during PR #22 code review | Reuse existing type definitions |
| 2026-03-07 | Resolved: imported StraitHistoricalEntry and replaced inline type annotation | DRY, type-safe |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/22
