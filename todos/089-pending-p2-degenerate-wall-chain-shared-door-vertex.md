---
status: pending
priority: p2
issue_id: "089"
tags: [code-review, architecture, geometry]
dependencies: []
---

# Degenerate Wall Chain From Shared Door Vertex

## Problem Statement

The Hormuz corridor data has doors A=[25,26] and B=[26,27] that share vertex 26. This means one wall chain walks from vertex 26 to vertex 26 (a single point), producing a degenerate wall of 30+ identical points after resampling. The resulting "centerline" hugs one wall rather than bisecting the corridor, which will produce incorrect geometry for rendering.

**Why it matters:** Any downstream feature that relies on the centerline being centered (particle flow, corridor shading, width display) will render incorrectly for Hormuz.

## Findings

- **Source:** `composables/useCorridor.ts` line 47-49, `data/straits/corridors.json` doors `a: [25,26], b: [26,27]`
- **Evidence:** `extractWallChains` walks from `doors.b[1]` (27) to `doors.a[0]` (25) for wallLeft (correct, 39 vertices), and from `doors.a[1]` (26) to `doors.b[0]` (26) for wallRight (degenerate, 1 vertex).
- **Test confirms:** `corridor-geometry.test.ts` line 78-83 labels this "degenerate wall (shared vertex)" and accepts it, but doesn't validate the centerline is geometrically centered.

## Proposed Solutions

### Option A: Fix door indices in corridors.json
- Adjust the SVG parse script or manual data so doors don't share a vertex (e.g., A=[24,25], B=[26,27])
- **Pros:** Simple data fix, no code change needed
- **Cons:** Requires re-examining the SVG polygon to find correct door edges
- **Effort:** Small
- **Risk:** Low

### Option B: Handle shared-vertex doors in deriveGeometry
- Detect when a wall chain is a single point and fall back to interpolating from the opposite wall with a fixed offset or using the polygon's bounding geometry
- **Pros:** Robust against future shared-vertex corridors
- **Cons:** More complex, harder to validate correctness
- **Effort:** Medium
- **Risk:** Medium

### Option C: Split the shared vertex in the polygon
- Duplicate vertex 26 in the polygon so doors can reference distinct vertices
- **Pros:** Clean separation, no algorithm change
- **Cons:** Changes polygon vertex count and all downstream index references
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_(To be filled during triage)_

## Technical Details

- **Affected files:** `composables/useCorridor.ts`, `data/straits/corridors.json`, `scripts/parse-corridor-svg.ts`
- **Components:** useCorridor composable, corridor geometry derivation

## Acceptance Criteria

- [ ] Both wall chains contain more than 1 unique vertex for Hormuz corridor
- [ ] Centerline visually bisects the corridor (not hugging one wall)
- [ ] All 23 existing tests still pass
- [ ] New test validates centerline is approximately equidistant from both walls

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #23 code review | Shared door vertex produces degenerate geometry |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/23
