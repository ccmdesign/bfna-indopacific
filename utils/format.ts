/**
 * Shared formatting utilities for strait panel components.
 * Extracted to eliminate duplication across StraitDetailPanel,
 * StraitQuantPanel, and StraitQualPanel.
 */

/** Format a USD value as a compact string (e.g., $1.2T, $500B, $12M) */
export function fmtUsd(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}

/** Format a number with locale-specific thousand separators */
export function fmtNum(v: number): string {
  return v.toLocaleString('en-US')
}

/** Vessel breakdown segment for stacked bar charts */
export interface VesselSegment {
  key: string
  label: string
  value: number
  pct: number
  color: string
}

/** Compute vessel breakdown segments from historical year data */
export function computeVesselSegments(
  vessels: { container: number; dryBulk: number; tanker: number } | undefined,
): VesselSegment[] {
  if (!vessels) return []
  const total = vessels.container + vessels.dryBulk + vessels.tanker
  if (total === 0) return []
  return [
    { key: 'container', label: 'Container', value: vessels.container, pct: (vessels.container / total) * 100, color: 'var(--color-cargo-container)' },
    { key: 'dryBulk', label: 'Dry Bulk', value: vessels.dryBulk, pct: (vessels.dryBulk / total) * 100, color: 'var(--color-cargo-dry-bulk)' },
    { key: 'tanker', label: 'Tanker', value: vessels.tanker, pct: (vessels.tanker / total) * 100, color: 'var(--color-cargo-tanker)' },
  ]
}
