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
  historical: Record<string, Record<string, unknown>>
}
