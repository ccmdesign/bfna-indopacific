import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { StraitCorridor, CorridorGeometry, Point2D } from '~/types/strait'
import { resamplePolyline } from '~/utils/polyline'
import corridorsRaw from '~/data/straits/corridors.json'
import type { CorridorsData } from '~/types/strait'

const corridorsData = corridorsRaw as CorridorsData

// Module-level cache: corridor geometry is static, no need to recompute.
// Guarded to client-only to avoid SSR shared-state leaks across requests.
const geometryCache: Map<string, CorridorGeometry> | null =
  typeof window !== 'undefined' ? new Map<string, CorridorGeometry>() : null

/**
 * Extract two wall chains from a corridor polygon given door edge indices.
 *
 * The polygon is a closed ring of N vertices. Two door edges split it into
 * two wall chains. Each wall chain runs from one door's end vertex to the
 * next door's start vertex, walking forward around the ring.
 *
 * Door A: edge [a0, a1], Door B: edge [b0, b1]
 * Wall Left:  vertices from b1 -> ... -> a0 (walking forward, wrapping)
 * Wall Right: vertices from a1 -> ... -> b0 (walking forward, wrapping)
 */
function extractWallChains(
  polygon: Point2D[],
  doors: { a: [number, number]; b: [number, number] },
): { wallLeft: Point2D[]; wallRight: Point2D[] } {
  const n = polygon.length

  function walkChain(from: number, to: number): Point2D[] {
    const chain: Point2D[] = []
    let idx = from
    // Walk forward from `from` to `to`, inclusive on both ends
    while (true) {
      chain.push(polygon[idx])
      if (idx === to) break
      idx = (idx + 1) % n
      // Safety: prevent infinite loop on bad data
      if (chain.length > n + 1) {
        throw new Error(`Wall chain walk exceeded polygon length (from=${from}, to=${to})`)
      }
    }
    return chain
  }

  // Wall Left: from door B end (b1) to door A start (a0)
  const wallLeft = walkChain(doors.b[1], doors.a[0])
  // Wall Right: from door A end (a1) to door B start (b0)
  const wallRight = walkChain(doors.a[1], doors.b[0])

  // Handle degenerate wall from shared door vertex (e.g., doors a=[25,26], b=[26,27]):
  // When a1 === b0, the right wall is a single repeated point. Mirror it from the
  // left wall by offsetting each left-wall point toward the degenerate vertex.
  if (wallRight.length === 1 && wallLeft.length > 1) {
    const anchor = wallRight[0]
    const mirrored: Point2D[] = wallLeft.map(([lx, ly]) => [
      2 * anchor[0] - lx,
      2 * anchor[1] - ly,
    ] as Point2D)
    return { wallLeft, wallRight: mirrored }
  }
  if (wallLeft.length === 1 && wallRight.length > 1) {
    const anchor = wallLeft[0]
    const mirrored: Point2D[] = wallRight.map(([rx, ry]) => [
      2 * anchor[0] - rx,
      2 * anchor[1] - ry,
    ] as Point2D)
    return { wallLeft: mirrored, wallRight }
  }

  return { wallLeft, wallRight }
}

/**
 * Derive corridor geometry (centerline, walls, widths) from a StraitCorridor.
 *
 * This is a pure function with no Vue/DOM dependencies, suitable for
 * direct unit testing and potential web worker use.
 */
export function deriveGeometry(corridor: StraitCorridor): CorridorGeometry {
  const { polygon, doors } = corridor
  const { wallLeft: rawLeft, wallRight: rawRight } = extractWallChains(polygon, doors)

  // Resample both walls to equal segment count
  const m = Math.max(rawLeft.length, rawRight.length, 30)
  const wallLeft = resamplePolyline(rawLeft, m)
  const wallRight = resamplePolyline(rawRight, m)

  // Compute centerline as midpoints of corresponding wall pairs
  const centerline: Point2D[] = []
  const widths: number[] = []
  for (let i = 0; i < m; i++) {
    centerline.push([
      (wallLeft[i][0] + wallRight[i][0]) / 2,
      (wallLeft[i][1] + wallRight[i][1]) / 2,
    ])
    const dx = wallLeft[i][0] - wallRight[i][0]
    const dy = wallLeft[i][1] - wallRight[i][1]
    widths.push(Math.sqrt(dx * dx + dy * dy))
  }

  // Compute centerline arc length and progress
  const cumLengths = [0]
  for (let i = 1; i < centerline.length; i++) {
    const dx = centerline[i][0] - centerline[i - 1][0]
    const dy = centerline[i][1] - centerline[i - 1][1]
    cumLengths.push(cumLengths[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  const centerlineLength = cumLengths[cumLengths.length - 1]

  // Normalize progress to [0, 1]
  const progress = centerlineLength > 0
    ? cumLengths.map(l => l / centerlineLength)
    : cumLengths.map(() => 0)

  return {
    wallLeft,
    wallRight,
    centerline,
    widths,
    centerlineLength,
    progress,
  }
}

/**
 * Vue composable that derives corridor geometry from corridors.json.
 *
 * Takes a reactive corridor ID and returns computed geometry and corridor data.
 * Results are cached at module level since corridor data is static.
 */
export function useCorridor(corridorId: Ref<string | null>): {
  geometry: ComputedRef<CorridorGeometry | null>
  corridor: ComputedRef<StraitCorridor | null>
} {
  const corridor = computed<StraitCorridor | null>(() => {
    const id = corridorId.value
    if (!id) return null
    return (corridorsData as Record<string, StraitCorridor>)[id] ?? null
  })

  const geometry = computed<CorridorGeometry | null>(() => {
    const id = corridorId.value
    if (!id || !corridor.value) return null

    const cached = geometryCache?.get(id)
    if (cached) return cached

    const geo = deriveGeometry(corridor.value)
    geometryCache?.set(id, geo)
    return geo
  })

  return { geometry, corridor }
}
