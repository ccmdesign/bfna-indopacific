---
status: resolved
priority: p2
issue_id: "100"
tags: [code-review, performance]
dependencies: []
---

# pool.find() is O(n) Linear Scan on Every Spawn

## Problem Statement

`spawnShip()` uses `pool.find(s => !s.active)` (line 247) to locate a free slot. When the pool is nearly full (e.g., 148 of 150 active), this scans up to 150 entries. With `MAX_SPAWNS_PER_FRAME = 2`, this runs up to twice per frame.

**Why it matters:** While the absolute cost is small (~150 comparisons * 2 = 300), a free-list pattern would make this O(1) and is the standard approach for object pools in game/simulation loops.

## Findings

- **Source:** `composables/useShipSimulation.ts` line 247
- **Evidence:** `const slot = pool.find(s => !s.active)` scans entire pool.
- **Context:** Pool size is 150 (POOL_MULTIPLIER * 100). Spawning happens every frame when active count < target.

## Proposed Solutions

### Option A: Maintain a free-list stack
- Keep an array `freeIndices: number[]`. On despawn, push index. On spawn, pop from stack.
- **Pros:** O(1) spawn; standard object pool pattern
- **Cons:** Slightly more complex bookkeeping
- **Effort:** Small
- **Risk:** Low

### Option B: Accept current approach
- 300 comparisons/frame is negligible vs. the 3000+ in resolvePosition.
- **Pros:** Simpler code
- **Cons:** Not idiomatic for object pools
- **Effort:** None
- **Risk:** None

## Recommended Action

_Pending triage._

## Technical Details

- **Affected files:** `composables/useShipSimulation.ts`

## Acceptance Criteria

- [ ] Either implement free-list or document the performance trade-off as acceptable

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-07 | Created | PR #24 code review finding |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/24
- File: `composables/useShipSimulation.ts` line 247
