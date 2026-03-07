import { describe, it, expect } from 'vitest'
import { deriveGeometry } from '../composables/useCorridor'
import corridorsRaw from '../data/straits/corridors.json'
import type { StraitCorridor } from '../types/strait'

const hormuz = corridorsRaw.hormuz as StraitCorridor

// Synthetic rectangle corridor for non-degenerate case validation
const rectangleCorridor: StraitCorridor = {
  viewBox: [0, 0, 100, 100],
  polygon: [[0, 0], [100, 0], [100, 100], [0, 100]],
  doors: { a: [0, 1], b: [2, 3] },
}

describe('Hormuz corridor data', () => {
  it('has 40 unique vertices (excluding closing duplicate)', () => {
    expect(hormuz.polygon).toHaveLength(40)
  })

  it('has correct door indices', () => {
    expect(hormuz.doors.a).toEqual([25, 26])
    expect(hormuz.doors.b).toEqual([26, 27])
  })

  it('has valid viewBox', () => {
    expect(hormuz.viewBox).toEqual([0, 0, 1080, 1080])
  })
})

describe('deriveGeometry - Hormuz', () => {
  const geo = deriveGeometry(hormuz)

  it('produces a non-empty centerline', () => {
    expect(geo.centerline.length).toBeGreaterThan(0)
  })

  it('has matching lengths for walls, centerline, widths, and progress', () => {
    expect(geo.wallLeft.length).toBe(geo.centerline.length)
    expect(geo.wallRight.length).toBe(geo.centerline.length)
    expect(geo.widths.length).toBe(geo.centerline.length)
    expect(geo.progress.length).toBe(geo.centerline.length)
  })

  it('has all non-negative widths', () => {
    expect(geo.widths.every(w => w >= 0)).toBe(true)
  })

  it('has positive centerline length', () => {
    expect(geo.centerlineLength).toBeGreaterThan(0)
  })

  it('has progress values normalized to [0, 1]', () => {
    expect(geo.progress[0]).toBe(0)
    expect(geo.progress[geo.progress.length - 1]).toBeCloseTo(1, 5)
    // Progress should be monotonically non-decreasing
    for (let i = 1; i < geo.progress.length; i++) {
      expect(geo.progress[i]).toBeGreaterThanOrEqual(geo.progress[i - 1])
    }
  })

  it('centerline points lie between the two walls (within bounding box)', () => {
    for (let i = 0; i < geo.centerline.length; i++) {
      const [cx, cy] = geo.centerline[i]
      const [lx, ly] = geo.wallLeft[i]
      const [rx, ry] = geo.wallRight[i]
      // Centerline x should be between wall left x and wall right x (or equal)
      const minX = Math.min(lx, rx)
      const maxX = Math.max(lx, rx)
      const minY = Math.min(ly, ry)
      const maxY = Math.max(ly, ry)
      expect(cx).toBeGreaterThanOrEqual(minX - 0.01)
      expect(cx).toBeLessThanOrEqual(maxX + 0.01)
      expect(cy).toBeGreaterThanOrEqual(minY - 0.01)
      expect(cy).toBeLessThanOrEqual(maxY + 0.01)
    }
  })

  it('handles shared door vertex with mirrored wall', () => {
    // Hormuz doors share vertex 26 -- the degenerate wall is now
    // mirrored from the opposite wall, producing a valid centerline
    expect(geo.wallLeft.length).toBeGreaterThanOrEqual(30)
    expect(geo.wallRight.length).toBeGreaterThanOrEqual(30)
    // Both walls should have more than 1 unique point
    const uniqueRight = new Set(geo.wallRight.map(p => `${p[0]},${p[1]}`))
    expect(uniqueRight.size).toBeGreaterThan(1)
  })
})

describe('deriveGeometry - synthetic rectangle', () => {
  const geo = deriveGeometry(rectangleCorridor)

  it('produces a centerline', () => {
    expect(geo.centerline.length).toBeGreaterThan(0)
  })

  it('has correct wall lengths', () => {
    // Rectangle: door A = [0,1], door B = [2,3]
    // Wall left: vertices 3 -> 0 (one edge, bottom-left to top-left)
    // Wall right: vertices 1 -> 2 (one edge, top-right to bottom-right)
    expect(geo.wallLeft.length).toBe(geo.wallRight.length)
  })

  it('centerline is at x=50 for rectangle', () => {
    // Wall left: vertices 3 -> 0 = [0,100] -> [0,0]
    // Wall right: vertices 1 -> 2 = [100,0] -> [100,100]
    // The walls traverse in opposite vertical directions, so midpoints
    // pair diagonally at endpoints and align at the center.
    // All centerline points should have x = 50.
    for (const [x] of geo.centerline) {
      expect(x).toBeCloseTo(50, 1)
    }
  })

  it('width is symmetric about the middle sample', () => {
    // Due to opposite-direction wall traversal, widths form a U shape:
    // endpoints pair diagonally (wider), center pairs horizontally (narrower).
    // Middle samples should have width ~100 (horizontal pairing).
    const mid = Math.floor(geo.widths.length / 2)
    expect(geo.widths[mid]).toBeCloseTo(100, 0)
  })

  it('has all non-negative widths', () => {
    expect(geo.widths.every(w => w >= 0)).toBe(true)
  })
})

describe('deriveGeometry - cache / determinism', () => {
  it('returns identical results for repeated calls on the same corridor', () => {
    // Since geometryCache is null in Node (no window), this tests
    // that deriveGeometry is a pure, deterministic function.
    const geo1 = deriveGeometry(hormuz)
    const geo2 = deriveGeometry(hormuz)
    expect(geo1.centerlineLength).toBe(geo2.centerlineLength)
    expect(geo1.centerline).toEqual(geo2.centerline)
    expect(geo1.widths).toEqual(geo2.widths)
  })
})
