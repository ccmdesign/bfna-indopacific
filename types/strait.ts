/**
 * Shape of a single strait entry in data/straits/straits.json.
 * Keeps the JSON data contract explicit and enables compile-time checks.
 */
export type LabelAnchor = 'above' | 'below' | 'left' | 'right'

export interface Strait {
  id: string
  portId: string
  name: string
  /** Horizontal position as a percentage (0-100) of the viewBox width */
  posX: number
  /** Vertical position as a percentage (0-100) of the viewBox height */
  posY: number
  labelAnchor: LabelAnchor
  /** Relative flow scalar used for circle sizing (0-100) */
  flowScalar: number
  valueUSD: number
  valueLabel: string
  oilMbpd: number | null
  lngBcfd: number | null
  globalShareLabel: string
  description: string
  topIndustries: string[]
  threats: string[]
  keyFacts: string[]
  /** Optional URL to a per-strait satellite image crop for the fisheye shader */
  imageUrl?: string
}

export interface StraitsDataMeta {
  title: string
  client: string
  dataSource: string
  dataAPI: string
  methodology: string
  dateRange: string
  updateFrequency: string
  supplementaryValueSource: string
  license: string
}

export interface StraitsData {
  meta: StraitsDataMeta
  straits: Strait[]
  historical: Record<string, Record<string, StraitHistoricalEntry>>
}

// ---------------------------------------------------------------------------
// Particle system types (BF-78)
// ---------------------------------------------------------------------------

export type ParticleType = 'container' | 'dryBulk' | 'tanker'

export interface StraitHistoricalEntry {
  capacityMt: number
  vessels: { total: number; container: number; dryBulk: number; tanker: number }
  capacityByType: { container: number; dryBulk: number; tanker: number }
}

export interface Point {
  x: number // 0..1 normalized to map width
  y: number // 0..1 normalized to map height
}

export interface StraitPath {
  /** Control points for a cubic Bezier: [start, cp1, cp2, end] */
  points: [Point, Point, Point, Point]
  /** Optional second lane for more complex straits */
  altPoints?: [Point, Point, Point, Point]
}

// ---------------------------------------------------------------------------
// Corridor geometry types (BF-99)
// ---------------------------------------------------------------------------

/** A 2D point as [x, y] in corridor-local coordinates */
export type Point2D = [number, number]

/** Known strait corridor IDs (extend as corridors are added) */
export type CorridorId = 'hormuz' | 'malacca' | 'lombok' | 'sunda' | 'taiwan' | 'bab-el-mandeb'

/** A strait corridor polygon with classified door edges. */
export interface StraitCorridor {
  /** SVG viewBox dimensions [minX, minY, width, height] */
  viewBox: [number, number, number, number]
  /** Ordered [x, y] vertices of the navigable polygon (closed ring, last !== first) */
  polygon: Point2D[]
  /** Door edges identified by vertex index pairs */
  doors: {
    a: [number, number]
    b: [number, number]
  }
}

/** Shape of data/straits/corridors.json -- keys are validated corridor IDs */
export type CorridorsData = Partial<Record<CorridorId, StraitCorridor>>

/** Derived corridor geometry produced by useCorridor */
export interface CorridorGeometry {
  /** Resampled left wall points in corridor-local coordinates */
  wallLeft: Point2D[]
  /** Resampled right wall points in corridor-local coordinates */
  wallRight: Point2D[]
  /** Centerline points (midpoints of corresponding wall pairs) */
  centerline: Point2D[]
  /** Local corridor width at each centerline point */
  widths: number[]
  /** Total arc length of the centerline in px */
  centerlineLength: number
  /** Cumulative arc length at each centerline sample, normalized to [0, 1] */
  progress: number[]
}
