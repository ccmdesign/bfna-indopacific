import straitsData from '~/data/straits/straits.json'
import type { Strait, StraitHistoricalEntry } from '~/types/strait'

/** All strait entries, typed. */
export const straits = straitsData.straits as Strait[]

/** Metadata from the straits JSON. */
export const meta = straitsData.meta

/** Full historical data keyed by year then strait ID. */
export const historical = straitsData.historical as Record<string, Record<string, StraitHistoricalEntry>>

/** The most recent year available in the historical data. */
export const LATEST_YEAR = Object.keys(historical).sort().pop() ?? '2025'

/**
 * Returns historical entries for a single strait, keyed by year.
 * Pure function — safe to call from any component.
 */
export function historicalByStrait(straitId: string): Record<string, StraitHistoricalEntry> {
  const result: Record<string, StraitHistoricalEntry> = {}
  for (const [year, yearData] of Object.entries(historical)) {
    if (yearData[straitId]) result[year] = yearData[straitId]
  }
  return result
}
