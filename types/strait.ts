import corridorsRaw from '~/data/straits/corridors.json'

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
// Vessel / particle type (shared by ship simulation & particle system)
// ---------------------------------------------------------------------------

/** Canonical vessel type tuple — single source of truth for runtime + type. */
export const VESSEL_TYPES = ['container', 'dryBulk', 'tanker'] as const

/** Vessel classification used by both the ship simulation and particle system. */
export type VesselType = (typeof VESSEL_TYPES)[number]


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

/** Known strait corridor IDs, derived from corridors.json keys at compile time */
export type CorridorId = keyof typeof corridorsRaw

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

// ---------------------------------------------------------------------------
// Ship simulation types (BF-100)
// ---------------------------------------------------------------------------

// VesselType is now defined above alongside VESSEL_TYPES (single source of truth)

export interface Ship {
  id: number
  /** Progress along centerline, 0..1 */
  progress: number
  /** Direction of travel: 1 = door A -> door B, -1 = door B -> door A */
  direction: 1 | -1
  /** Vessel classification */
  vesselType: VesselType
  /** Lateral offset from centerline, normalized -1..1 (negative = left lane, positive = right lane) */
  laneOffset: number
  /** Speed in progress-units per frame at 60fps (varies by vessel type) */
  speed: number
  /** Resolved position x in corridor-local coordinates */
  x: number
  /** Resolved position y in corridor-local coordinates */
  y: number
  /** Whether this ship slot is currently active (for object pool) */
  active: boolean
  /** Cached segment index for O(1) amortized position resolution */
  segmentIndex: number
}
