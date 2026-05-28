// Filter world-atlas countries-50m.json down to ASEAN + neighbors and write
// data/asean/countries.geo.json as a plain GeoJSON FeatureCollection.
//
// Run on demand:
//   node scripts/build-asean-topology.mjs
//
// We convert TopoJSON -> GeoJSON because filtering TopoJSON geometries does
// not shrink the shared `arcs` array. For ~14 features the unshared GeoJSON
// payload is far smaller (~30KB) than the original 697KB topology slice.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as topojsonClient from 'topojson-client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SOURCE = path.join(ROOT, 'node_modules/world-atlas/countries-50m.json')
const OUT = path.join(ROOT, 'data/asean/countries.geo.json')

// Coordinate precision (decimal places). 2dp = ~1.1km at the equator -- ample
// for an infographic that renders at 1280px wide with the whole region in
// frame. Crushes payload roughly 4x with no visible loss.
const COORD_PRECISION = 2

// Tier mapping: ISO 3166-1 numeric (string) -> { tier, slug, expectedName }.
// expectedName disambiguates when world-atlas ships multiple geometries with
// the same id (e.g., Australia + Ashmore & Cartier Is. both at 036).
const COUNTRIES = {
  '764': { tier: 'inScope', slug: 'thailand', expectedName: 'Thailand' },
  '360': { tier: 'inScope', slug: 'indonesia', expectedName: 'Indonesia' },
  '702': { tier: 'inScope', slug: 'singapore', expectedName: 'Singapore' },
  '458': { tier: 'inScope', slug: 'malaysia', expectedName: 'Malaysia' },
  '704': { tier: 'inScope', slug: 'vietnam', expectedName: 'Vietnam' },
  '608': { tier: 'stretch', slug: 'philippines', expectedName: 'Philippines' },
  '096': { tier: 'stretch', slug: 'brunei', expectedName: 'Brunei' },
  '116': { tier: 'stretch', slug: 'cambodia', expectedName: 'Cambodia' },
  '418': { tier: 'stretch', slug: 'laos', expectedName: 'Laos' },
  '104': { tier: 'inert', slug: 'myanmar', expectedName: 'Myanmar' },
  '626': { tier: 'inert', slug: 'timor_leste', expectedName: 'Timor-Leste' },
  '156': { tier: 'context', slug: 'china', expectedName: 'China' },
  '356': { tier: 'context', slug: 'india', expectedName: 'India' },
  '036': { tier: 'context', slug: 'australia', expectedName: 'Australia' }
}

const raw = JSON.parse(await fs.readFile(SOURCE, 'utf8'))
const countriesObject = raw.objects.countries

// Dedupe geometries by (id, expected name) so Australia keeps only the main
// landmass and drops Ashmore & Cartier Is.
const filteredGeometries = countriesObject.geometries.filter((g) => {
  const meta = COUNTRIES[g.id]
  if (!meta) return false
  return g.properties.name === meta.expectedName
})

// Confirm we kept exactly the expected set.
const missing = Object.entries(COUNTRIES).filter(
  ([id, meta]) =>
    !filteredGeometries.find((g) => g.id === id && g.properties.name === meta.expectedName)
)
if (missing.length) {
  console.warn('[build-asean-topology] missing countries:', missing)
}

// Round coordinates in-place to COORD_PRECISION decimal places.
function roundCoords(coords) {
  if (typeof coords[0] === 'number') {
    return coords.map((n) => Number(n.toFixed(COORD_PRECISION)))
  }
  return coords.map(roundCoords)
}

// Convert just our filtered geometries to GeoJSON. topojson-client.feature
// resolves arcs into resolved coordinate rings.
const features = filteredGeometries.map((g) => {
  const meta = COUNTRIES[g.id]
  // Build a temporary single-feature TopoJSON wrapper so feature() can resolve.
  const wrapper = {
    type: 'Topology',
    bbox: raw.bbox,
    transform: raw.transform,
    arcs: raw.arcs,
    objects: { single: g }
  }
  const feature = topojsonClient.feature(wrapper, wrapper.objects.single)
  return {
    type: 'Feature',
    id: g.id,
    properties: {
      id: g.id,
      name: meta.expectedName,
      slug: meta.slug,
      tier: meta.tier
    },
    geometry: {
      ...feature.geometry,
      coordinates: roundCoords(feature.geometry.coordinates)
    }
  }
})

const featureCollection = {
  type: 'FeatureCollection',
  features
}

await fs.mkdir(path.dirname(OUT), { recursive: true })
await fs.writeFile(OUT, JSON.stringify(featureCollection))

const sourceSize = (await fs.stat(SOURCE)).size
const outSize = (await fs.stat(OUT)).size

console.log(
  `[build-asean-topology] kept ${features.length}/${countriesObject.geometries.length} features`
)
console.log(
  `[build-asean-topology] source ${(sourceSize / 1024).toFixed(0)} KB, geojson ${(outSize / 1024).toFixed(0)} KB`
)
console.log(`[build-asean-topology] wrote ${path.relative(ROOT, OUT)}`)
