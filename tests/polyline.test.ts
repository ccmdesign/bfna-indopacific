import { describe, it, expect } from 'vitest'
import { resamplePolyline } from '../utils/polyline'
import type { Point2D } from '../types/strait'

function dist(a: Point2D, b: Point2D): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

describe('resamplePolyline', () => {
  it('returns empty array for n=0', () => {
    expect(resamplePolyline([[0, 0], [10, 0]], 0)).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(resamplePolyline([], 5)).toEqual([])
  })

  it('returns single point repeated for single-point input', () => {
    const result = resamplePolyline([[5, 7]], 4)
    expect(result).toHaveLength(4)
    for (const p of result) {
      expect(p).toEqual([5, 7])
    }
  })

  it('returns first point for n=1', () => {
    const result = resamplePolyline([[0, 0], [10, 0]], 1)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual([0, 0])
  })

  it('returns linearly interpolated points for two-point input', () => {
    const result = resamplePolyline([[0, 0], [10, 0]], 5)
    expect(result).toHaveLength(5)
    expect(result[0]).toEqual([0, 0])
    expect(result[4]).toEqual([10, 0])
    // Middle point should be at x=5
    expect(result[2][0]).toBeCloseTo(5, 5)
    expect(result[2][1]).toBeCloseTo(0, 5)
  })

  it('handles all-identical-points input', () => {
    const result = resamplePolyline([[3, 3], [3, 3], [3, 3]], 5)
    expect(result).toHaveLength(5)
    for (const p of result) {
      expect(p).toEqual([3, 3])
    }
  })

  it('produces evenly-spaced output for uneven segment lengths', () => {
    // Polyline with segments of length 1 and 9 (total 10)
    const input: Point2D[] = [[0, 0], [1, 0], [10, 0]]
    const result = resamplePolyline(input, 11)
    expect(result).toHaveLength(11)

    // All consecutive distances should be ~1.0
    for (let i = 1; i < result.length; i++) {
      const d = dist(result[i], result[i - 1])
      expect(d).toBeCloseTo(1.0, 3)
    }
  })

  it('preserves start and end points exactly', () => {
    const input: Point2D[] = [[3, 7], [15, 22], [100, 50]]
    const result = resamplePolyline(input, 20)
    expect(result[0]).toEqual([3, 7])
    expect(result[19][0]).toBeCloseTo(100, 3)
    expect(result[19][1]).toBeCloseTo(50, 3)
  })
})
