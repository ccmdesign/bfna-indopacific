import type { Point2D } from '~/types/strait'

/**
 * Resample a polyline to N evenly-spaced points by arc length.
 *
 * Edge cases:
 * - Empty input returns []
 * - Single-point input or n <= 1 returns the point repeated n times
 * - Zero-length polyline (all identical points) returns repeated point
 */
export function resamplePolyline(
  points: Point2D[],
  n: number,
): Point2D[] {
  if (n <= 0 || points.length === 0) return []
  if (points.length === 1 || n === 1) {
    return Array.from({ length: n }, () => [points[0][0], points[0][1]] as Point2D)
  }

  // Step 1: Compute cumulative arc lengths
  const cumLengths = [0]
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dy = points[i][1] - points[i - 1][1]
    cumLengths.push(cumLengths[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  const totalLength = cumLengths[cumLengths.length - 1]

  // Zero-length polyline (all points identical)
  if (totalLength === 0) {
    return Array.from({ length: n }, () => [points[0][0], points[0][1]] as Point2D)
  }

  // Step 2: Sample at evenly-spaced arc lengths
  const result: Point2D[] = []
  for (let i = 0; i < n; i++) {
    const targetLen = (i / (n - 1)) * totalLength
    // Binary search for the segment containing targetLen
    let lo = 0
    let hi = cumLengths.length - 1
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
