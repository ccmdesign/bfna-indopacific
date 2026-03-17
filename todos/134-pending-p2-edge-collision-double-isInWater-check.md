---
status: wont_fix
priority: p2
issue_id: "BF-110"
tags: [code-review, performance]
dependencies: []
---

# Edge collision performs redundant isInWater check after candidate-position fallback

## Problem Statement

In `utils/particleEngine.ts`, the open-water candidate-position block (lines 700-724) already tests `isInWater()` for each candidate and falls back to the spine centerline if all fail. Immediately after, the new edge collision check (line 730) calls `isInWater(p.x, p.y, grid)` again. In the common case where a candidate succeeded, this is a redundant grid lookup every frame for every non-strait particle. While `isInWater` is cheap (array index lookup), it runs for all ~200 open-water particles per frame at 60fps.

## Findings

- `particleEngine.ts:710` — candidate loop already checks `isInWater(nx, ny, grid)` and assigns position only if in water
- `particleEngine.ts:718-723` — last-resort fallback places particle on spine centerline (which should be in water)
- `particleEngine.ts:730` — new edge collision check calls `isInWater(p.x, p.y, grid)` unconditionally after the above
- In strait-mode branch (line 618-635), the position is set by `spineAt()` and the `!inStrait` guard correctly skips the check
- In the `nearStrait || distToExit < 60` branch (line 696-698), position is set without water checking — this is the actual case where the edge collision check adds value

## Proposed Solutions

### Option 1: Guard edge collision with a flag from the candidate block

**Approach:** Set a `checkedWater = true` flag when the candidate block succeeds, skip the edge collision check when the flag is true.

**Pros:**
- Eliminates ~200 redundant grid lookups per frame
- Makes the code's intent explicit

**Cons:**
- Slightly more complex flow

**Effort:** Small
**Risk:** Low

### Option 2: Accept the redundancy

**Approach:** Leave as-is. `isInWater` is O(1) and the cost is negligible.

**Pros:**
- Simpler code, acts as a safety net

**Cons:**
- Minor inefficiency

**Effort:** None
**Risk:** None

## Recommended Action

Option 2 is acceptable for now. Flag for future optimization if profiling shows grid-lookup overhead.

## Technical Details

**Affected files:** `utils/particleEngine.ts`

## Acceptance Criteria

- [ ] Decide whether redundant check is acceptable or should be optimized

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-11 | Created | Code review of PR #34 (BF-110) |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/34
