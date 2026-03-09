/**
 * Shared formatting utilities for strait data.
 * Used by both StraitDetailPanel (desktop) and StraitMobileDetail (mobile).
 * Pure functions — no Vue dependency.
 */

/** Format a USD value into a compact string (e.g. $5.3T, $120B, $45M). */
export function fmtUsd(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}

/** Format a number with locale-aware thousands separators. */
export function fmtNum(v: number): string {
  return v.toLocaleString('en-US')
}

export interface VesselSegment {
  key: string
  label: string
  value: number
  pct: number
  color: string
}

/** Compute vessel breakdown segments from raw vessel counts. */
export function computeVesselSegments(vessels: {
  container: number
  dryBulk: number
  tanker: number
}): VesselSegment[] {
  const total = vessels.container + vessels.dryBulk + vessels.tanker
  if (total === 0) return []
  return [
    { key: 'container', label: 'Container', value: vessels.container, pct: (vessels.container / total) * 100, color: 'var(--color-cargo-container)' },
    { key: 'dryBulk', label: 'Dry Bulk', value: vessels.dryBulk, pct: (vessels.dryBulk / total) * 100, color: 'var(--color-cargo-dry-bulk)' },
    { key: 'tanker', label: 'Tanker', value: vessels.tanker, pct: (vessels.tanker / total) * 100, color: 'var(--color-cargo-tanker)' },
  ]
}
