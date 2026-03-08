---
status: pending
priority: p2
issue_id: "099"
tags: [code-review, performance]
dependencies: []
---

# resolvePosition Linear Scan Always Starts at Index 0

## Problem Statement

The JSDoc for `resolvePosition()` says "linear scan from a cached segment index" but the implementation always starts at `i = 0` (line 288). There is no cached `lastSegmentIndex` on the `Ship` interface. This means every ship scans all segments from the beginning every frame, resulting in ~3000 comparisons/frame (100 ships * ~30 segments) instead of ~100 (one comparison per ship if cached).

**Why it matters:** The plan doc explicitly recommends caching the segment index for O(1) amortized lookups (Phase 1, Performance Oracle). The code comment claims caching exists but the implementation does not deliver it.

## Findings

- **Source:** `composables/useShipSimulation.ts` lines 280-297
- **Evidence:** `let i = 0` on line 288 with no reference to any ship-level cached index. The `Ship` interface has no `lastSegmentIndex` field.
- **Plan reference:** Plan doc recommends "linear scan with cached last-index" (Performance Oracle section).

## Proposed Solutions

### Option A: Add `segmentIndex` field to Ship and scan from there
- Add `segmentIndex: number` to the `Ship` interface. In `resolvePosition`, start scanning from `ship.segmentIndex` instead of 0. Update `ship.segmentIndex = i` after resolution.
- **Pros:** O(1) amortized per ship per frame; matches plan
- **Cons:** Adds one field to Ship interface
- **Effort:** Small
- **Risk:** Low

### Option B: Accept the current O(n) scan
- Remove the misleading JSDoc comment. With ~30 segments, the cost is negligible.
- **Pros:** No code change needed
- **Cons:** Leaves a micro-optimization on the table; JSDoc is still wrong
- **Effort:** Trivial
- **Risk:** None

## Recommended Action

_Pending triage._

## Technical Details

- **Affected files:** `composables/useShipSimulation.ts`, `types/strait.ts`
- **Components:** Position resolution, animation loop

## Acceptance Criteria

- [ ] Either implement cached segment index or fix JSDoc to match actual behavior
- [ ] No regression in ship position accuracy

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-07 | Created | PR #24 code review finding |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/24
- File: `composables/useShipSimulation.ts` lines 280-297
