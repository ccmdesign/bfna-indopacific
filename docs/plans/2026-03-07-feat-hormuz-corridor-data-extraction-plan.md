---
title: "feat: Hormuz corridor data extraction (SVG to corridors.json)"
type: feat
status: active
date: 2026-03-07
linear: BF-99
---

# Hormuz Corridor Data Extraction (SVG to corridors.json)

## Overview

Parse the hand-authored Illustrator SVG (`assets/images/hormuz-polygon-01.svg`) and extract corridor geometry into a new `data/straits/corridors.json` file. Build a generic composable that derives a centerline flow path and local corridor width from polygon + door data alone, so that when the remaining 5 strait corridors are authored, they work without code changes.

This is the data-extraction prerequisite for the ship simulation described in `_process/particles.md`. No rendering or animation work is in scope.

## Problem Statement

The current particle system (`useParticleSystem.ts`, now deleted from `dev`) used hand-tuned Bezier curves (`strait-paths.ts`) that were brittle and required per-strait calibration. The new approach uses hand-drawn corridor polygons as the single source of truth: the centerline and funneling behavior emerge from the geometry itself. BF-99 extracts and structures the first corridor (Hormuz) and builds the generic algorithm.

## Proposed Solution

### Phase 1: SVG Parsing and JSON Creation

Parse the SVG file and produce `data/straits/corridors.json`.

**Source SVG structure** (from `assets/images/hormuz-polygon-01.svg`, viewBox `0 0 1080 1080`):

| Element | Selector | Meaning |
|---------|----------|---------|
| `<polygon class="st2">` | Yellow fill, red stroke | Navigable area (41 vertices) |
| `<polyline class="st1">` | Green stroke, 8px | Door edges (ship entry/exit) |
| `<polyline class="st0">` | Green stroke, 4px | Coastline reference (ignored at runtime) |

**Polygon points** (from the `points` attribute):
```
364.5,595.2  364.1,560.5  350.2,550.8  328.1,573  335.7,602.8
302,550.8  311.8,529.8  285.5,515.6  267.8,499.7  238.3,436.8
262.2,417.3  295.9,419  304.6,407.4  359.6,497.3  396.3,500.5
435,529.8  478.5,540.7  505,547.2  540,516  559.8,527.4
569.2,566.4  677.5,583  734.2,591.1  891,589  1011,739
1080,767.4  1080.1,1081  26,1083.5  368,968  540,865
687,732  664,679  584,624  540,583  544,541.3
531,538.4  515,557.4  465.1,602.8  442,611.4  380.4,617.7
364.5,595.2
```

**Door polyline** (`class="st1"`): `1080,767.4 -> 1080,1080 -> 42.6,1080`

This polyline shares vertices with the polygon. Matching these endpoints to polygon vertex indices identifies the door edges:
- Vertex 25 = `(1080, 767.4)` — matches first door polyline point
- Vertex 26 = `(1080.1, 1081)` — matches second point (within tolerance of `1080,1080`)
- Vertex 27 = `(26, 1083.5)` — matches third point (within tolerance of `42.6,1080`)

So door edges are:
- **Door A**: edge from vertex 25 to vertex 26 (right side, Persian Gulf approach)
- **Door B**: edge from vertex 26 to vertex 27 (bottom, Gulf of Oman approach)

#### Task 1.1: Write SVG parse script

**File:** `scripts/parse-corridor-svg.ts`

A one-shot Node script (run with `npx tsx`) that:

1. Reads the SVG file with `fs.readFileSync`
2. Extracts the `<polygon>` `points` attribute via regex or a lightweight XML parser (regex is fine for this simple SVG structure)
3. Parses the points string into an `[x, y][]` array
4. Extracts the `<polyline class="st1">` `points` attribute
5. Matches door polyline endpoints to polygon vertex indices using a distance tolerance (e.g., `< 5px`) to handle Illustrator's floating-point imprecision (`1080` vs `1080.1`, `1081` vs `1080`, `42.6` vs `26`)
6. Writes `data/straits/corridors.json`

**Important tolerance note:** The SVG export from Illustrator introduces small coordinate mismatches between the polygon vertices and the door polyline endpoints. The matching algorithm must use Euclidean distance with a tolerance threshold rather than exact equality. A threshold of ~5px is safe given the 1080x1080 coordinate space.

**Output format:**

```json
{
  "hormuz": {
    "viewBox": [0, 0, 1080, 1080],
    "polygon": [
      [364.5, 595.2],
      [364.1, 560.5],
      ...
    ],
    "doors": {
      "a": [25, 26],
      "b": [26, 27]
    }
  }
}
```

#### Task 1.2: Create corridors.json

**File:** `data/straits/corridors.json`

Run the parse script and commit the output. The JSON is the runtime artifact; the script is a dev tool for re-extraction if the SVG is updated.

#### Task 1.3: Add TypeScript types

**File:** `types/strait.ts` (append to existing)

```typescript
/** A strait corridor polygon with classified door edges. */
export interface StraitCorridor {
  /** SVG viewBox dimensions [minX, minY, width, height] */
  viewBox: [number, number, number, number]
  /** Ordered [x, y] vertices of the navigable polygon */
  polygon: [number, number][]
  /** Door edges identified by vertex index pairs */
  doors: {
    a: [number, number]
    b: [number, number]
  }
}

/** Shape of data/straits/corridors.json */
export type CorridorsData = Record<string, StraitCorridor>
```

### Phase 2: Centerline Derivation Composable

#### Task 2.1: Implement `composables/useCorridor.ts`

A pure-computation composable (no DOM, no rendering) that takes a `StraitCorridor` and produces:

1. **Wall chains** — two ordered sequences of vertices forming the left and right walls
2. **Centerline points** — midpoints between corresponding wall edge pairs
3. **Local width** — perpendicular distance between walls at each centerline point

**Algorithm:**

```
Given: polygon vertices V[0..N-1], doors { a: [i,j], b: [k,l] }

1. Identify wall chains:
   - Wall Left:  vertices from door A end (j) to door B start (k), walking forward
   - Wall Right: vertices from door B end (l) to door A start (i), walking forward (wrapping)

2. Resample walls to equal segment count:
   - Walk each wall chain as a polyline
   - Compute total arc length of each wall
   - Sample M evenly-spaced points along each wall (M = max(wallLeft.length, wallRight.length, 20))

3. Compute centerline:
   - For each sample index s in [0..M-1]:
     centerline[s] = midpoint(wallLeft[s], wallRight[s])

4. Compute local width:
   - For each sample index s:
     width[s] = distance(wallLeft[s], wallRight[s])
```

**Key design constraints:**
- The algorithm must work from `polygon` + `doors` alone. No hardcoded vertex indices, no strait-specific logic.
- Wall chain extraction must handle the circular (wrapping) nature of the polygon vertex array.
- Door edges shared between doors (vertex 26 in Hormuz is shared by both Door A and Door B) must be handled correctly: the walk from one door's end to the next door's start defines each wall.

**Return type:**

```typescript
export interface CorridorGeometry {
  /** Resampled left wall points in corridor-local coordinates */
  wallLeft: [number, number][]
  /** Resampled right wall points in corridor-local coordinates */
  wallRight: [number, number][]
  /** Centerline points (midpoints of corresponding wall pairs) */
  centerline: [number, number][]
  /** Local corridor width at each centerline point */
  widths: number[]
}
```

**Composable signature:**

```typescript
export function useCorridor(corridorId: Ref<string | null>): {
  geometry: ComputedRef<CorridorGeometry | null>
  corridor: ComputedRef<StraitCorridor | null>
}
```

The composable reads `corridors.json`, looks up the corridor by ID, and returns the derived geometry as a computed ref. When `corridorId` changes, the geometry recomputes.

#### Task 2.2: Wall chain extraction details

The polygon is a closed ring. Door edges split it into two wall chains. The tricky part is correctly walking the ring in the right direction.

For Hormuz (vertices 0-40, last vertex duplicates first):
- Door A: edge 25->26
- Door B: edge 26->27
- Wall Left: vertices 27, 28, 29, ..., 40(=0), 1, 2, ..., 25 (from door B end to door A start)
- Wall Right: this is just the shared vertex 26 (degenerate case because doors share a vertex)

**Wait -- this is a critical edge case.** In Hormuz, doors A and B share vertex 26, meaning one "wall" is just a single point. This happens because the corridor has an L-shaped opening (two door edges meeting at a corner).

**Resolution:** When doors share a vertex, one wall chain is degenerate (length 1 or 0). The algorithm should:
1. Detect shared-vertex doors
2. For the degenerate wall, synthesize intermediate points by projecting from the opposite wall's points perpendicular to the centerline direction
3. Or more simply: treat the shared vertex as a single-point wall and let the resampling repeat that point M times. The centerline will then be the midpoints between the long wall's samples and the repeated corner point. This produces a fan-shaped centerline radiating from the corner, which actually matches Hormuz's L-shaped geography.

**Recommendation:** Start with the simple approach (repeat the degenerate point). Validate visually. If the fan shape is too distorted, add projection logic as a refinement.

#### Task 2.3: Resampling helper

**File:** `utils/polyline.ts` (new utility)

```typescript
/** Resample a polyline to N evenly-spaced points by arc length. */
export function resamplePolyline(
  points: [number, number][],
  n: number
): [number, number][]
```

This is a general-purpose utility. It:
1. Computes cumulative arc length along the polyline
2. For each of the N output samples, finds the target arc length
3. Linearly interpolates between the two bracketing input points

Edge case: if `points.length === 1`, return the single point repeated N times.

### Phase 3: Validation

#### Task 3.1: Unit tests

**File:** `tests/useCorridor.test.ts`

Test cases:
- Parse Hormuz corridor from `corridors.json` and verify vertex count (40 unique vertices, excluding closing duplicate)
- Verify door indices match expected values (25-26, 26-27)
- Verify wall chains have correct start/end vertices
- Verify centerline has the expected sample count
- Verify all widths are positive
- Verify centerline points lie between the two walls (within bounding box of each wall pair)

**File:** `tests/polyline.test.ts`

Test cases:
- Resample a known polyline (e.g., unit square edge) and verify even spacing
- Single-point input returns repeated point
- Two-point input returns linearly interpolated points

#### Task 3.2: Visual validation (manual)

After implementation, create a temporary SVG overlay in the browser (or a standalone HTML file) that renders:
- The polygon outline
- Door edges highlighted in green
- Wall chains in red/blue
- Centerline in white
- Width bars perpendicular to centerline

This is a dev-only validation step. The overlay code does not need to be committed.

## Technical Considerations

### Coordinate space

All corridor coordinates are in the strait's local 1080x1080 image space (matching the per-strait JPG shown inside the zoom lens). No normalization to 0-1 is needed at this stage. The rendering layer (future BF ticket) will handle coordinate transforms.

### Floating-point tolerance

Illustrator exports introduce small coordinate discrepancies. The SVG parse script must use distance-based matching (not exact equality) when linking door polyline endpoints to polygon vertices. A 5px Euclidean distance threshold is appropriate for the 1080x1080 space.

### Polygon winding direction

The algorithm assumes vertices are ordered (either CW or CCW). The winding direction determines which wall is "left" and which is "right." For ship simulation, the labels are arbitrary -- what matters is consistency. The implementer should verify that Hormuz's vertices proceed in a consistent direction and document which wall chain corresponds to which coast.

### Generic design

The `useCorridor` composable and `resamplePolyline` utility must contain zero Hormuz-specific logic. All behavior derives from the polygon vertices and door indices. When a second corridor (e.g., Malacca) is added to `corridors.json`, the same code must produce correct geometry without modification.

## Acceptance Criteria

- [ ] `data/straits/corridors.json` created with Hormuz polygon (40+ vertices) and door index pairs
- [ ] `types/strait.ts` extended with `StraitCorridor` and `CorridorsData` types
- [ ] `scripts/parse-corridor-svg.ts` exists and can regenerate the JSON from the SVG
- [ ] `composables/useCorridor.ts` derives centerline from polygon + doors alone (no hardcoded geometry)
- [ ] `utils/polyline.ts` provides generic polyline resampling
- [ ] Local width computed at each centerline sample point, all values positive
- [ ] Shared-vertex door edge case (L-shaped opening) handled without errors
- [ ] Unit tests pass for corridor geometry derivation and polyline resampling
- [ ] Algorithm is corridor-agnostic: adding a second entry to `corridors.json` requires no code changes

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `scripts/parse-corridor-svg.ts` | Create | One-shot SVG parse script |
| `data/straits/corridors.json` | Create | Runtime corridor data |
| `types/strait.ts` | Modify | Add `StraitCorridor`, `CorridorsData` |
| `composables/useCorridor.ts` | Create | Centerline/width derivation composable |
| `utils/polyline.ts` | Create | Polyline resampling utility |
| `tests/useCorridor.test.ts` | Create | Corridor geometry tests |
| `tests/polyline.test.ts` | Create | Resampling utility tests |
| `assets/images/hormuz-polygon-01.svg` | Copy to worktree | Source SVG (currently only in main repo) |

## Open Questions for Implementer

1. **Degenerate wall handling:** The simple approach (repeat the single shared vertex) may produce acceptable centerline geometry for Hormuz's L-shaped opening, but should be validated visually. If the fan pattern is too distorted, a projection-based approach will be needed.

2. **Resample resolution (M):** The default of `max(wallLeft.length, wallRight.length, 20)` is a starting point. The ship simulation may need higher resolution for smooth flow. This can be tuned later without changing the algorithm.

3. **Test runner:** The project does not appear to have a test framework configured. The implementer will need to add `vitest` (or the project's preferred runner) if not already present, or write the validation as a standalone script.

## Sources

- **Design spec:** `_process/particles.md` -- full corridor conceptual model, data format, and rendering strategy
- **Source SVG:** `assets/images/hormuz-polygon-01.svg` (Illustrator export, 41 vertices)
- **Existing types:** `types/strait.ts` -- `Point`, `StraitPath` (to be superseded by corridor types)
- **Existing particle system:** `composables/useParticleSystem.ts` (deleted from dev, replaced by corridor approach)
