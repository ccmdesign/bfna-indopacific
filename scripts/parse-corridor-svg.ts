#!/usr/bin/env npx tsx
/**
 * One-shot SVG parse script: extracts corridor polygon and door data
 * from an Illustrator-exported SVG and writes corridors.json.
 *
 * Usage:
 *   npx tsx scripts/parse-corridor-svg.ts [straitId] [svgPath]
 *
 * Defaults:
 *   straitId = "hormuz"
 *   svgPath  = "assets/images/hormuz-polygon-01.svg"
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ---------------------------------------------------------------------------
// Types (inline to avoid import path issues when run standalone)
// ---------------------------------------------------------------------------

type Point2D = [number, number]

interface StraitCorridor {
  viewBox: [number, number, number, number]
  polygon: Point2D[]
  doors: {
    a: [number, number]
    b: [number, number]
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePointsAttribute(attr: string): Point2D[] {
  // SVG points attribute: space-separated "x,y" pairs OR space-separated x y values
  const tokens = attr.trim().split(/[\s,]+/).map(Number)
  const points: Point2D[] = []
  for (let i = 0; i < tokens.length - 1; i += 2) {
    points.push([tokens[i], tokens[i + 1]])
  }
  return points
}

function findNearestVertex(
  target: Point2D,
  vertices: Point2D[],
): { index: number; distance: number } {
  let minDist = Infinity
  let minIdx = -1
  for (let i = 0; i < vertices.length; i++) {
    const dx = target[0] - vertices[i][0]
    const dy = target[1] - vertices[i][1]
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < minDist) {
      minDist = dist
      minIdx = i
    }
  }
  return { index: minIdx, distance: minDist }
}

function signedArea(polygon: Point2D[]): number {
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    area += polygon[i][0] * polygon[j][1]
    area -= polygon[j][0] * polygon[i][1]
  }
  return area / 2
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const straitId = process.argv[2] || 'hormuz'
const svgRelPath = process.argv[3] || 'assets/images/hormuz-polygon-01.svg'
const projectRoot = resolve(import.meta.dirname || __dirname, '..')
const svgPath = resolve(projectRoot, svgRelPath)
const outputPath = resolve(projectRoot, 'data/straits/corridors.json')

console.log(`Parsing corridor SVG: ${svgPath}`)
console.log(`Strait ID: ${straitId}`)

if (!existsSync(svgPath)) {
  console.error(`SVG file not found: ${svgPath}`)
  process.exit(1)
}

const svg = readFileSync(svgPath, 'utf-8')

// Extract viewBox
const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
if (!viewBoxMatch) throw new Error('No viewBox found in SVG')
const viewBox = viewBoxMatch[1].split(/\s+/).map(Number) as [number, number, number, number]
console.log(`ViewBox: ${viewBox.join(', ')}`)

// Extract polygon points (class="st2")
const polygonMatch = svg.match(/<polygon[^>]*class="st2"[^>]*points="([^"]+)"/)
if (!polygonMatch) throw new Error('No <polygon class="st2"> found in SVG')
const rawPolygon = parsePointsAttribute(polygonMatch[1])
console.log(`Raw polygon vertices: ${rawPolygon.length}`)

// Strip closing duplicate vertex (last === first)
let polygon = rawPolygon
const first = polygon[0]
const last = polygon[polygon.length - 1]
const closingDist = Math.sqrt(
  (first[0] - last[0]) ** 2 + (first[1] - last[1]) ** 2,
)
if (closingDist < 0.5) {
  polygon = polygon.slice(0, -1)
  console.log(`Stripped closing duplicate vertex (distance: ${closingDist.toFixed(3)}px)`)
}
console.log(`Unique polygon vertices: ${polygon.length}`)

// Validate no duplicate coordinates
for (let i = 0; i < polygon.length; i++) {
  for (let j = i + 1; j < polygon.length; j++) {
    const dx = polygon[i][0] - polygon[j][0]
    const dy = polygon[i][1] - polygon[j][1]
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 0.1) {
      console.warn(`WARNING: Near-duplicate vertices ${i} and ${j} (distance: ${dist.toFixed(3)}px)`)
    }
  }
}

// Report winding direction
const area = signedArea(polygon)
const winding = area > 0 ? 'CCW' : 'CW'
console.log(`Winding direction: ${winding} (signed area: ${area.toFixed(1)})`)

// Extract door polyline (class="st1")
const doorMatch = svg.match(/<polyline[^>]*class="st1"[^>]*points="([^"]+)"/)
if (!doorMatch) throw new Error('No <polyline class="st1"> found in SVG')
const doorPoints = parsePointsAttribute(doorMatch[1])
console.log(`Door polyline points: ${doorPoints.length}`)

if (doorPoints.length < 3) {
  throw new Error(`Expected at least 3 door polyline points, got ${doorPoints.length}`)
}

// Match door polyline endpoints to polygon vertices using nearest-vertex matching
const MAX_SNAP_DISTANCE = 25 // px in viewBox space

const doorVertexIndices: number[] = []
for (let i = 0; i < doorPoints.length; i++) {
  const match = findNearestVertex(doorPoints[i], polygon)
  if (match.distance > MAX_SNAP_DISTANCE) {
    throw new Error(
      `Door point ${i} (${doorPoints[i]}) too far from nearest vertex ${match.index} ` +
      `(${match.distance.toFixed(1)}px > ${MAX_SNAP_DISTANCE}px threshold)`,
    )
  }
  console.log(
    `Door point ${i}: (${doorPoints[i].join(', ')}) -> vertex ${match.index} ` +
    `(distance: ${match.distance.toFixed(2)}px)`,
  )
  doorVertexIndices.push(match.index)
}

// Build door edges from consecutive matched vertices
const doors = {
  a: [doorVertexIndices[0], doorVertexIndices[1]] as [number, number],
  b: [doorVertexIndices[1], doorVertexIndices[2]] as [number, number],
}

// Validate door indices
for (const [label, [i, j]] of Object.entries(doors)) {
  if (i < 0 || i >= polygon.length || j < 0 || j >= polygon.length) {
    throw new Error(`Door ${label} indices [${i}, ${j}] out of range [0, ${polygon.length - 1}]`)
  }
  // Check adjacency (or wrapping)
  const adjacent = j === (i + 1) % polygon.length || i === (j + 1) % polygon.length
  if (!adjacent) {
    console.warn(`WARNING: Door ${label} vertices [${i}, ${j}] are not adjacent in the polygon ring`)
  }
}

console.log(`Door A: edge ${doors.a[0]} -> ${doors.a[1]}`)
console.log(`Door B: edge ${doors.b[0]} -> ${doors.b[1]}`)

// Build corridor data
const corridor: StraitCorridor = {
  viewBox,
  polygon,
  doors,
}

// Read existing corridors.json or start fresh
let corridorsData: Record<string, StraitCorridor> = {}
if (existsSync(outputPath)) {
  try {
    corridorsData = JSON.parse(readFileSync(outputPath, 'utf-8'))
    console.log(`Loaded existing corridors.json (${Object.keys(corridorsData).length} corridors)`)
  }
  catch {
    console.warn('Could not parse existing corridors.json, starting fresh')
  }
}

corridorsData[straitId] = corridor

// Write output
writeFileSync(outputPath, JSON.stringify(corridorsData, null, 2) + '\n')
console.log(`\nWrote ${outputPath}`)
console.log(`Corridors: ${Object.keys(corridorsData).join(', ')}`)
