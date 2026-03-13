import straitsData from '~/data/straits/straits.json'
import type { Strait, StraitHistoricalEntry } from '~/types/strait'

/** All strait entries, typed. */
export const straits = straitsData.straits as Strait[]

/** Compare two straits alphabetically by name. */
function compareByName(a: Strait, b: Strait): number {
  return a.name.localeCompare(b.name, 'en')
}

/** Straits sorted alphabetically by name (stable, computed once at module load). */
export const sortedStraits = [...straits].sort(compareByName)

/**
 * Returns the adjacent strait in alphabetical order.
 * Wraps around: last→first for 'next', first→last for 'prev'.
 * Returns null if currentId is not found or data is empty.
 */
export function getAdjacentStrait(currentId: string, direction: 'next' | 'prev'): Strait | null {
  const idx = sortedStraits.findIndex(s => s.id === currentId)
  if (idx === -1) return null
  const len = sortedStraits.length
  const newIdx = direction === 'next'
    ? (idx + 1) % len
    : (idx - 1 + len) % len
  return sortedStraits[newIdx]
}

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
