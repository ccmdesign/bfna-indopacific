// Generate data/asean/country-hero.generated.ts from the canonical BACI cut
// at _data/wrangled/asean-flows-yearly.csv (long format, 2010–2024).
//
// Run on demand:
//   node scripts/build-asean-country-hero.mjs
//   npm run gen:country-hero
//
// Pipeline: read CSV → keep metric=trade_goods rows for the CHN partner group
// in year 2024 → sum the two trade directions per country_iso3 into one
// two-way figure → round USD millions to USD billions and format "$<n>B"
// → emit a deterministic TS module (slug → { value, label }) consumed by
// data/asean/country-profiles.ts.
//
// Scope: this generator owns ONLY the per-country `hero` block. The
// `paragraph` strings in country-profiles.ts are curated/anchor-traced by
// hand (not machine-generated). `topExports` / `topImports` HS-product
// composition is explicitly deferred — no HS-product source exists; see
// todos/BF-57-defer-top-trade-hs-product-composition.md.
//
// Determinism: fixed slug order (mirrors PROFILES key order in
// country-profiles.ts), single source CSV, both directions summed, rounded
// once at emit, no timestamps. Same input => byte-identical output.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SOURCE = path.join(ROOT, '_data/wrangled/asean-flows-yearly.csv')
const OUT = path.join(ROOT, 'data/asean/country-hero.generated.ts')

// The single partner group the design's hero surfaces. USA / EU / GBR / JPN /
// KOR exist in the source but the current design exposes only the
// China two-way hero. Adding an alternate later is a one-line change here.
const HERO_PARTNER = 'CHN'

// The single year the hero reports.
const HERO_YEAR = 2024

// ISO3 -> country slug, mirroring ISO3_TO_SLUG in
// scripts/build-asean-trade-stacked.mjs and the PROFILES keys in
// data/asean/country-profiles.ts.
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

// trade_goods ISO3 codes that legitimately appear in the source but have no
// profile. Anything outside ISO3_TO_SLUG and this set is source drift and
// must fail loudly rather than being silently dropped.
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

const METRIC = 'trade_goods'
const HERO_LABEL = 'Two-way trade with China, 2024'

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
  console.error(`[build-asean-country-hero] ${message}`)
  process.exit(1)
}

// USD millions -> "$<n>B" string. Mirrors the existing hero style in
// country-profiles.ts: integer billions for >= $10B, one decimal for
// < $10B. Rounding applied once, here, deterministically.
function formatHero(valueUsdMillions) {
  const billions = valueUsdMillions / 1000
  const rounded =
    billions >= 10 ? Math.round(billions) : Number(billions.toFixed(1))
  return `$${rounded}B`
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

// acc[slug] = summed value_usd_millions across both 2024 CHN directions.
const acc = {}
let contributingRows = 0

for (const line of lines) {
  const f = line.split(',')
  if (f.length !== 7) {
    fail(`expected 7 columns, got ${f.length} in row: ${line}`)
  }
  if (f[COL.metric] !== METRIC) continue
  if (f[COL.partner] !== HERO_PARTNER) continue

  const year = Number(f[COL.year])
  if (!Number.isInteger(year)) {
    fail(`non-integer year "${f[COL.year]}" in row: ${line}`)
  }
  if (year !== HERO_YEAR) continue

  const iso3 = f[COL.iso3]
  const slug = ISO3_TO_SLUG[iso3]
  if (!slug) {
    if (IGNORE_ISO3.has(iso3)) continue
    fail(
      `unknown trade_goods ISO3 "${iso3}" not in ISO3_TO_SLUG and not in ` +
        `IGNORE_ISO3 — source drift, refusing to silently drop it`
    )
  }

  const value = Number(f[COL.value])
  if (!Number.isFinite(value)) {
    fail(`non-finite value "${f[COL.value]}" in row: ${line}`)
  }

  acc[slug] = (acc[slug] ?? 0) + value
  contributingRows += 1
}

// Build per-slug hero records in the fixed SLUG_ORDER. Every slug must have
// received exactly its two 2024 CHN direction rows.
const bySlug = {}
for (const slug of SLUG_ORDER) {
  const total = acc[slug]
  if (!Number.isFinite(total)) {
    fail(
      `no 2024 ${HERO_PARTNER} ${METRIC} rows aggregated for slug "${slug}"`
    )
  }
  bySlug[slug] = {
    value: formatHero(total),
    label: HERO_LABEL
  }
}

// Total contributing source rows must equal
// 9 countries x 1 partner x 2 directions x 1 year = 18.
const expectedRows = SLUG_ORDER.length * 2
if (contributingRows !== expectedRows) {
  fail(
    `expected ${expectedRows} contributing ${METRIC} rows ` +
      `(9 countries x 1 partner x 2 directions x 1 year), got ` +
      `${contributingRows}`
  )
}

// Hand-built emitter: keeps bare object keys close to the original style so
// the generated diff is reviewable. JSON.stringify would quote keys.
function emitRecord(slug, rec) {
  return `  ${slug}: { value: '${rec.value}', label: '${rec.label}' }`
}

const recordBlocks = SLUG_ORDER.map((slug) =>
  emitRecord(slug, bySlug[slug])
).join(',\n')

const out = `// Per-ASEAN-country hero figure: two-way goods trade with China, 2024,
// in USD billions, formatted "$<n>B".
//
// GENERATED FILE — do not hand-edit. Regenerate with:
//   node scripts/build-asean-country-hero.mjs   (or: npm run gen:country-hero)
//
// Source: _data/wrangled/asean-flows-yearly.csv (BACI HS07 V202601, long
// format). For each country the two 2024 CHN trade directions are summed
// into one two-way figure, then rounded to USD billions (integer >= $10B,
// one decimal < $10B). Consumed by data/asean/country-profiles.ts (the
// curated paragraph + deferred top-trade arrays live there, not here).

export interface CountryHero {
  value: string
  label: string
}

export const COUNTRY_HERO: Record<string, CountryHero> = {
${recordBlocks}
}
`

await fs.mkdir(path.dirname(OUT), { recursive: true })
await fs.writeFile(OUT, out)

console.log(
  `[build-asean-country-hero] wrote ${SLUG_ORDER.length} countries, ` +
    `year ${HERO_YEAR}, ${contributingRows} source rows summed`
)
for (const slug of SLUG_ORDER) {
  console.log(
    `[build-asean-country-hero]   ${slug}: ${bySlug[slug].value}`
  )
}
console.log(
  `[build-asean-country-hero] wrote ${path.relative(ROOT, OUT)}`
)
