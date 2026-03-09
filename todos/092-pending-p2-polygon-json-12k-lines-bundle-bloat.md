---
status: pending
priority: p2
issue_id: "092"
tags: [code-review, performance, bundle-size, BF-89]
dependencies: []
---

# 12,644-Line Polygon JSON Adds Significant Bundle Weight

## Problem Statement

`data/straits/hormuz-polygon.json` is 12,644 lines of coordinate data. It is loaded via dynamic `import()` in `useParticleSystem.ts`, which is good. However, the JSON contains extremely high point density (thousands of points for the boundary polygon alone). This is far more resolution than needed for a particle containment grid that rasterizes to 4px cells (270x270 grid).

The polygon data could be simplified to ~10% of its current size with no visual difference at the grid resolution used.

## Findings

- **Agent:** performance-oracle
- **Evidence:** `data/straits/hormuz-polygon.json` — 12,644 lines; `useParticleSystem.ts` uses `GRID_CELL = 4` (270x270 raster)
- **Impact:** ~200KB+ of JSON data per strait, loaded at runtime

## Proposed Solutions

### Option 1: Simplify polygon with Douglas-Peucker
Run the polygon through a simplification algorithm (e.g., Ramer-Douglas-Peucker with tolerance ~2px) as a build step. Target: reduce to <500 points.

- **Pros:** Dramatic size reduction, no visual impact at grid resolution
- **Cons:** Requires build script update
- **Effort:** Small
- **Risk:** Low

### Option 2: Binary format
Store polygon data as a compact binary format (e.g., Float32Array) instead of verbose JSON.

- **Pros:** Even smaller
- **Cons:** Harder to debug/edit
- **Effort:** Medium
- **Risk:** Medium

## Technical Details

- **Affected files:** `data/straits/hormuz-polygon.json`, `scripts/parse-strait-svg.mjs`

## Acceptance Criteria

- [ ] Polygon data is under 2,000 lines / 50KB per strait
- [ ] Particle containment behavior unchanged

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
