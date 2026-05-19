// ASEAN critical-minerals "Green Transition" layer — per-active-country
// world-share production (Card A) + two-hop nickel-flow split (Card B) +
// the ASEAN-wide concentration context.
//
// GENERATED FILE — do not hand-edit. Regenerate with:
//   node scripts/build-asean-minerals.mjs   (or: npm run gen:minerals)
//
// Sources & provenance:
//   production  — _data/wrangled/asean-minerals-production.csv (USGS MCS2026),
//                 year 2025, rows with a non-empty share_of_world_pct.
//   flows       — _data/wrangled/asean-minerals-flows.csv (BACI HS07 V202601),
//                 asean_role=exporter, year 2024, mineral_class=Nickel
//                 (nickel is ~99% of ASEAN mineral export value; the SCOUT §4
//                 two-hop warning is specifically about the nickel chain).
//   growth      — asean_nickel_exports_growth anchor (multiple 5.9,
//                 _data/wrangled/asean-headline-stats.json → thesis_b_minerals).
//
// Anchor reconciliation (verified at generate time, fails loud on drift):
//   Indonesia 2024 nickel-flow total $21001.7M /
//   CHN $18973.6M ≙ indonesia_nickel_exports_2024.
//   ASEAN-wide 2024 nickel-export total ≙ asean_nickel_exports_growth.
//
// D8 — "material data" cut: a country is material if it has >= 1 2025
// production row with a non-empty world share OR a 2024 nickel-export
// total >= $300M. IDN/PHL/VNM/MYS/THA/LAO are material via
// production; BRN/KHM/SGP carry no production and no material nickel flow and
// resolve hasMaterialData=false → the designed honest typographic state
// (NOT a blank or zero chart). Myanmar (MMR / "Burma") has no country slug;
// its rare-earths figure feeds MINERALS_ASEAN context, not a per-slug card.
//
// Determinism: fixed slug order (mirrors PROFILES in country-profiles.ts),
// minerals sorted by world share desc then name, partner groups in fixed
// CHN/USA/EU/JPN/KOR/OTHER order (GBR folded into OTHER), values rounded once
// at emit, no timestamps. Same input => byte-identical output.

/** One critical mineral for the active country (Card A — world-share bar). */
export interface MineralShare {
  /** Mineral name as reported by USGS MCS2026 (e.g. "Nickel"). */
  mineral: string
  /** Active country's % share of 2025 world mine production. */
  sharePct: number
  /** Absolute 2025 production in `unit`. */
  production: number
  /** USGS unit string for `production` (e.g. "metric tons"). */
  unit: string
}

/** One destination partner group for the active country's nickel exports. */
export interface FlowSegment {
  /** Partner group: CHN | USA | EU | JPN | KOR | OTHER. */
  partnerGroup: string
  /** 2024 nickel-class export value to this group, USD millions. */
  valueUsdM: number
  /** Share of the country's total 2024 nickel exports, %. */
  pct: number
}

export interface CountryMinerals {
  iso3: string
  /**
   * False for countries with no material critical-minerals footprint
   * (Brunei / Cambodia / Singapore). The components render the designed
   * honest typographic state for these — never a blank or zero chart.
   */
  hasMaterialData: boolean
  /** Card A — world-share bars, sorted by share desc. May be empty. */
  production: MineralShare[]
  /** Card B — 2024 nickel-export split by destination. May be empty. */
  flows: FlowSegment[]
  /** Total 2024 nickel-class export value, USD millions. */
  flowsTotalUsdM: number
  /** ASEAN nickel-export growth multiple since 2010 (×5.9). */
  flowsGrowthMultiple: number
}

export interface AseanMineralsContext {
  /** Indonesia + Philippines share of 2025 world nickel (only ASEAN producers). */
  nickelWorldSharePct: number
  /** ASEAN nickel-export growth multiple since 2010. */
  nickelGrowthMultiple: number
  /** Myanmar's 2025 world rare-earths share (no country slug). */
  myanmarRareEarthsSharePct: number
  /** Editorial concentration line for the D2 honest state. */
  concentrationSentence: string
  topProducers: { name: string; mineral: string }[]
}

export const PROD_SOURCE_LABEL = 'USGS MCS2026'
export const FLOW_SOURCE_LABEL = 'BACI HS07 V202601'

export const MINERALS_BY_SLUG: Record<string, CountryMinerals> = {
  indonesia: {
    iso3: 'IDN',
    hasMaterialData: true,
    production: [
      { mineral: 'Nickel', sharePct: 66.67, production: 2600000, unit: 'metric tons' },
      { mineral: 'Tin', sharePct: 21.03, production: 61000, unit: 'metric tons' },
      { mineral: 'Cobalt', sharePct: 14.19, production: 44000, unit: 'metric tons' },
      { mineral: 'Copper', sharePct: 3.09, production: 710, unit: 'thousand metric tons' },
      { mineral: 'Bauxite', sharePct: 2.27, production: 10000, unit: 'thousand metric dry tons' }
    ],
    flows: [
      { partnerGroup: 'CHN', valueUsdM: 18973.6, pct: 90.3 },
      { partnerGroup: 'USA', valueUsdM: 15.6, pct: 0.1 },
      { partnerGroup: 'EU', valueUsdM: 275.5, pct: 1.3 },
      { partnerGroup: 'JPN', valueUsdM: 1059.4, pct: 5 },
      { partnerGroup: 'KOR', valueUsdM: 282.2, pct: 1.3 },
      { partnerGroup: 'OTHER', valueUsdM: 395.4, pct: 1.9 }
    ],
    flowsTotalUsdM: 21001.7,
    flowsGrowthMultiple: 5.9
  },

  thailand: {
    iso3: 'THA',
    hasMaterialData: true,
    production: [
      { mineral: 'Rare Earths', sharePct: 1.23, production: 4800, unit: 'metric tons' }
    ],
    flows: [
      { partnerGroup: 'CHN', valueUsdM: 8.1, pct: 97.8 },
      { partnerGroup: 'EU', valueUsdM: 0.2, pct: 2.1 }
    ],
    flowsTotalUsdM: 8.3,
    flowsGrowthMultiple: 5.9
  },

  singapore: {
    iso3: 'SGP',
    hasMaterialData: false,
    production: [],
    flows: [
      { partnerGroup: 'CHN', valueUsdM: 61.7, pct: 74.9 },
      { partnerGroup: 'USA', valueUsdM: 0.3, pct: 0.4 },
      { partnerGroup: 'EU', valueUsdM: 9.1, pct: 11.1 },
      { partnerGroup: 'JPN', valueUsdM: 0.6, pct: 0.7 },
      { partnerGroup: 'KOR', valueUsdM: 7.6, pct: 9.3 },
      { partnerGroup: 'OTHER', valueUsdM: 3, pct: 3.6 }
    ],
    flowsTotalUsdM: 82.4,
    flowsGrowthMultiple: 5.9
  },

  malaysia: {
    iso3: 'MYS',
    hasMaterialData: true,
    production: [
      { mineral: 'Tin', sharePct: 1.72, production: 5000, unit: 'metric tons' },
      { mineral: 'Rare Earths', sharePct: 0.03, production: 110, unit: 'metric tons' }
    ],
    flows: [
      { partnerGroup: 'CHN', valueUsdM: 102.8, pct: 67.7 },
      { partnerGroup: 'USA', valueUsdM: 0.2, pct: 0.1 },
      { partnerGroup: 'EU', valueUsdM: 19.3, pct: 12.7 },
      { partnerGroup: 'JPN', valueUsdM: 21.7, pct: 14.3 },
      { partnerGroup: 'KOR', valueUsdM: 7.8, pct: 5.1 }
    ],
    flowsTotalUsdM: 151.8,
    flowsGrowthMultiple: 5.9
  },

  vietnam: {
    iso3: 'VNM',
    hasMaterialData: true,
    production: [
      { mineral: 'Tin', sharePct: 3.79, production: 11000, unit: 'metric tons' },
      { mineral: 'Bauxite', sharePct: 0.86, production: 3800, unit: 'thousand metric dry tons' },
      { mineral: 'Rare Earths', sharePct: 0.04, production: 150, unit: 'metric tons' },
      { mineral: 'Graphite (Natural)', sharePct: 0.03, production: 500, unit: 'metric tons' }
    ],
    flows: [
      { partnerGroup: 'CHN', valueUsdM: 65.1, pct: 97.4 },
      { partnerGroup: 'KOR', valueUsdM: 1.7, pct: 2.6 }
    ],
    flowsTotalUsdM: 66.8,
    flowsGrowthMultiple: 5.9
  },

  philippines: {
    iso3: 'PHL',
    hasMaterialData: true,
    production: [
      { mineral: 'Nickel', sharePct: 6.92, production: 270000, unit: 'metric tons' },
      { mineral: 'Cobalt', sharePct: 1.19, production: 3700, unit: 'metric tons' }
    ],
    flows: [
      { partnerGroup: 'CHN', valueUsdM: 1551.9, pct: 71.8 },
      { partnerGroup: 'EU', valueUsdM: 0.4, pct: 0 },
      { partnerGroup: 'JPN', valueUsdM: 608.1, pct: 28.1 },
      { partnerGroup: 'KOR', valueUsdM: 0.2, pct: 0 }
    ],
    flowsTotalUsdM: 2160.6,
    flowsGrowthMultiple: 5.9
  },

  brunei: {
    iso3: 'BRN',
    hasMaterialData: false,
    production: [],
    flows: [],
    flowsTotalUsdM: 0,
    flowsGrowthMultiple: 5.9
  },

  cambodia: {
    iso3: 'KHM',
    hasMaterialData: false,
    production: [],
    flows: [],
    flowsTotalUsdM: 0,
    flowsGrowthMultiple: 5.9
  },

  laos: {
    iso3: 'LAO',
    hasMaterialData: true,
    production: [
      { mineral: 'Tin', sharePct: 0.62, production: 1800, unit: 'metric tons' }
    ],
    flows: [
      { partnerGroup: 'KOR', valueUsdM: 0.6, pct: 100 }
    ],
    flowsTotalUsdM: 0.6,
    flowsGrowthMultiple: 5.9
  }
}

export const MINERALS_ASEAN: AseanMineralsContext = {
  nickelWorldSharePct: 73.59,
  nickelGrowthMultiple: 5.9,
  myanmarRareEarthsSharePct: 5.64,
  concentrationSentence: 'ASEAN\'s mineral leverage concentrates in Indonesia, the Philippines and Myanmar.',
  topProducers: [
  { name: 'Indonesia', mineral: 'Nickel' },
  { name: 'the Philippines', mineral: 'Nickel' },
  { name: 'Myanmar', mineral: 'Rare Earths' }
  ]
}
