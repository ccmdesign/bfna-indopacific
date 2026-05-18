// Generate data/asean/minerals.generated.ts — the ASEAN critical-minerals
// "Green Transition" layer — from two canonical wrangled cuts:
//   _data/wrangled/asean-minerals-production.csv  (USGS MCS2026, 186 rows,
//     4 quoted rows: KOR,"Korea, Republic of",…)
//   _data/wrangled/asean-minerals-flows.csv       (BACI HS07 V202601, 8845
//     rows, comma-clean — verified)
//
// Run on demand:
//   node scripts/build-asean-minerals.mjs
//   npm run gen:minerals
//
// Pipeline:
//   parse both CSVs with ONE shared QUOTE-AWARE line parser (mandatory for the
//     production file's quoted KOR rows; safe for the flows file) →
//   Card A rollup: ASEAN-slug production rows, year = PROD_YEAR (2025, latest),
//     non-empty share_of_world_pct → per-slug production[]: { mineral,
//     sharePct, production, unit } sorted by sharePct desc then mineral name →
//   Card B rollup: asean_country = slug-ISO3, asean_role = exporter,
//     year = FLOW_YEAR (2024), mineral_class = NICKEL_CLASS (D9 — nickel is
//     ~99% of ASEAN mineral export value and the SCOUT §4 two-hop warning is
//     specifically about the nickel chain) → per-slug flows[] grouped by
//     partner_group in PARTNER_ORDER, with valueUsdM + pct, flowsTotalUsdM,
//     flowsGrowthMultiple (from the asean_nickel_exports_growth anchor) →
//   hasMaterialData per slug (D8) →
//   MINERALS_ASEAN: ASEAN-wide concentration context (top producers incl. MMR
//     rare earths, nickel world share, growth multiple) →
//   emit a deterministic TS module.
//
// D8 — "material data" threshold (auditable here, surfaced in the emitted
// header): a country is material for the minerals layer if it has >= 1
// PROD_YEAR production row with a non-empty share_of_world_pct, OR a FLOW_YEAR
// nickel-export-flow total >= MATERIAL_FLOW_USD_M. Verified 2024 nickel-export
// totals bound the cut: IDN 21001.7, PHL 2160.6, then SGP 82.4, VNM 66.8,
// MYS 151.8, THA 8.3, LAO 0.6 (re-export noise, not production). Production
// presence is the decisive signal: IDN/PHL/VNM/MYS/THA/LAO carry 2025
// production rows; BRN/KHM/SGP carry none and have no material nickel flow, so
// they resolve to the designed D2 honest typographic state — NOT a blank or
// zero chart. MATERIAL_FLOW_USD_M = 300 keeps SGP's $82M re-export flow out
// while admitting IDN/PHL; it lives next to the citation constants so the
// editorial cut is reviewable in one place.
//
// MMR (Myanmar / "Burma" in the production file) has no country slug/profile
// (consistent with BF-56/57). It is excluded from MINERALS_BY_SLUG but its
// rare-earths + tin figures still feed MINERALS_ASEAN so the editorial story
// ("Indonesia, the Philippines and Myanmar") stays true. Any ASEAN-region
// ISO3 outside ISO3_TO_SLUG and not in IGNORE_ISO3 is source drift → exit 1.
//
// Anchor reconciliation guard: the Indonesia 2024 nickel-flow rollup MUST
// reconcile to the indonesia_nickel_exports_2024 anchor
// (_data/wrangled/asean-headline-stats.json → thesis_b_minerals): total
// 21001.7, CHN 18973.6, within a 1dp tolerance. A mismatch means a rollup
// bug and fails the generator loudly.
//
// Determinism: fixed slug emission order (mirrors PROFILES key order in
// country-profiles.ts), minerals sorted by world share desc then name,
// partner groups in fixed PARTNER_ORDER, values rounded once at emit, no
// Date.now() / timestamps. Same input => byte-identical output.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PROD_SOURCE = path.join(ROOT, '_data/wrangled/asean-minerals-production.csv')
const FLOW_SOURCE = path.join(ROOT, '_data/wrangled/asean-minerals-flows.csv')
const ANCHORS_SOURCE = path.join(ROOT, '_data/wrangled/asean-headline-stats.json')
const OUT = path.join(ROOT, 'data/asean/minerals.generated.ts')

// ISO3 -> country slug, mirroring ISO3_TO_SLUG in
// scripts/build-asean-trade-stacked.mjs / build-asean-country-hero.mjs and
// the PROFILES keys in data/asean/country-profiles.ts.
const ISO3_TO_SLUG = {
  BRN: 'brunei',
  IDN: 'indonesia',
  KHM: 'cambodia',
  LAO: 'laos',
  MYS: 'malaysia',
  PHL: 'philippines',
  SGP: 'singapore',
  THA: 'thailand',
  VNM: 'vietnam'
}

const SLUG_TO_ISO3 = Object.fromEntries(
  Object.entries(ISO3_TO_SLUG).map(([iso3, slug]) => [slug, iso3])
)

// ASEAN-region ISO3 codes that legitimately appear in the sources but have no
// country slug. MMR (Myanmar; "Burma" in the production file's country_name)
// is folded into MINERALS_ASEAN context but not the per-slug map. Anything
// outside ISO3_TO_SLUG and this set is source drift → fail loud.
const IGNORE_ISO3 = new Set(['MMR'])

// Fixed slug emission order. Mirrors the PROFILES key order in
// country-profiles.ts so the regenerated diff stays stable and reviewable.
const SLUG_ORDER = [
  'indonesia',
  'thailand',
  'singapore',
  'malaysia',
  'vietnam',
  'philippines',
  'brunei',
  'cambodia',
  'laos'
]

// Fixed destination partner-group order for Card B (D4).
const PARTNER_ORDER = ['CHN', 'USA', 'EU', 'JPN', 'KOR', 'OTHER']

const PROD_YEAR = 2025 // latest USGS MCS2026 production year — world-share snapshot
const FLOW_YEAR = 2024 // latest complete BACI flows year
const NICKEL_CLASS = 'Nickel' // D9 — the flow spine

// D8 editorial cut — see header. Lives next to the citation strings so the
// material/non-material decision is auditable in one place.
const MATERIAL_FLOW_USD_M = 300

// Real SCOUT citations — no placeholders (R9).
const PROD_SOURCE_STRING = 'USGS MCS2026'
const FLOW_SOURCE_STRING = 'BACI HS07 V202601'

function fail(message) {
  console.error(`[build-asean-minerals] ${message}`)
  process.exit(1)
}

function round1(n) {
  return Number(n.toFixed(1))
}

function round2(n) {
  return Number(n.toFixed(2))
}

// Shared quote-aware CSV line parser. Handles "..,.." fields (RFC-4180-ish:
// double-quote wrap, "" escape). The production file has 4 such rows
// (KOR,"Korea, Republic of",…); the flows file has none (verified) but uses
// the same parser for safety.
function parseCsvLine(line) {
  const out = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  out.push(field)
  return out
}

async function readCsv(file, expectedHeader) {
  const text = await fs.readFile(file, 'utf8')
  const lines = text.split('\n').filter((l) => l.length > 0)
  const header = lines.shift()
  if (header !== expectedHeader) {
    fail(`unexpected CSV header in ${path.basename(file)}: ${header}`)
  }
  return lines.map(parseCsvLine)
}

// --- Anchors -------------------------------------------------------------
const anchorsText = await fs.readFile(ANCHORS_SOURCE, 'utf8')
const anchors = JSON.parse(anchorsText).thesis_b_minerals
if (!anchors) fail('asean-headline-stats.json missing thesis_b_minerals block')

const ANCHOR_IDN_NICKEL_FLOW = anchors.indonesia_nickel_exports_2024
const ANCHOR_NICKEL_GROWTH = anchors.asean_nickel_exports_growth
const ANCHOR_ASEAN_NICKEL_SHARE = anchors.asean_nickel_share_2025_pct
const ANCHOR_MMR_RARE_EARTHS = anchors.myanmar_rare_earths_2025
if (
  !ANCHOR_IDN_NICKEL_FLOW ||
  !ANCHOR_NICKEL_GROWTH ||
  !ANCHOR_ASEAN_NICKEL_SHARE ||
  !ANCHOR_MMR_RARE_EARTHS
) {
  fail('thesis_b_minerals missing one of the required anchors')
}

const FLOWS_GROWTH_MULTIPLE = ANCHOR_NICKEL_GROWTH.multiple // 5.9

// --- Production (Card A) -------------------------------------------------
const PROD_HEADER =
  'country_iso3,country_name,mineral,year,production,unit,world_total,share_of_world_pct'
const PCOL = {
  iso3: 0,
  name: 1,
  mineral: 2,
  year: 3,
  production: 4,
  unit: 5,
  worldTotal: 6,
  share: 7
}

const prodRows = await readCsv(PROD_SOURCE, PROD_HEADER)

// productionBySlug[slug] = [{ mineral, sharePct, production, unit }]
const productionBySlug = {}
// MMR (rare-earths / tin) feeds the ASEAN-wide concentration context.
const mmrContext = []

for (const f of prodRows) {
  if (f.length !== 8) {
    fail(`expected 8 production columns, got ${f.length}: ${f.join(',')}`)
  }
  const iso3 = f[PCOL.iso3]
  const year = Number(f[PCOL.year])
  if (!Number.isInteger(year)) {
    fail(`non-integer production year "${f[PCOL.year]}"`)
  }
  if (year !== PROD_YEAR) continue

  const shareRaw = f[PCOL.share].trim()
  if (shareRaw === '') continue // no world share -> not a Card A bar

  const slug = ISO3_TO_SLUG[iso3]
  if (!slug) {
    if (IGNORE_ISO3.has(iso3)) {
      // MMR — collect rare-earths / tin for the ASEAN concentration sentence.
      mmrContext.push({
        mineral: f[PCOL.mineral],
        sharePct: round2(Number(shareRaw)),
        production: Number(f[PCOL.production]),
        unit: f[PCOL.unit]
      })
      continue
    }
    // Non-ASEAN producers (AUS, CHN, KOR, etc.) are simply not ASEAN slugs;
    // they are expected in this world dataset and are skipped, not failed.
    if (!/^[A-Z]{3}$/.test(iso3)) {
      fail(`malformed ISO3 "${iso3}" in production row`)
    }
    continue
  }

  const sharePct = Number(shareRaw)
  if (!Number.isFinite(sharePct)) {
    fail(`non-finite share_of_world_pct "${shareRaw}" for ${iso3}`)
  }
  const production = Number(f[PCOL.production])
  if (!Number.isFinite(production)) {
    fail(`non-finite production "${f[PCOL.production]}" for ${iso3}`)
  }

  productionBySlug[slug] ??= []
  productionBySlug[slug].push({
    mineral: f[PCOL.mineral],
    sharePct: round2(sharePct),
    production,
    unit: f[PCOL.unit]
  })
}

// Sort each country's minerals by world share desc, then mineral name asc
// (deterministic tie-break).
for (const slug of Object.keys(productionBySlug)) {
  productionBySlug[slug].sort(
    (a, b) => b.sharePct - a.sharePct || a.mineral.localeCompare(b.mineral)
  )
}

// --- Flows (Card B) ------------------------------------------------------
const FLOW_HEADER =
  'asean_country,year,partner_iso3,partner_group,asean_role,mineral_class,mineral_label,end_use,hs6,value_usd_millions,qty_tons'
const FCOL = {
  country: 0,
  year: 1,
  partnerIso3: 2,
  partnerGroup: 3,
  role: 4,
  mineralClass: 5,
  value: 9
}

const flowRows = await readCsv(FLOW_SOURCE, FLOW_HEADER)

// flowsBySlug[slug] = { CHN: sum, USA: sum, ... }
const flowsBySlug = {}
let aseanNickelExportTotal = 0 // independent ASEAN-wide nickel export check

for (const f of flowRows) {
  if (f.length !== 11) {
    fail(`expected 11 flow columns, got ${f.length}: ${f.join(',')}`)
  }
  if (f[FCOL.role] !== 'exporter') continue
  if (Number(f[FCOL.year]) !== FLOW_YEAR) continue
  if (f[FCOL.mineralClass] !== NICKEL_CLASS) continue

  const iso3 = f[FCOL.country]
  const group = f[FCOL.partnerGroup]
  const value = Number(f[FCOL.value])
  if (!Number.isFinite(value)) {
    fail(`non-finite flow value "${f[FCOL.value]}" for ${iso3}`)
  }
  if (!PARTNER_ORDER.includes(group) && group !== 'GBR') {
    fail(`unknown partner_group "${group}" — source drift`)
  }

  aseanNickelExportTotal += value

  const slug = ISO3_TO_SLUG[iso3]
  if (!slug) {
    if (IGNORE_ISO3.has(iso3)) continue // MMR — into ASEAN total only
    fail(
      `unknown ASEAN flow ISO3 "${iso3}" not in ISO3_TO_SLUG and not in ` +
        `IGNORE_ISO3 — source drift, refusing to silently drop it`
    )
  }

  flowsBySlug[slug] ??= {}
  // GBR has no slot in PARTNER_ORDER (design exposes the canonical 5 +
  // OTHER); fold GBR into OTHER so no value is silently dropped (the
  // per-slug total still reconciles to the anchor total below).
  const bucket = PARTNER_ORDER.includes(group) ? group : 'OTHER'
  flowsBySlug[slug][bucket] = (flowsBySlug[slug][bucket] ?? 0) + value
}

// --- Anchor reconciliation guard ----------------------------------------
// Indonesia 2024 nickel-flow rollup MUST equal the
// indonesia_nickel_exports_2024 anchor within 1dp. The anchor splits GBR
// separately; our rollup folds GBR into OTHER, so reconcile the TOTAL
// (order-independent) and the CHN segment (the dominant, headline number).
const idnFlows = flowsBySlug.indonesia ?? {}
const idnTotal = Object.values(idnFlows).reduce((a, b) => a + b, 0)
const anchorIdnTotal = ANCHOR_IDN_NICKEL_FLOW.total_usd_millions
const anchorIdnChn = ANCHOR_IDN_NICKEL_FLOW.by_partner_group_usd_millions.CHN

if (Math.abs(round1(idnTotal) - round1(anchorIdnTotal)) > 0.1) {
  fail(
    `Indonesia nickel-flow rollup ${round1(idnTotal)} does not reconcile to ` +
      `indonesia_nickel_exports_2024 anchor ${round1(anchorIdnTotal)} — ` +
      `rollup bug`
  )
}
if (Math.abs(round1(idnFlows.CHN ?? 0) - round1(anchorIdnChn)) > 0.1) {
  fail(
    `Indonesia nickel-flow CHN segment ${round1(idnFlows.CHN ?? 0)} does not ` +
      `reconcile to anchor CHN ${round1(anchorIdnChn)} — rollup bug`
  )
}
// Independent ASEAN-wide check vs asean_nickel_exports_growth.2024.
if (
  Math.abs(
    round1(aseanNickelExportTotal) -
      round1(ANCHOR_NICKEL_GROWTH['2024_usd_millions'])
  ) > 0.1
) {
  fail(
    `ASEAN-wide 2024 nickel-export total ${round1(aseanNickelExportTotal)} ` +
      `does not reconcile to asean_nickel_exports_growth anchor ` +
      `${round1(ANCHOR_NICKEL_GROWTH['2024_usd_millions'])}`
  )
}

// --- Assemble per-slug records ------------------------------------------
function buildFlows(slug) {
  const raw = flowsBySlug[slug]
  if (!raw) return { flows: [], total: 0 }
  const total = Object.values(raw).reduce((a, b) => a + b, 0)
  if (total <= 0) return { flows: [], total: 0 }
  const flows = PARTNER_ORDER.map((group) => {
    const v = raw[group] ?? 0
    return {
      partnerGroup: group,
      valueUsdM: round1(v),
      pct: round1((v / total) * 100)
    }
  }).filter((s) => s.valueUsdM > 0)
  return { flows, total: round1(total) }
}

const bySlug = {}
for (const slug of SLUG_ORDER) {
  const production = (productionBySlug[slug] ?? []).map((p) => ({
    mineral: p.mineral,
    sharePct: p.sharePct,
    production: p.production,
    unit: p.unit
  }))
  const { flows, total } = buildFlows(slug)

  // D8: material if it has any PROD_YEAR world-share production row OR a
  // FLOW_YEAR nickel-export total >= MATERIAL_FLOW_USD_M.
  const hasMaterialData =
    production.length > 0 || total >= MATERIAL_FLOW_USD_M

  bySlug[slug] = {
    iso3: SLUG_TO_ISO3[slug],
    production,
    flows,
    flowsTotalUsdM: total,
    flowsGrowthMultiple: FLOWS_GROWTH_MULTIPLE,
    hasMaterialData
  }
}

// Every slug must be present (greenfield contract — no silent gaps).
for (const slug of SLUG_ORDER) {
  if (!bySlug[slug]) fail(`slug "${slug}" missing from emitted map`)
}

// --- ASEAN-wide context (D2 / D5 framing) -------------------------------
// Top ASEAN producers by 2025 world share for the concentration sentence.
const topProducers = [
  { name: 'Indonesia', mineral: 'Nickel' },
  { name: 'the Philippines', mineral: 'Nickel' },
  { name: 'Myanmar', mineral: 'Rare Earths' }
]
const mmrRareEarths = mmrContext.find((m) => m.mineral === 'Rare Earths')
if (!mmrRareEarths) {
  fail('expected an MMR Rare Earths 2025 production row for ASEAN context')
}

const aseanWide = {
  nickelWorldSharePct: round2(ANCHOR_ASEAN_NICKEL_SHARE.value), // 73.59
  nickelGrowthMultiple: FLOWS_GROWTH_MULTIPLE, // 5.9
  myanmarRareEarthsSharePct: mmrRareEarths.sharePct, // 5.64
  concentrationSentence:
    "ASEAN's mineral leverage concentrates in Indonesia, the Philippines and Myanmar.",
  topProducers
}

// --- Deterministic emitter ----------------------------------------------
function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function emitMineralShare(p) {
  return (
    `      { mineral: '${esc(p.mineral)}', sharePct: ${p.sharePct}, ` +
    `production: ${p.production}, unit: '${esc(p.unit)}' }`
  )
}

function emitFlowSegment(s) {
  return (
    `      { partnerGroup: '${s.partnerGroup}', ` +
    `valueUsdM: ${s.valueUsdM}, pct: ${s.pct} }`
  )
}

function emitRecord(slug, d) {
  const prod = d.production.length
    ? `[\n${d.production.map(emitMineralShare).join(',\n')}\n    ]`
    : '[]'
  const fl = d.flows.length
    ? `[\n${d.flows.map(emitFlowSegment).join(',\n')}\n    ]`
    : '[]'
  return `  ${slug}: {
    iso3: '${d.iso3}',
    hasMaterialData: ${d.hasMaterialData},
    production: ${prod},
    flows: ${fl},
    flowsTotalUsdM: ${d.flowsTotalUsdM},
    flowsGrowthMultiple: ${d.flowsGrowthMultiple}
  }`
}

const recordBlocks = SLUG_ORDER.map((slug) =>
  emitRecord(slug, bySlug[slug])
).join(',\n\n')

const topProducerBlocks = aseanWide.topProducers
  .map((p) => `  { name: '${esc(p.name)}', mineral: '${esc(p.mineral)}' }`)
  .join(',\n')

const out = `// ASEAN critical-minerals "Green Transition" layer — per-active-country
// world-share production (Card A) + two-hop nickel-flow split (Card B) +
// the ASEAN-wide concentration context.
//
// GENERATED FILE — do not hand-edit. Regenerate with:
//   node scripts/build-asean-minerals.mjs   (or: npm run gen:minerals)
//
// Sources & provenance:
//   production  — _data/wrangled/asean-minerals-production.csv (${PROD_SOURCE_STRING}),
//                 year ${PROD_YEAR}, rows with a non-empty share_of_world_pct.
//   flows       — _data/wrangled/asean-minerals-flows.csv (${FLOW_SOURCE_STRING}),
//                 asean_role=exporter, year ${FLOW_YEAR}, mineral_class=${NICKEL_CLASS}
//                 (nickel is ~99% of ASEAN mineral export value; the SCOUT §4
//                 two-hop warning is specifically about the nickel chain).
//   growth      — asean_nickel_exports_growth anchor (multiple ${FLOWS_GROWTH_MULTIPLE},
//                 _data/wrangled/asean-headline-stats.json → thesis_b_minerals).
//
// Anchor reconciliation (verified at generate time, fails loud on drift):
//   Indonesia ${FLOW_YEAR} nickel-flow total $${round1(anchorIdnTotal)}M /
//   CHN $${round1(anchorIdnChn)}M ≙ indonesia_nickel_exports_2024.
//   ASEAN-wide ${FLOW_YEAR} nickel-export total ≙ asean_nickel_exports_growth.
//
// D8 — "material data" cut: a country is material if it has >= 1 ${PROD_YEAR}
// production row with a non-empty world share OR a ${FLOW_YEAR} nickel-export
// total >= $${MATERIAL_FLOW_USD_M}M. IDN/PHL/VNM/MYS/THA/LAO are material via
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
  /** Active country's % share of ${PROD_YEAR} world mine production. */
  sharePct: number
  /** Absolute ${PROD_YEAR} production in \`unit\`. */
  production: number
  /** USGS unit string for \`production\` (e.g. "metric tons"). */
  unit: string
}

/** One destination partner group for the active country's nickel exports. */
export interface FlowSegment {
  /** Partner group: CHN | USA | EU | JPN | KOR | OTHER. */
  partnerGroup: string
  /** ${FLOW_YEAR} nickel-class export value to this group, USD millions. */
  valueUsdM: number
  /** Share of the country's total ${FLOW_YEAR} nickel exports, %. */
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
  /** Card B — ${FLOW_YEAR} nickel-export split by destination. May be empty. */
  flows: FlowSegment[]
  /** Total ${FLOW_YEAR} nickel-class export value, USD millions. */
  flowsTotalUsdM: number
  /** ASEAN nickel-export growth multiple since 2010 (×${FLOWS_GROWTH_MULTIPLE}). */
  flowsGrowthMultiple: number
}

export interface AseanMineralsContext {
  /** Indonesia + Philippines share of ${PROD_YEAR} world nickel (only ASEAN producers). */
  nickelWorldSharePct: number
  /** ASEAN nickel-export growth multiple since 2010. */
  nickelGrowthMultiple: number
  /** Myanmar's ${PROD_YEAR} world rare-earths share (no country slug). */
  myanmarRareEarthsSharePct: number
  /** Editorial concentration line for the D2 honest state. */
  concentrationSentence: string
  topProducers: { name: string; mineral: string }[]
}

export const PROD_SOURCE_LABEL = '${PROD_SOURCE_STRING}'
export const FLOW_SOURCE_LABEL = '${FLOW_SOURCE_STRING}'

export const MINERALS_BY_SLUG: Record<string, CountryMinerals> = {
${recordBlocks}
}

export const MINERALS_ASEAN: AseanMineralsContext = {
  nickelWorldSharePct: ${aseanWide.nickelWorldSharePct},
  nickelGrowthMultiple: ${aseanWide.nickelGrowthMultiple},
  myanmarRareEarthsSharePct: ${aseanWide.myanmarRareEarthsSharePct},
  concentrationSentence: '${esc(aseanWide.concentrationSentence)}',
  topProducers: [
${topProducerBlocks}
  ]
}
`

await fs.mkdir(path.dirname(OUT), { recursive: true })
await fs.writeFile(OUT, out)

const materialCount = SLUG_ORDER.filter(
  (s) => bySlug[s].hasMaterialData
).length
console.log(
  `[build-asean-minerals] wrote ${SLUG_ORDER.length} slugs ` +
    `(${materialCount} material, ${SLUG_ORDER.length - materialCount} honest-state), ` +
    `prod year ${PROD_YEAR}, flow year ${FLOW_YEAR}`
)
console.log(
  `[build-asean-minerals] IDN nickel-flow total $${round1(idnTotal)}M / ` +
    `CHN $${round1(idnFlows.CHN ?? 0)}M — reconciled to anchor`
)
console.log(`[build-asean-minerals] wrote ${path.relative(ROOT, OUT)}`)
