// Placeholder country profiles for v1 layout demo.
// Real numbers wire from _process/asean/data-wrangled/*.csv after Marshall +
// Georgia lock the thesis (target: May 2026). Until then these stubs let the
// layout render fully and stay thesis-neutral.
//
// Radar values are normalised 0..1 across five dimensions.
// Share values sum to 100 across {us, cn, eu, other}.

export interface ShareEntry {
  label: string
  us: number
  cn: number
  eu: number
  other: number
}

export interface RadarLayer {
  label: string
  values: number[]
}

export interface CountryProfile {
  slug: string
  subhead: string
  bigMetric: { value: string; label: string }
  bigSecondary: { value: string; label: string }
  shares: ShareEntry[]
  radar: { axes: string[]; layers: RadarLayer[] }
  caption: string
}

export const RADAR_AXES = ['Trade', 'Raw Materials', 'Alignment', 'Investment', 'Defense']

export const PROFILES: Record<string, CountryProfile> = {
  indonesia: {
    slug: 'indonesia',
    subhead: 'Placeholder profile. Real data wires May 2026.',
    bigMetric: { value: '$135B', label: 'Two-way trade with China, 2025' },
    bigSecondary: { value: '$38B', label: 'With United States' },
    shares: [
      { label: 'Trade', us: 11, cn: 27, eu: 9, other: 53 },
      { label: 'FDI inflow', us: 8, cn: 22, eu: 14, other: 56 },
      { label: 'Defense partners', us: 41, cn: 12, eu: 18, other: 29 }
    ],
    radar: {
      axes: RADAR_AXES,
      layers: [
        { label: '2020', values: [0.55, 0.62, 0.48, 0.42, 0.38] },
        { label: '2025', values: [0.78, 0.88, 0.52, 0.61, 0.55] }
      ]
    },
    caption:
      'Placeholder caption. The narrative for each country will be commissioned alongside the May 2026 data drop.'
  },
  thailand: {
    slug: 'thailand',
    subhead: 'Placeholder profile. Real data wires May 2026.',
    bigMetric: { value: '$104B', label: 'Two-way trade with China, 2025' },
    bigSecondary: { value: '$62B', label: 'With United States' },
    shares: [
      { label: 'Trade', us: 14, cn: 23, eu: 10, other: 53 },
      { label: 'FDI inflow', us: 17, cn: 18, eu: 16, other: 49 },
      { label: 'Defense partners', us: 52, cn: 11, eu: 14, other: 23 }
    ],
    radar: {
      axes: RADAR_AXES,
      layers: [
        { label: '2020', values: [0.48, 0.36, 0.55, 0.5, 0.45] },
        { label: '2025', values: [0.66, 0.42, 0.58, 0.6, 0.5] }
      ]
    },
    caption: 'Placeholder caption.'
  },
  singapore: {
    slug: 'singapore',
    subhead: 'Placeholder profile. Real data wires May 2026.',
    bigMetric: { value: '$118B', label: 'Two-way trade with China, 2025' },
    bigSecondary: { value: '$96B', label: 'With United States' },
    shares: [
      { label: 'Trade', us: 18, cn: 22, eu: 14, other: 46 },
      { label: 'FDI inflow', us: 28, cn: 17, eu: 22, other: 33 },
      { label: 'Defense partners', us: 60, cn: 8, eu: 18, other: 14 }
    ],
    radar: {
      axes: RADAR_AXES,
      layers: [
        { label: '2020', values: [0.6, 0.2, 0.65, 0.7, 0.55] },
        { label: '2025', values: [0.72, 0.22, 0.7, 0.82, 0.58] }
      ]
    },
    caption: 'Placeholder caption.'
  },
  malaysia: {
    slug: 'malaysia',
    subhead: 'Placeholder profile. Real data wires May 2026.',
    bigMetric: { value: '$98B', label: 'Two-way trade with China, 2025' },
    bigSecondary: { value: '$45B', label: 'With United States' },
    shares: [
      { label: 'Trade', us: 12, cn: 25, eu: 10, other: 53 },
      { label: 'FDI inflow', us: 14, cn: 19, eu: 18, other: 49 },
      { label: 'Defense partners', us: 38, cn: 14, eu: 12, other: 36 }
    ],
    radar: {
      axes: RADAR_AXES,
      layers: [
        { label: '2020', values: [0.5, 0.55, 0.46, 0.52, 0.42] },
        { label: '2025', values: [0.7, 0.62, 0.5, 0.62, 0.46] }
      ]
    },
    caption: 'Placeholder caption.'
  },
  vietnam: {
    slug: 'vietnam',
    subhead: 'Placeholder profile. Real data wires May 2026.',
    bigMetric: { value: '$172B', label: 'Two-way trade with China, 2025' },
    bigSecondary: { value: '$124B', label: 'With United States' },
    shares: [
      { label: 'Trade', us: 26, cn: 31, eu: 13, other: 30 },
      { label: 'FDI inflow', us: 12, cn: 26, eu: 11, other: 51 },
      { label: 'Defense partners', us: 22, cn: 18, eu: 12, other: 48 }
    ],
    radar: {
      axes: RADAR_AXES,
      layers: [
        { label: '2020', values: [0.62, 0.5, 0.42, 0.48, 0.4] },
        { label: '2025', values: [0.85, 0.6, 0.5, 0.7, 0.5] }
      ]
    },
    caption: 'Placeholder caption.'
  },

  // --- Stretch-tier countries (placeholder stubs) ---
  // Share rows: us + cn + eu + other === 100 for every row.
  // Radar values: 0..1 range, 5 values per layer.

  philippines: {
    slug: 'philippines',
    subhead: 'Placeholder profile. Real data wires May 2026.',
    bigMetric: { value: '$52B', label: 'Two-way trade with China, 2025' },
    bigSecondary: { value: '$24B', label: 'With United States' },
    shares: [
      { label: 'Trade', us: 15, cn: 24, eu: 10, other: 51 },
      { label: 'FDI inflow', us: 18, cn: 15, eu: 12, other: 55 },
      { label: 'Defense partners', us: 55, cn: 5, eu: 10, other: 30 }
    ],
    radar: {
      axes: RADAR_AXES,
      layers: [
        { label: '2020', values: [0.42, 0.3, 0.6, 0.35, 0.52] },
        { label: '2025', values: [0.55, 0.35, 0.62, 0.45, 0.58] }
      ]
    },
    caption:
      'Placeholder caption. The narrative for each country will be commissioned alongside the May 2026 data drop.'
  },
  brunei: {
    slug: 'brunei',
    subhead: 'Placeholder profile. Real data wires May 2026.',
    bigMetric: { value: '$2.8B', label: 'Two-way trade with China, 2025' },
    bigSecondary: { value: '$0.4B', label: 'With United States' },
    shares: [
      { label: 'Trade', us: 4, cn: 28, eu: 6, other: 62 },
      { label: 'FDI inflow', us: 6, cn: 20, eu: 8, other: 66 },
      { label: 'Defense partners', us: 30, cn: 8, eu: 22, other: 40 }
    ],
    radar: {
      axes: RADAR_AXES,
      layers: [
        { label: '2020', values: [0.18, 0.55, 0.35, 0.2, 0.28] },
        { label: '2025', values: [0.22, 0.6, 0.38, 0.25, 0.32] }
      ]
    },
    caption:
      'Placeholder caption. The narrative for each country will be commissioned alongside the May 2026 data drop.'
  },
  cambodia: {
    slug: 'cambodia',
    subhead: 'Placeholder profile. Real data wires May 2026.',
    bigMetric: { value: '$14B', label: 'Two-way trade with China, 2025' },
    bigSecondary: { value: '$9B', label: 'With United States' },
    shares: [
      { label: 'Trade', us: 18, cn: 32, eu: 12, other: 38 },
      { label: 'FDI inflow', us: 5, cn: 40, eu: 8, other: 47 },
      { label: 'Defense partners', us: 10, cn: 35, eu: 8, other: 47 }
    ],
    radar: {
      axes: RADAR_AXES,
      layers: [
        { label: '2020', values: [0.28, 0.2, 0.3, 0.25, 0.18] },
        { label: '2025', values: [0.38, 0.25, 0.32, 0.35, 0.22] }
      ]
    },
    caption:
      'Placeholder caption. The narrative for each country will be commissioned alongside the May 2026 data drop.'
  },
  laos: {
    slug: 'laos',
    subhead: 'Placeholder profile. Real data wires May 2026.',
    bigMetric: { value: '$8B', label: 'Two-way trade with China, 2025' },
    bigSecondary: { value: '$0.2B', label: 'With United States' },
    shares: [
      { label: 'Trade', us: 3, cn: 38, eu: 5, other: 54 },
      { label: 'FDI inflow', us: 2, cn: 45, eu: 4, other: 49 },
      { label: 'Defense partners', us: 8, cn: 30, eu: 5, other: 57 }
    ],
    radar: {
      axes: RADAR_AXES,
      layers: [
        { label: '2020', values: [0.22, 0.15, 0.25, 0.2, 0.12] },
        { label: '2025', values: [0.32, 0.2, 0.28, 0.3, 0.15] }
      ]
    },
    caption:
      'Placeholder caption. The narrative for each country will be commissioned alongside the May 2026 data drop.'
  }
}

export function profileBySlug(slug: string): CountryProfile | undefined {
  return PROFILES[slug]
}
