// Generate data/asean/trade-stacked.ts from the canonical BACI cut at
// _data/wrangled/asean-flows-yearly.csv (long format, 2010–2024).
//
// Run on demand:
//   node scripts/build-asean-trade-stacked.mjs
//   npm run gen:trade-stacked
//
// Pipeline: read CSV → keep metric=trade_goods rows for the CHN/USA/EU
// partner groups → sum the two trade directions per
// country_iso3 × partner_group × year into one two-way figure → pivot to
// per-slug StackedAreaData and emit a deterministic TS module whose exported
// shape (SeriesPoint / StackedAreaData / tradeStackedBySlug) is byte-compatible
// with what components/infographics/AseanInfographic.vue and
// components/asean/CountryStackedArea.vue already import.
//
// Values are emitted in USD millions: CountryStackedArea.vue's Y-axis label
// divides the raw stacked value by 1000 to print "$NNNB", so millions in =>
// correct "$250B" out. The source CSV is already in value_usd_millions, so
// this is also the lowest-transformation path. Determinism: fixed slug order,
// fixed CHN/USA/EU key order, years ascending, values rounded once to 1dp,
// no timestamps.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SOURCE = path.join(ROOT, '_data/wrangled/asean-flows-yearly.csv')
const OUT = path.join(ROOT, 'data/asean/trade-stacked.ts')

// Partner groups surfaced in the chart. GBR / JPN / KOR exist in the source
// but the current design only exposes CHN/USA/EU (matches AseanInfographic
// .vue's CHART_PARTNERS). Adding a partner later is a one-line change here.
const CHART_PARTNERS = ['CHN', 'USA', 'EU']

// ISO3 -> country slug, mirroring the COUNTRIES record in
// data/asean/country-tiers.ts. MMR (Myanmar) and the absent Timor-Leste are
// intentionally excluded: not in tradeStackedBySlug, inert tier, no profile.
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

// Display names per slug, mirroring COUNTRIES in country-tiers.ts.
const SLUG_TO_NAME = {
  brunei: 'Brunei',
  cambodia: 'Cambodia',
  indonesia: 'Indonesia',
  laos: 'Laos',
  malaysia: 'Malaysia',
  philippines: 'Philippines',
  singapore: 'Singapore',
  thailand: 'Thailand',
  vietnam: 'Vietnam'
}

// Slug -> ISO3, inverted from ISO3_TO_SLUG so the emitted `country` field
// keeps the current file's ISO3 value.
const SLUG_TO_ISO3 = Object.fromEntries(
  Object.entries(ISO3_TO_SLUG).map(([iso3, slug]) => [slug, iso3])
)

// trade_goods ISO3 codes that legitimately appear in the source but are not
// charted. Anything outside ISO3_TO_SLUG and this set is source drift and
// must fail loudly rather than being silently dropped.
const IGNORE_ISO3 = new Set(['MMR'])

// Fixed slug emission order. Mirrors the current trade-stacked.ts so the
// regenerated diff stays stable and reviewable.
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

const METRIC = 'trade_goods'
const SOURCE_STRING = 'BACI HS07 V202601'
const UNIT_STRING = 'USD millions'
const METRIC_LABEL = 'Two-way trade'
const FIRST_YEAR = 2010
const LAST_YEAR = 2024

// Fixed CSV column indices (header verified: country_iso3,year,partner_group,
// direction,metric,value_usd_millions,source). The file is well-formed with
// no quoted/embedded commas in any field, so a plain split is sufficient.
const COL = {
  iso3: 0,
  year: 1,
  partner: 2,
  direction: 3,
  metric: 4,
  value: 5,
  source: 6
}

function fail(message) {
  console.error(`[build-asean-trade-stacked] ${message}`)
  process.exit(1)
}

function round1(n) {
  return Number(n.toFixed(1))
}

const text = await fs.readFile(SOURCE, 'utf8')
const lines = text.split('\n').filter((line) => line.length > 0)
const header = lines.shift()
if (
  header !==
  'country_iso3,year,partner_group,direction,metric,value_usd_millions,source'
) {
  fail(`unexpected CSV header: ${header}`)
}

// acc[slug][year][partner] = summed value_usd_millions across both directions.
const acc = {}
let contributingRows = 0

for (const line of lines) {
  const f = line.split(',')
  if (f.length !== 7) {
    fail(`expected 7 columns, got ${f.length} in row: ${line}`)
  }
  if (f[COL.metric] !== METRIC) continue

  const partner = f[COL.partner]
  if (!CHART_PARTNERS.includes(partner)) continue

  const iso3 = f[COL.iso3]
  const slug = ISO3_TO_SLUG[iso3]
  if (!slug) {
    if (IGNORE_ISO3.has(iso3)) continue
    fail(
      `unknown trade_goods ISO3 "${iso3}" not in ISO3_TO_SLUG and not in ` +
        `IGNORE_ISO3 — source drift, refusing to silently drop it`
    )
  }

  const year = Number(f[COL.year])
  if (!Number.isInteger(year)) {
    fail(`non-integer year "${f[COL.year]}" in row: ${line}`)
  }
  const value = Number(f[COL.value])
  if (!Number.isFinite(value)) {
    fail(`non-finite value "${f[COL.value]}" in row: ${line}`)
  }

  acc[slug] ??= {}
  acc[slug][year] ??= {}
  acc[slug][year][partner] = (acc[slug][year][partner] ?? 0) + value
  contributingRows += 1
}

// Build per-slug StackedAreaData in the fixed SLUG_ORDER.
const bySlug = {}
for (const slug of SLUG_ORDER) {
  const years = acc[slug]
  if (!years) {
    fail(`no trade_goods rows aggregated for slug "${slug}"`)
  }
  const yearKeys = Object.keys(years)
    .map(Number)
    .sort((a, b) => a - b)

  const expectedYears = []
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y += 1) expectedYears.push(y)
  if (
    yearKeys.length !== expectedYears.length ||
    yearKeys.some((y, i) => y !== expectedYears[i])
  ) {
    fail(
      `slug "${slug}" must have exactly years ${FIRST_YEAR}-${LAST_YEAR}; ` +
        `got [${yearKeys.join(', ')}]`
    )
  }

  const series = expectedYears.map((year) => {
    const point = { year }
    for (const partner of CHART_PARTNERS) {
      const raw = years[year][partner]
      if (!Number.isFinite(raw)) {
        fail(`slug "${slug}" year ${year} missing partner "${partner}"`)
      }
      point[partner] = round1(raw)
    }
    return point
  })

  bySlug[slug] = {
    country: SLUG_TO_ISO3[slug],
    country_name: SLUG_TO_NAME[slug],
    metric: METRIC_LABEL,
    unit: UNIT_STRING,
    source: SOURCE_STRING,
    partners: [...CHART_PARTNERS],
    series
  }
}

// Total contributing source rows must equal
// 9 countries x 3 partners x 2 directions x 15 years.
const expectedRows =
  SLUG_ORDER.length * CHART_PARTNERS.length * 2 * (LAST_YEAR - FIRST_YEAR + 1)
if (contributingRows !== expectedRows) {
  fail(
    `expected ${expectedRows} contributing trade_goods rows ` +
      `(9 countries x 3 partners x 2 directions x 15 years), got ` +
      `${contributingRows}`
  )
}

// Hand-built emitter: keeps bare object keys and per-record field order close
// to the original file so the regenerated diff is reviewable. JSON.stringify
// would quote keys and reorder nothing usefully here.
function emitSeriesPoint(point) {
  const parts = [`year: ${point.year}`]
  for (const partner of CHART_PARTNERS) {
    parts.push(`${partner}: ${point[partner]}`)
  }
  return `      { ${parts.join(', ')} }`
}

function emitRecord(slug, data) {
  const seriesLines = data.series.map(emitSeriesPoint).join(',\n')
  return `  ${slug}: {
    country: '${data.country}',
    country_name: '${data.country_name}',
    metric: '${data.metric}',
    unit: '${data.unit}',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
${seriesLines}
    ]
  }`
}

const recordBlocks = SLUG_ORDER.map((slug) =>
  emitRecord(slug, bySlug[slug])
).join(',\n\n')

const out = `// Stacked-area trade flows per ASEAN country with CHN / USA / EU partners,
// 2010–2024. Annual two-way goods trade in USD millions.
//
// GENERATED FILE — do not hand-edit. Regenerate with:
//   node scripts/build-asean-trade-stacked.mjs   (or: npm run gen:trade-stacked)
//
// Source: _data/wrangled/asean-flows-yearly.csv (BACI HS07 V202601, long
// format). For each country x partner x year the two trade directions are
// summed into one two-way figure. Values are USD millions: the chart's
// Y-axis label divides by 1000 to render "$NNNB".

export interface SeriesPoint {
  year: number
  CHN: number
  USA: number
  EU: number
  [partner: string]: number
}

export interface StackedAreaData {
  country: string
  country_name: string
  metric: string
  unit: string
  source: string
  partners: string[]
  series: SeriesPoint[]
}

const BASE_PARTNERS = ['CHN', 'USA', 'EU']
const BASE_SOURCE = '${SOURCE_STRING}'

export const tradeStackedBySlug: Record<string, StackedAreaData> = {
${recordBlocks}
}
`

await fs.mkdir(path.dirname(OUT), { recursive: true })
await fs.writeFile(OUT, out)

console.log(
  `[build-asean-trade-stacked] wrote ${SLUG_ORDER.length} countries, ` +
    `years ${FIRST_YEAR}-${LAST_YEAR}, ${contributingRows} source rows summed`
)
console.log(
  `[build-asean-trade-stacked] wrote ${path.relative(ROOT, OUT)}`
)
