---
title: "feat: Hormuz corridor data extraction (SVG to corridors.json)"
type: feat
status: active
date: 2026-03-07
linear: BF-99
---

## Enhancement Summary

**Deepened on:** 2026-03-07
**Sections enhanced:** 7
**Research sources:** Computational geometry literature (medial axis / centerline extraction), Nuxt 4 testing docs, SVG parsing best practices, TypeScript review patterns, performance analysis, architecture review

### Key Improvements
1. **Critical tolerance bug found:** Plan specified 5px matching threshold but actual SVG data requires ~17px (vertex 27 mismatch is 16.96px). Corrected to nearest-vertex strategy.
2. **Vitest setup guidance added:** Project has no test runner; detailed Nuxt 4 + Vitest configuration steps now included.
3. **Medial Axis alternative documented:** For non-degenerate corridors, a Voronoi/medial-axis approach may produce better centerlines than the wall-midpoint method.
4. **SVG parsing hardened:** Regex approach replaced with recommendation to use `svg-parser` npm package for robustness.
5. **Performance guardrails added:** Resampling algorithm complexity analyzed; memoization strategy for computed geometry documented.

### New Risks Discovered
- Door-to-vertex tolerance of 5px is **insufficient** for the actual Hormuz SVG data (16.96px gap on vertex 27). Mitigated by switching to nearest-vertex matching.
- Degenerate wall (single-point) produces a fan-shaped centerline that may cause ship bunching at the corner vertex. Needs visual validation before committing to the approach.
- The project lacks `@nuxt/test-utils` and `vitest` dependencies entirely; scaffolding is a prerequisite task.

---

# Hormuz Corridor Data Extraction (SVG to corridors.json)

## Overview

Parse the hand-authored Illustrator SVG (`assets/images/hormuz-polygon-01.svg`) and extract corridor geometry into a new `data/straits/corridors.json` file. Build a generic composable that derives a centerline flow path and local corridor width from polygon + door data alone, so that when the remaining 5 strait corridors are authored, they work without code changes.

This is the data-extraction prerequisite for the ship simulation described in `_process/particles.md`. No rendering or animation work is in scope.

## Problem Statement

The current particle system (`useParticleSystem.ts`, now deleted from `dev`) used hand-tuned Bezier curves (`strait-paths.ts`) that were brittle and required per-strait calibration. The new approach uses hand-drawn corridor polygons as the single source of truth: the centerline and funneling behavior emerge from the geometry itself. BF-99 extracts and structures the first corridor (Hormuz) and builds the generic algorithm.

### Research Insights

**Why corridor polygons are superior to Bezier paths:**
- Bezier paths require 4 control points per lane, calibrated manually per strait -- the old `strait-paths.ts` had this problem
- Corridor polygons are a single source of truth: centerline, width, and funneling all derive from the shape
- This matches industry practice in GIS/maritime systems where navigable waterways are defined as polygonal channels
- The medial axis transform (MAT) is the formal computational geometry concept behind this: the skeleton of a polygon naturally traces its centerline

**References:**
- [A simple centerline extraction approach for 2D polygons](https://www.researchgate.net/publication/308703761_A_simple_centerline_extraction_approach_for_2D_polygons)
- [Medial axis - Wikipedia](https://en.wikipedia.org/wiki/Medial_axis)

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
- Vertex 25 = `(1080, 767.4)` -- matches first door polyline point (distance: 0.00px)
- Vertex 26 = `(1080.1, 1081)` -- matches second point `(1080,1080)` (distance: 1.00px)
- Vertex 27 = `(26, 1083.5)` -- matches third point `(42.6,1080)` (distance: 16.96px)

So door edges are:
- **Door A**: edge from vertex 25 to vertex 26 (right side, Persian Gulf approach)
- **Door B**: edge from vertex 26 to vertex 27 (bottom, Gulf of Oman approach)

#### Task 1.1: Write SVG parse script

**File:** `scripts/parse-corridor-svg.ts`

A one-shot Node script (run with `npx tsx`) that:

1. Reads the SVG file with `fs.readFileSync`
2. Extracts the `<polygon>` `points` attribute and `<polyline>` elements
3. Parses the points string into an `[x, y][]` array
4. Extracts the `<polyline class="st1">` `points` attribute
5. Matches door polyline endpoints to polygon vertex indices using **nearest-vertex matching** (see tolerance section below)
6. Writes `data/straits/corridors.json`

### Research Insights: SVG Parsing

**Best Practice: Use a proper SVG/XML parser instead of regex.**

The plan originally suggested regex for parsing the SVG. While the SVG structure is simple, using a dedicated parser is more robust and handles edge cases (attribute ordering, whitespace variations, XML entities). The `svg-parser` npm package (zero dependencies, ~3KB) converts SVG to a HAST-like AST that can be traversed programmatically.

```typescript
// Recommended approach using svg-parser
import { parse } from 'svg-parser'
import { readFileSync } from 'fs'

const svg = readFileSync('assets/images/hormuz-polygon-01.svg', 'utf-8')
const ast = parse(svg)

// Navigate to polygon element
function findElement(node: any, tagName: string, className?: string): any {
  if (node.tagName === tagName) {
    if (!className || node.properties?.class === className) return node
  }
  for (const child of node.children ?? []) {
    const found = findElement(child, tagName, className)
    if (found) return found
  }
  return null
}

const polygon = findElement(ast, 'polygon', 'st2')
const doorPolyline = findElement(ast, 'polyline', 'st1')
```

**Alternative (if zero-dependency is preferred):** A simple regex approach still works for this specific SVG structure, but add a validation step that asserts the expected element count to catch structural changes:

```typescript
const polygonMatch = svg.match(/<polygon[^>]*points="([^"]+)"/)
if (!polygonMatch) throw new Error('No <polygon> found in SVG')
```

**References:**
- [svg-parser on npm](https://www.npmjs.com/package/svg-parser)
- [SVG parsing guide for TypeScript](https://www.webdevtutor.net/blog/typescript-parse-svg)

### Research Insights: Tolerance Matching (CRITICAL CORRECTION)

**The plan's original 5px tolerance is insufficient.**

Empirical analysis of the actual SVG data reveals:

| Door polyline point | Nearest polygon vertex | Distance |
|---|---|---|
| `(1080, 767.4)` | Vertex 25 `(1080, 767.4)` | **0.00px** |
| `(1080, 1080)` | Vertex 26 `(1080.1, 1081)` | **1.00px** |
| `(42.6, 1080)` | Vertex 27 `(26, 1083.5)` | **16.96px** |

The third door point has a **16.96px** mismatch -- more than 3x the proposed 5px threshold. This is caused by Illustrator's SVG export rounding and coordinate snapping behavior.

**Recommended approach: Use nearest-vertex matching instead of fixed tolerance.**

Rather than setting a tolerance threshold that may break for future corridors, match each door polyline point to its nearest polygon vertex. Then validate that the nearest distance is below a generous safety threshold (e.g., 25px) to catch truly broken SVGs:

```typescript
function findNearestVertex(
  target: [number, number],
  vertices: [number, number][]
): { index: number; distance: number } {
  let minDist = Infinity
  let minIdx = -1
  for (let i = 0; i < vertices.length; i++) {
    const dx = target[0] - vertices[i][0]
    const dy = target[1] - vertices[i][1]
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < minDist) {
      minDist = dist
      minIdx = i
    }
  }
  return { index: minIdx, distance: minDist }
}

// Usage with safety check
const MAX_SNAP_DISTANCE = 25 // px in 1080x1080 space
const match = findNearestVertex(doorPoint, polygonVertices)
if (match.distance > MAX_SNAP_DISTANCE) {
  throw new Error(
    `Door point (${doorPoint}) too far from nearest vertex ${match.index} ` +
    `(${match.distance.toFixed(1)}px > ${MAX_SNAP_DISTANCE}px threshold)`
  )
}
```

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

### Research Insights: JSON Output Validation

After generating `corridors.json`, the parse script should perform these structural assertions before writing:

1. **Closing vertex removed:** The polygon's last vertex duplicates the first (closing the ring). Strip it so `polygon.length` = 40, not 41.
2. **Door indices are valid:** Both door index pairs reference vertices within `[0, polygon.length - 1]`.
3. **Door edges are adjacent:** Each door pair `[i, j]` should satisfy `j === i + 1` or wrap around (`i === polygon.length - 1 && j === 0`).
4. **No duplicate coordinates:** All 40 unique vertices should be distinct (no two vertices closer than 0.1px).
5. **Polygon is simple:** No self-intersections (optional -- can be validated visually).

#### Task 1.3: Add TypeScript types

**File:** `types/strait.ts` (append to existing)

```typescript
/** A strait corridor polygon with classified door edges. */
export interface StraitCorridor {
  /** SVG viewBox dimensions [minX, minY, width, height] */
  viewBox: [number, number, number, number]
  /** Ordered [x, y] vertices of the navigable polygon (closed ring, last !== first) */
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

### Research Insights: Type Safety

**From TypeScript review patterns (Kieran-style):**

- The `CorridorsData` type uses `Record<string, StraitCorridor>` which allows any string key. Consider using a branded type or union type for corridor IDs to prevent typos at compile time:

```typescript
/** Known strait corridor IDs (extend as corridors are added) */
export type CorridorId = 'hormuz' | 'malacca' | 'lombok' | 'sunda' | 'taiwan' | 'bab-el-mandeb'

/** Shape of data/straits/corridors.json -- keys are validated corridor IDs */
export type CorridorsData = Partial<Record<CorridorId, StraitCorridor>>
```

- The tuple type `[number, number]` for points is good (enforces exactly 2 elements), but consider a named type alias for clarity:

```typescript
/** A 2D point as [x, y] in corridor-local coordinates */
export type Point2D = [number, number]
```

- Avoid `as any` casts when importing JSON. Use `satisfies` or a runtime validation guard:

```typescript
import corridorsRaw from '~/data/straits/corridors.json'
const corridors = corridorsRaw as CorridorsData // acceptable for static JSON
```

### Phase 2: Centerline Derivation Composable

#### Task 2.1: Implement `composables/useCorridor.ts`

A pure-computation composable (no DOM, no rendering) that takes a `StraitCorridor` and produces:

1. **Wall chains** -- two ordered sequences of vertices forming the left and right walls
2. **Centerline points** -- midpoints between corresponding wall edge pairs
3. **Local width** -- perpendicular distance between walls at each centerline point

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

### Research Insights: Centerline Algorithm

**Alternative approach: Medial Axis Transform (MAT)**

The wall-midpoint method described above is a simplified centerline extraction. The formal computational geometry approach is the medial axis transform, which computes the locus of centers of maximally inscribed circles within the polygon. For elongated corridor shapes, the MAT naturally produces a clean centerline.

However, the MAT is significantly more complex to implement (requires Voronoi diagram computation or distance field methods). The wall-midpoint approach is adequate for this use case because:

1. Corridors have exactly two walls and two doors -- the topology is known in advance
2. Ships only need approximate centerline following, not geometric precision
3. The wall-midpoint method is O(N) where N is vertex count, while MAT is O(N log N)
4. The visual result is indistinguishable for the 40-vertex polygons used here

**Recommendation:** Keep the wall-midpoint approach. If a future corridor has complex geometry (multiple bends, islands), consider the MAT as a future enhancement.

**Resampling accuracy consideration:**

The linear interpolation resampling is susceptible to uneven vertex spacing in the source polygon. If one wall has 30 vertices over a long coast and the other has 3 vertices over a short edge, the midpoints will be geometrically skewed. To mitigate:

- Resample to at least `M = max(wallLeft.length, wallRight.length, 30)` (increased from 20)
- Consider using a higher M (e.g., 50-100) for smoother ship paths -- the cost is negligible for static precomputation

**References:**
- [Arc Length Parameterization](https://fullnitrous.com/post/RUnyh) -- technique for evenly sampling curves by distance
- [centerline library documentation](https://centerline.readthedocs.io/) -- Python reference implementation

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
  /** Total arc length of the centerline in px */
  centerlineLength: number
}
```

### Research Insights: Return Type Enhancement

**Added `centerlineLength`:** The ship simulation (future BF ticket) will need the total centerline arc length to compute ship speeds and spawn timing. Computing it during geometry derivation is essentially free and avoids redundant calculation at runtime.

**Consider adding normalized progress mapping:**

```typescript
/** Cumulative arc length at each centerline sample, normalized to [0, 1] */
progress: number[]
```

This maps each centerline point to a `[0, 1]` progress value, which the ship simulation can use directly for positioning. Ships at `progress = 0` are at Door A, and at `progress = 1` are at Door B.

**Composable signature:**

```typescript
export function useCorridor(corridorId: Ref<string | null>): {
  geometry: ComputedRef<CorridorGeometry | null>
  corridor: ComputedRef<StraitCorridor | null>
}
```

The composable reads `corridors.json`, looks up the corridor by ID, and returns the derived geometry as a computed ref. When `corridorId` changes, the geometry recomputes.

### Research Insights: Composable Design

**Memoization:** Since corridor geometry is static (derived from fixed JSON data), the computed ref will only evaluate once per corridor ID. However, if multiple components consume the same corridor, each will independently compute the geometry. Consider a module-level cache:

```typescript
const geometryCache = new Map<string, CorridorGeometry>()

function deriveGeometry(corridor: StraitCorridor): CorridorGeometry {
  // ... computation
}

export function useCorridor(corridorId: Ref<string | null>) {
  const geometry = computed(() => {
    const id = corridorId.value
    if (!id) return null
    if (geometryCache.has(id)) return geometryCache.get(id)!
    const corridor = corridorsData[id]
    if (!corridor) return null
    const geo = deriveGeometry(corridor)
    geometryCache.set(id, geo)
    return geo
  })
  // ...
}
```

**Pure function extraction:** The centerline derivation logic (`deriveGeometry`) should be a pure function, not embedded inside the composable. This enables:
1. Direct unit testing without Vue reactivity
2. Use from the parse script for validation
3. Potential use in a web worker for complex future corridors

**Nuxt auto-import:** Since this composable lives in `composables/`, Nuxt will auto-import it. No manual import needed in consuming components.

#### Task 2.2: Wall chain extraction details

The polygon is a closed ring. Door edges split it into two wall chains. The tricky part is correctly walking the ring in the right direction.

For Hormuz (vertices 0-39, 40 unique vertices after removing closing duplicate):
- Door A: edge 25->26
- Door B: edge 26->27
- Wall Left: vertices 27, 28, 29, ..., 39, 0, 1, 2, ..., 25 (from door B end to door A start)
- Wall Right: this is just the shared vertex 26 (degenerate case because doors share a vertex)

**Wait -- this is a critical edge case.** In Hormuz, doors A and B share vertex 26, meaning one "wall" is just a single point. This happens because the corridor has an L-shaped opening (two door edges meeting at a corner).

**Resolution:** When doors share a vertex, one wall chain is degenerate (length 1 or 0). The algorithm should:
1. Detect shared-vertex doors
2. For the degenerate wall, synthesize intermediate points by projecting from the opposite wall's points perpendicular to the centerline direction
3. Or more simply: treat the shared vertex as a single-point wall and let the resampling repeat that point M times. The centerline will then be the midpoints between the long wall's samples and the repeated corner point. This produces a fan-shaped centerline radiating from the corner, which actually matches Hormuz's L-shaped geography.

**Recommendation:** Start with the simple approach (repeat the degenerate point). Validate visually. If the fan shape is too distorted, add projection logic as a refinement.

### Research Insights: Degenerate Wall Analysis

**Risk assessment for the fan-shaped centerline:**

With the degenerate single-point wall, the centerline will fan outward from vertex 26 `(1080.1, 1081)` to the midpoints of each resampled point on the long wall. This means:

1. **All ships converge to a single point** at the corner vertex. In the ship simulation, this creates an unrealistic bottleneck where all traffic funnels through one pixel.
2. **Width is zero** at the corner vertex and expands outward. Ships near the corner will have zero lateral spread.
3. **Centerline curvature** will be extreme near the corner, potentially causing ships to make sharp turns.

**Mitigation options (ranked by complexity):**

1. **Simple (recommended for v1):** Accept the fan shape. Ships will naturally compress near the corner, which visually suggests a chokepoint. Validate that it looks acceptable.

2. **Door splitting:** In the SVG authoring, split the L-shaped door into two separate door edges that don't share a vertex. Add a small wall segment (even 2-3px) between them. This eliminates the degenerate case entirely and is the cleanest long-term fix.

3. **Corner interpolation:** When a degenerate wall is detected, synthesize a small arc of points around the shared vertex:
   ```
   For a shared vertex V with adjacent door endpoints A and B:
   Create 3-5 interpolated points along an arc from A to B centered on V
   Use these as the "wall" for resampling
   ```

4. **Two-segment centerline:** Split the corridor into two segments at the shared vertex, compute each segment's centerline independently, then join them. This handles L-shapes naturally.

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

### Research Insights: Resampling Implementation

**Algorithm detail (arc-length parameterization):**

```typescript
export function resamplePolyline(
  points: [number, number][],
  n: number
): [number, number][] {
  if (points.length === 0) return []
  if (points.length === 1 || n <= 1) {
    return Array.from({ length: n }, () => [...points[0]] as [number, number])
  }

  // Step 1: Compute cumulative arc lengths
  const cumLengths = [0]
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dy = points[i][1] - points[i - 1][1]
    cumLengths.push(cumLengths[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  const totalLength = cumLengths[cumLengths.length - 1]

  if (totalLength === 0) {
    return Array.from({ length: n }, () => [...points[0]] as [number, number])
  }

  // Step 2: Sample at evenly-spaced arc lengths
  const result: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const targetLen = (i / (n - 1)) * totalLength
    // Binary search for the segment containing targetLen
    let lo = 0, hi = cumLengths.length - 1
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1
      if (cumLengths[mid] <= targetLen) lo = mid
      else hi = mid
    }
    const segLen = cumLengths[hi] - cumLengths[lo]
    const t = segLen > 0 ? (targetLen - cumLengths[lo]) / segLen : 0
    result.push([
      points[lo][0] + t * (points[hi][0] - points[lo][0]),
      points[lo][1] + t * (points[hi][1] - points[lo][1]),
    ])
  }
  return result
}
```

**Performance note:** The binary search makes this O(N log M) where N = output samples and M = input points. For the small sizes involved (M < 50, N < 100), this is instantaneous. A linear scan would also be fine.

**Edge cases to test:**
- `n = 0` -- should return `[]`
- `n = 1` -- should return the first point
- All points identical (zero-length polyline) -- should return repeated point
- Two-point input -- should return linearly interpolated points
- Very uneven segment lengths -- should still produce evenly-spaced output

### Phase 3: Validation

#### Task 3.1: Unit tests

### Research Insights: Test Runner Setup (PREREQUISITE)

**The project has no test framework configured.** The `package.json` has no `vitest`, `@nuxt/test-utils`, or any test-related dependencies. This must be set up before tests can be written.

**Setup steps for Nuxt 4 + Vitest:**

```bash
# Install test dependencies
npm install -D vitest @nuxt/test-utils happy-dom
```

**Create `vitest.config.ts` at project root:**

```typescript
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'node', // pure computation tests don't need DOM
  },
})
```

**Add test script to `package.json`:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

**Important for this plan:** Since `useCorridor.ts` is a pure-computation composable (no DOM, no rendering), and `resamplePolyline` is a pure utility function, tests can run in Node environment without the Nuxt runtime. This avoids the complexity of `@nuxt/test-utils` environment setup. Only import the raw functions, not the composable's Vue wrappers.

**Test the pure `deriveGeometry` function directly**, not through the `useCorridor` composable. This avoids needing Vue reactivity in tests:

```typescript
// tests/corridor-geometry.test.ts
import { describe, it, expect } from 'vitest'
import { deriveGeometry } from '../composables/useCorridor'
import corridors from '../data/straits/corridors.json'

describe('deriveGeometry', () => {
  it('produces valid centerline for Hormuz', () => {
    const geo = deriveGeometry(corridors.hormuz)
    expect(geo.centerline.length).toBeGreaterThan(0)
    expect(geo.widths.every(w => w >= 0)).toBe(true)
  })
})
```

**References:**
- [Nuxt 4 Testing Documentation](https://nuxt.com/docs/4.x/getting-started/testing)
- [Testing Nuxt composables discussion](https://github.com/nuxt/nuxt/discussions/18821)

**File:** `tests/useCorridor.test.ts`

Test cases:
- Parse Hormuz corridor from `corridors.json` and verify vertex count (40 unique vertices, excluding closing duplicate)
- Verify door indices match expected values (25-26, 26-27)
- Verify wall chains have correct start/end vertices
- Verify centerline has the expected sample count
- Verify all widths are non-negative (not just positive -- degenerate wall may produce zero width)
- Verify centerline points lie between the two walls (within bounding box of each wall pair)
- Verify wall chain extraction handles wrapping correctly (wall left wraps from vertex 27 through 39/0 back to 25)

**File:** `tests/polyline.test.ts`

Test cases:
- Resample a known polyline (e.g., unit square edge) and verify even spacing
- Single-point input returns repeated point
- Two-point input returns linearly interpolated points
- Zero-length input returns empty array
- All-identical-points input returns repeated point
- Uneven segment lengths produce evenly-spaced output (verify with distance checks)

#### Task 3.2: Visual validation (manual)

After implementation, create a temporary SVG overlay in the browser (or a standalone HTML file) that renders:
- The polygon outline
- Door edges highlighted in green
- Wall chains in red/blue
- Centerline in white
- Width bars perpendicular to centerline

This is a dev-only validation step. The overlay code does not need to be committed.

### Research Insights: Visual Validation Approach

**Standalone HTML validation page (recommended):**

Rather than modifying the application, create a `scripts/validate-corridor.html` file that:

1. Loads `corridors.json` via fetch
2. Runs the same `deriveGeometry` algorithm (inline or bundled)
3. Renders an SVG with all layers overlaid

This keeps validation completely separate from production code. The implementer can open it directly in a browser without running the Nuxt dev server.

**Key visual checks:**
- Centerline stays inside the polygon at all points
- Width bars don't cross the polygon boundary
- The fan shape at the shared vertex (26) is visually acceptable
- Wall chains are correctly identified (red = left coast, blue = right coast)
- Door edges are clearly distinct from wall edges

## Technical Considerations

### Coordinate space

All corridor coordinates are in the strait's local 1080x1080 image space (matching the per-strait JPG shown inside the zoom lens). No normalization to 0-1 is needed at this stage. The rendering layer (future BF ticket) will handle coordinate transforms.

### Research Insights: Coordinate Space

**Consistency with existing code:** The existing `useParticleSystem.ts` uses `0..1` normalized coordinates for its Bezier paths (see `Point` type in `types/strait.ts`). The new corridor system uses `0..1080` pixel coordinates. This is an intentional break -- the old normalized system required per-strait calibration, while the pixel system maps directly to the SVG/JPG coordinate space.

**When the rendering layer is built (future ticket):** The corridor's 1080x1080 coordinates will need to be mapped to the `StraitCircle.vue` container's actual pixel dimensions. This is a simple scale transform: `screenX = corridorX * (circleSize / 1080)`.

### Floating-point tolerance

Illustrator exports introduce small coordinate discrepancies. The SVG parse script must use **nearest-vertex matching** (not distance-threshold matching) when linking door polyline endpoints to polygon vertices. A safety threshold of 25px should be used to catch broken SVGs, but the primary matching is always nearest-vertex.

**Rationale for change from original plan:** The original 5px tolerance would fail on vertex 27, which has a 16.96px mismatch. Rather than increasing the threshold to an arbitrary value, nearest-vertex matching is robust regardless of Illustrator's export behavior.

### Polygon winding direction

The algorithm assumes vertices are ordered (either CW or CCW). The winding direction determines which wall is "left" and which is "right." For ship simulation, the labels are arbitrary -- what matters is consistency. The implementer should verify that Hormuz's vertices proceed in a consistent direction and document which wall chain corresponds to which coast.

### Research Insights: Winding Direction

**Computing winding direction programmatically:**

The signed area formula determines winding: if positive, vertices are counter-clockwise (CCW); if negative, clockwise (CW).

```typescript
function signedArea(polygon: [number, number][]): number {
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    area += polygon[i][0] * polygon[j][1]
    area -= polygon[j][0] * polygon[i][1]
  }
  return area / 2
}
```

Add this as a validation step in the parse script. Document the winding direction in `corridors.json` metadata or a code comment. This ensures future corridors can be validated for consistent winding.

### Generic design

The `useCorridor` composable and `resamplePolyline` utility must contain zero Hormuz-specific logic. All behavior derives from the polygon vertices and door indices. When a second corridor (e.g., Malacca) is added to `corridors.json`, the same code must produce correct geometry without modification.

### Research Insights: Generic Design Validation

**How to ensure generality:**
1. The parse script should accept the strait ID and SVG path as CLI arguments, not hardcode them
2. The `deriveGeometry` function should accept a `StraitCorridor` object, not read from a file
3. Unit tests should include a synthetic corridor (e.g., a simple rectangle with two door edges) alongside the real Hormuz data
4. The degenerate wall case (shared vertex) should be handled as a general code path, not a Hormuz-specific branch

**Synthetic test corridor (rectangle):**

```typescript
const rectangleCorridor: StraitCorridor = {
  viewBox: [0, 0, 100, 100],
  polygon: [[0, 0], [100, 0], [100, 100], [0, 100]],
  doors: { a: [0, 1], b: [2, 3] }
}
// Expected: two walls of length 100, centerline at y=50, constant width=100
```

This trivial case validates the algorithm works for non-degenerate corridors before testing the complex Hormuz geometry.

## Acceptance Criteria

- [ ] `data/straits/corridors.json` created with Hormuz polygon (40 unique vertices, excluding closing duplicate) and door index pairs
- [ ] `types/strait.ts` extended with `StraitCorridor` and `CorridorsData` types
- [ ] `scripts/parse-corridor-svg.ts` exists and can regenerate the JSON from the SVG
- [ ] Parse script uses nearest-vertex matching (not fixed tolerance) for door-to-polygon linking
- [ ] Parse script validates: closing vertex stripped, door indices valid, no duplicate vertices
- [ ] `composables/useCorridor.ts` derives centerline from polygon + doors alone (no hardcoded geometry)
- [ ] Pure `deriveGeometry` function is exported separately from the Vue composable wrapper
- [ ] `utils/polyline.ts` provides generic polyline resampling with arc-length parameterization
- [ ] Local width computed at each centerline sample point, all values non-negative
- [ ] Shared-vertex door edge case (L-shaped opening) handled without errors
- [ ] Unit tests pass for corridor geometry derivation and polyline resampling
- [ ] Vitest configured as project dev dependency with working `npm test` script
- [ ] Algorithm is corridor-agnostic: adding a second entry to `corridors.json` requires no code changes
- [ ] Synthetic rectangle corridor test validates non-degenerate case

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `scripts/parse-corridor-svg.ts` | Create | One-shot SVG parse script |
| `data/straits/corridors.json` | Create | Runtime corridor data |
| `types/strait.ts` | Modify | Add `StraitCorridor`, `CorridorsData`, `Point2D` |
| `composables/useCorridor.ts` | Create | Centerline/width derivation composable |
| `utils/polyline.ts` | Create | Polyline resampling utility |
| `tests/corridor-geometry.test.ts` | Create | Corridor geometry tests |
| `tests/polyline.test.ts` | Create | Resampling utility tests |
| `vitest.config.ts` | Create | Test runner configuration |
| `package.json` | Modify | Add vitest, @nuxt/test-utils, happy-dom to devDependencies |
| `assets/images/hormuz-polygon-01.svg` | Copy to worktree | Source SVG (currently only in main repo) |

## Open Questions for Implementer

1. **Degenerate wall handling:** The simple approach (repeat the single shared vertex) may produce acceptable centerline geometry for Hormuz's L-shaped opening, but should be validated visually. If the fan pattern is too distorted, a projection-based approach will be needed. Consider whether the SVG should be re-authored to add a small wall segment between the two door edges.

2. **Resample resolution (M):** The default of `max(wallLeft.length, wallRight.length, 30)` is a starting point. The ship simulation may need higher resolution for smooth flow. This can be tuned later without changing the algorithm.

3. **`svg-parser` vs regex:** If adding `svg-parser` as a dev dependency is undesirable (even though it's zero-runtime-cost since it's only used in the parse script), regex with structural assertions is acceptable for this simple SVG structure.

4. **Winding direction convention:** Should all corridors use CCW winding? If so, add an auto-flip in the parse script. If not, document that winding is arbitrary and only wall labeling is affected.

5. **`CorridorId` union type:** Using a string union for corridor IDs provides compile-time safety but requires updating the type each time a new corridor is added. This is a tradeoff between safety and convenience.

## Sources

- **Design spec:** `_process/particles.md` -- full corridor conceptual model, data format, and rendering strategy
- **Source SVG:** `assets/images/hormuz-polygon-01.svg` (Illustrator export, 41 vertices)
- **Existing types:** `types/strait.ts` -- `Point`, `StraitPath` (to be superseded by corridor types)
- **Existing particle system:** `composables/useParticleSystem.ts` (deleted from dev, replaced by corridor approach)
- **Centerline extraction research:** [ResearchGate paper on 2D polygon centerlines](https://www.researchgate.net/publication/308703761_A_simple_centerline_extraction_approach_for_2D_polygons)
- **Medial axis theory:** [Wikipedia - Medial axis](https://en.wikipedia.org/wiki/Medial_axis)
- **Arc length parameterization:** [fullnitrous.com guide](https://fullnitrous.com/post/RUnyh)
- **SVG parsing:** [svg-parser on npm](https://www.npmjs.com/package/svg-parser)
- **Nuxt 4 testing:** [Nuxt 4 testing docs](https://nuxt.com/docs/4.x/getting-started/testing)
- **Vitest + Nuxt composables:** [GitHub discussion #18821](https://github.com/nuxt/nuxt/discussions/18821)
