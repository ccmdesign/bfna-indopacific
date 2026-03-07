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
