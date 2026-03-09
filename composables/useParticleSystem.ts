/**
 * useParticleSystem — Polygon-based particle flow composable.
 *
 * Renders animated dots (representing ships) flowing through a strait's
 * water polygon. Particles spawn at one edge, flow organically through
 * the water area, and vanish at the opposite edge.
 *
 * The coordinate space is 1080x1080 (matching the strait SVG polygon
 * viewBox), mapped to the canvas's rendered size inside StraitCircle.
 *
 * Features:
 * - Polygon containment via rasterized grid (O(1) lookup)
 * - Organic flow with noise-based lateral drift
 * - Particles converge in narrow areas, spread in wide areas
 * - Frame-rate-independent animation via delta-time normalization
 * - Batch rendering (one beginPath + fill per particle type)
 * - prefers-reduced-motion: static dots without animation
 * - Tab visibility pause
 * - SSR safe
 */

import { watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { ParticleType, StraitHistoricalEntry } from '~/types/strait'
import straitsData from '~/data/straits/straits.json'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2
/** SVG viewBox size — all polygon data is in this coordinate space */
const WORLD_SIZE = 1080
/** Pixels per grid cell for the containment raster */
const GRID_CELL = 4
const GRID_DIM = WORLD_SIZE / GRID_CELL // 270
/** Base speed in world-units per frame at 60fps */
const BASE_SPEED = 1.2
const TOTAL_BUDGET = 240
const ENABLE_GLOW = true
/** Set to true to render polygon boundaries, edges, and containment grid */
const DEBUG_BOUNDARIES = true

/** Particle colors per vessel type */
const PARTICLE_COLORS: Record<ParticleType, string> = {
  container: 'hsl(218, 60%, 58%)',
  dryBulk: 'hsl(34, 60%, 50%)',
  tanker: 'hsl(186, 60%, 50%)',
}

const PARTICLE_TYPES: ParticleType[] = ['container', 'dryBulk', 'tanker']

// ---------------------------------------------------------------------------
// Polygon data type (matches hormuz-polygon.json)
// ---------------------------------------------------------------------------

interface StraitPolygon {
  viewBox: [number, number, number, number]
  boundary: [number, number][]
  islands: [number, number][][]
  entryEdge: [number, number][]
  exitEdge: [number, number][]
}

// ---------------------------------------------------------------------------
// Particle interface
// ---------------------------------------------------------------------------

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  type: ParticleType
  radius: number
  noiseOffset: number // unique offset for organic drift
  speed: number
}

// ---------------------------------------------------------------------------
// Polygon rasterization — creates a Uint8Array grid for O(1) containment
// ---------------------------------------------------------------------------

function rasterizePolygon(polygon: StraitPolygon): Uint8Array {
  const grid = new Uint8Array(GRID_DIM * GRID_DIM)

  // Fill boundary using scanline approach
  for (let gy = 0; gy < GRID_DIM; gy++) {
    const worldY = gy * GRID_CELL + GRID_CELL / 2
    for (let gx = 0; gx < GRID_DIM; gx++) {
      const worldX = gx * GRID_CELL + GRID_CELL / 2
      if (pointInPolygon(worldX, worldY, polygon.boundary)) {
        // Check it's not inside an island
        let inIsland = false
        for (const island of polygon.islands) {
          if (pointInPolygon(worldX, worldY, island)) {
            inIsland = true
            break
          }
        }
        if (!inIsland) {
          grid[gy * GRID_DIM + gx] = 1
        }
      }
    }
  }

  return grid
}

/** Ray-casting point-in-polygon test */
function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false
  const n = poly.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = poly[i][1], yj = poly[j][1]
    const xi = poly[i][0], xj = poly[j][0]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** O(1) grid lookup for containment */
function isInWater(x: number, y: number, grid: Uint8Array): boolean {
  const gx = Math.floor(x / GRID_CELL)
  const gy = Math.floor(y / GRID_CELL)
  if (gx < 0 || gx >= GRID_DIM || gy < 0 || gy >= GRID_DIM) return false
  return grid[gy * GRID_DIM + gx] === 1
}

// ---------------------------------------------------------------------------
// Edge helpers
// ---------------------------------------------------------------------------

/** Pick a random point along a polyline edge */
function randomPointOnEdge(edge: [number, number][]): { x: number; y: number } {
  if (edge.length < 2) return { x: edge[0][0], y: edge[0][1] }

  // Compute cumulative segment lengths
  const lengths: number[] = [0]
  for (let i = 1; i < edge.length; i++) {
    const dx = edge[i][0] - edge[i - 1][0]
    const dy = edge[i][1] - edge[i - 1][1]
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy))
  }
  const totalLen = lengths[lengths.length - 1]
  const target = Math.random() * totalLen

  // Find which segment
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i] >= target) {
      const segLen = lengths[i] - lengths[i - 1]
      const t = segLen > 0 ? (target - lengths[i - 1]) / segLen : 0
      return {
        x: edge[i - 1][0] + t * (edge[i][0] - edge[i - 1][0]),
        y: edge[i - 1][1] + t * (edge[i][1] - edge[i - 1][1]),
      }
    }
  }
  return { x: edge[0][0], y: edge[0][1] }
}

/** Compute centroid of an edge */
function edgeCentroid(edge: [number, number][]): { x: number; y: number } {
  let sx = 0, sy = 0
  for (const p of edge) { sx += p[0]; sy += p[1] }
  return { x: sx / edge.length, y: sy / edge.length }
}

/** Distance from point to nearest point on a polyline */
function distToEdge(px: number, py: number, edge: [number, number][]): number {
  let minD = Infinity
  for (let i = 0; i < edge.length - 1; i++) {
    const ax = edge[i][0], ay = edge[i][1]
    const bx = edge[i + 1][0], by = edge[i + 1][1]
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const cx = ax + t * dx, cy = ay + t * dy
    const d = Math.hypot(px - cx, py - cy)
    if (d < minD) minD = d
  }
  return minD
}

// ---------------------------------------------------------------------------
// Simple noise for organic drift
// ---------------------------------------------------------------------------

function noise(x: number): number {
  // Simple sine-based pseudo-noise
  return Math.sin(x * 1.7) * 0.5 + Math.sin(x * 3.1 + 1.3) * 0.3 + Math.sin(x * 5.9 + 2.7) * 0.2
}

// ---------------------------------------------------------------------------
// Historical data accessor
// ---------------------------------------------------------------------------

const historical = (straitsData as any).historical as Record<string, Record<string, StraitHistoricalEntry>>

function getVesselData(straitId: string, year: string): StraitHistoricalEntry['vessels'] | null {
  return historical[year]?.[straitId]?.vessels ?? null
}

// ---------------------------------------------------------------------------
// Particle budget helpers
// ---------------------------------------------------------------------------

function computeTotalBudget(): number {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return Math.round(TOTAL_BUDGET / 2)
  }
  return TOTAL_BUDGET
}

function computeParticleCount(straitId: string, year: string): number {
  const vessels = getVesselData(straitId, year)
  if (!vessels) return 20
  let totalAllStraits = 0
  const yearData = historical[year]
  if (yearData) {
    for (const entry of Object.values(yearData)) {
      totalAllStraits += entry.vessels.total
    }
  }
  if (totalAllStraits === 0) return 20
  return Math.max(5, Math.round(computeTotalBudget() * (vessels.total / totalAllStraits)))
}

function distributeByType(straitId: string, year: string, count: number): { type: ParticleType; n: number }[] {
  const vessels = getVesselData(straitId, year)
  if (!vessels) {
    const per = Math.ceil(count / 3)
    return PARTICLE_TYPES.map((type, i) => ({ type, n: Math.min(per, count - i * per) }))
  }
  const total = vessels.total || 1
  const containerN = Math.max(vessels.container > 0 ? 1 : 0, Math.round(count * (vessels.container / total)))
  const dryBulkN = Math.max(vessels.dryBulk > 0 ? 1 : 0, Math.round(count * (vessels.dryBulk / total)))
  const tankerN = Math.max(0, count - containerN - dryBulkN)
  return [
    { type: 'container', n: containerN },
    { type: 'dryBulk', n: dryBulkN },
    { type: 'tanker', n: tankerN },
  ]
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useParticleSystem(options: {
  canvasRef: Ref<HTMLCanvasElement | null>
  straitId: Ref<string | null>
  year: Ref<string>
  circleSize: Ref<number> // rendered diameter of the circle in CSS pixels
}) {
  const { canvasRef, straitId, year, circleSize } = options

  // Internal state
  let particles: Particle[] = []
  let particlesByType: Record<ParticleType, Particle[]> = { container: [], dryBulk: [], tanker: [] }
  let ctx: CanvasRenderingContext2D | null = null
  let animationFrameId: number | null = null
  let cancelled = false
  let lastTimestamp = 0
  let grid: Uint8Array | null = null
  let polygonData: StraitPolygon | null = null
  let flowDirX = 0
  let flowDirY = 0
  let entryCentroid = { x: 0, y: 0 }
  let exitCentroid = { x: 0, y: 0 }
  let prefersReducedMotion = false
  let motionMql: MediaQueryList | null = null
  let motionHandler: ((e: MediaQueryListEvent) => void) | null = null
  let visibilityHandler: (() => void) | null = null
  let ro: ResizeObserver | null = null
  let resizeRafId: number | null = null
  let frameCount = 0

  // -------------------------------------------------------------------------
  // Polygon loading
  // -------------------------------------------------------------------------

  async function loadPolygon(id: string): Promise<StraitPolygon | null> {
    try {
      // Dynamic import for the polygon JSON
      const mod = await import(`~/data/straits/${id}-polygon.json`)
      return mod.default as StraitPolygon
    } catch {
      console.warn(`[particles] No polygon data for strait: ${id}`)
      return null
    }
  }

  // -------------------------------------------------------------------------
  // Canvas sizing
  // -------------------------------------------------------------------------

  function syncCanvasSize(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1
    const size = circleSize.value
    const bufferSize = Math.min(Math.round(size * dpr), 2048)
    if (canvas.width !== bufferSize || canvas.height !== bufferSize) {
      canvas.width = bufferSize
      canvas.height = bufferSize
    }
  }

  function setupResizeObserver() {
    const canvas = canvasRef.value
    if (!canvas) return
    ro = new ResizeObserver(() => {
      if (resizeRafId !== null) return
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = null
        if (canvas) syncCanvasSize(canvas)
      })
    })
    ro.observe(canvas)
  }

  // -------------------------------------------------------------------------
  // Particle creation
  // -------------------------------------------------------------------------

  function createParticle(type: ParticleType, polygon: StraitPolygon): Particle {
    // 50/50 entry or exit spawn, flowing toward opposite
    const goingForward = Math.random() > 0.5
    const spawnEdge = goingForward ? polygon.entryEdge : polygon.exitEdge
    const targetCentroid = goingForward ? exitCentroid : entryCentroid

    const pos = randomPointOnEdge(spawnEdge)

    // Direction toward target with some randomness
    const dx = targetCentroid.x - pos.x
    const dy = targetCentroid.y - pos.y
    const dist = Math.hypot(dx, dy) || 1
    const speed = BASE_SPEED * (0.6 + Math.random() * 0.8)

    return {
      x: pos.x,
      y: pos.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      type,
      radius: 2 + Math.random() * 2.5,
      noiseOffset: Math.random() * 1000,
      speed,
    }
  }

  function buildParticles(id: string, yr: string, polygon: StraitPolygon): Particle[] {
    const count = computeParticleCount(id, yr)
    const distribution = distributeByType(id, yr, count)
    const result: Particle[] = []

    for (const { type, n } of distribution) {
      for (let i = 0; i < n; i++) {
        const p = createParticle(type, polygon)
        // Scatter initial particles along their path (not all at spawn edge)
        const scatter = Math.random()
        p.x += p.vx * scatter * 300
        p.y += p.vy * scatter * 300
        // If scattered position is out of water, reset to spawn
        if (grid && !isInWater(p.x, p.y, grid)) {
          p.x -= p.vx * scatter * 300
          p.y -= p.vy * scatter * 300
        }
        result.push(p)
      }
    }
    return result
  }

  function groupByType() {
    particlesByType = { container: [], dryBulk: [], tanker: [] }
    for (const p of particles) {
      particlesByType[p.type].push(p)
    }
  }

  // -------------------------------------------------------------------------
  // Particle update
  // -------------------------------------------------------------------------

  function updateParticle(p: Particle, dt: number) {
    if (!grid || !polygonData) return

    frameCount++
    const time = frameCount * 0.02 + p.noiseOffset

    // Organic lateral drift using noise
    const lateral = noise(time) * p.speed * 0.6
    // Perpendicular to velocity
    const vLen = Math.hypot(p.vx, p.vy) || 1
    const perpX = -p.vy / vLen
    const perpY = p.vx / vLen

    let nx = p.x + (p.vx + perpX * lateral) * dt
    let ny = p.y + (p.vy + perpY * lateral) * dt

    // Boundary containment: if next position is out of water, steer back
    if (!isInWater(nx, ny, grid)) {
      // Try without lateral drift
      nx = p.x + p.vx * dt
      ny = p.y + p.vy * dt
      if (!isInWater(nx, ny, grid)) {
        // Steer more toward flow direction
        const fdx = flowDirX * p.speed
        const fdy = flowDirY * p.speed
        nx = p.x + fdx * dt
        ny = p.y + fdy * dt
        if (!isInWater(nx, ny, grid)) {
          // Respawn at edge
          respawnParticle(p)
          return
        }
        // Gradually adjust velocity toward flow direction
        p.vx = p.vx * 0.8 + fdx * 0.2
        p.vy = p.vy * 0.8 + fdy * 0.2
      }
    }

    p.x = nx
    p.y = ny

    // Check if particle reached exit/entry edge (within threshold)
    const targetEdge = p.vx * flowDirX + p.vy * flowDirY > 0
      ? polygonData.exitEdge
      : polygonData.entryEdge
    if (distToEdge(p.x, p.y, targetEdge) < 15) {
      respawnParticle(p)
    }
  }

  function respawnParticle(p: Particle) {
    if (!polygonData) return
    const goingForward = Math.random() > 0.5
    const spawnEdge = goingForward ? polygonData.entryEdge : polygonData.exitEdge
    const targetCentroid = goingForward ? exitCentroid : entryCentroid

    const pos = randomPointOnEdge(spawnEdge)
    p.x = pos.x
    p.y = pos.y

    const dx = targetCentroid.x - pos.x
    const dy = targetCentroid.y - pos.y
    const dist = Math.hypot(dx, dy) || 1
    p.speed = BASE_SPEED * (0.6 + Math.random() * 0.8)
    p.vx = (dx / dist) * p.speed
    p.vy = (dy / dist) * p.speed
    p.noiseOffset = Math.random() * 1000
  }

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------

  function draw() {
    const canvas = canvasRef.value
    if (!ctx || !canvas) return

    const dpr = window.devicePixelRatio || 1
    const cssSize = circleSize.value
    const scale = cssSize / WORLD_SIZE

    // Clear
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()

    // Set transform: world coords (1080x1080) → canvas pixels
    ctx.save()
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)

    // Debug: render containment grid, boundary, and edges
    if (DEBUG_BOUNDARIES && grid && polygonData) {
      // Draw rasterized water grid cells (semi-transparent blue)
      ctx.fillStyle = 'rgba(0, 100, 255, 0.15)'
      for (let gy = 0; gy < GRID_DIM; gy++) {
        for (let gx = 0; gx < GRID_DIM; gx++) {
          if (grid[gy * GRID_DIM + gx] === 1) {
            ctx.fillRect(gx * GRID_CELL, gy * GRID_CELL, GRID_CELL, GRID_CELL)
          }
        }
      }

      // Draw boundary polygon outline (yellow)
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'
      ctx.lineWidth = 2
      ctx.beginPath()
      const b = polygonData.boundary
      ctx.moveTo(b[0][0], b[0][1])
      for (let i = 1; i < b.length; i++) {
        ctx.lineTo(b[i][0], b[i][1])
      }
      ctx.closePath()
      ctx.stroke()

      // Draw island outlines (red)
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'
      ctx.lineWidth = 2
      for (const island of polygonData.islands) {
        ctx.beginPath()
        ctx.moveTo(island[0][0], island[0][1])
        for (let i = 1; i < island.length; i++) {
          ctx.lineTo(island[i][0], island[i][1])
        }
        ctx.closePath()
        ctx.stroke()
      }

      // Draw entry edge (green, thick)
      ctx.strokeStyle = 'rgba(0, 255, 0, 1)'
      ctx.lineWidth = 4
      ctx.beginPath()
      const e = polygonData.entryEdge
      ctx.moveTo(e[0][0], e[0][1])
      for (let i = 1; i < e.length; i++) {
        ctx.lineTo(e[i][0], e[i][1])
      }
      ctx.stroke()

      // Draw exit edge (magenta, thick)
      ctx.strokeStyle = 'rgba(255, 0, 255, 1)'
      ctx.lineWidth = 4
      ctx.beginPath()
      const ex = polygonData.exitEdge
      ctx.moveTo(ex[0][0], ex[0][1])
      for (let i = 1; i < ex.length; i++) {
        ctx.lineTo(ex[i][0], ex[i][1])
      }
      ctx.stroke()

      // Draw centroids
      ctx.fillStyle = 'rgba(0, 255, 0, 1)'
      ctx.beginPath()
      ctx.arc(entryCentroid.x, entryCentroid.y, 8, 0, TAU)
      ctx.fill()

      ctx.fillStyle = 'rgba(255, 0, 255, 1)'
      ctx.beginPath()
      ctx.arc(exitCentroid.x, exitCentroid.y, 8, 0, TAU)
      ctx.fill()
    }

    // Pass 1: Core dots (batched by type)
    for (const type of PARTICLE_TYPES) {
      const group = particlesByType[type]
      if (group.length === 0) continue

      ctx.fillStyle = PARTICLE_COLORS[type]
      ctx.globalAlpha = 0.85
      ctx.beginPath()

      for (const p of group) {
        ctx.moveTo(p.x + p.radius, p.y)
        ctx.arc(p.x, p.y, p.radius, 0, TAU)
      }
      ctx.fill()
    }

    // Pass 2: Glow
    if (ENABLE_GLOW) {
      for (const type of PARTICLE_TYPES) {
        const group = particlesByType[type]
        if (group.length === 0) continue

        ctx.fillStyle = PARTICLE_COLORS[type]
        ctx.globalAlpha = 0.2
        ctx.beginPath()

        for (const p of group) {
          const gr = p.radius * 2.5
          ctx.moveTo(p.x + gr, p.y)
          ctx.arc(p.x, p.y, gr, 0, TAU)
        }
        ctx.fill()
      }
    }

    ctx.restore()
  }

  // -------------------------------------------------------------------------
  // Animation loop
  // -------------------------------------------------------------------------

  function tick(timestamp: DOMHighResTimeStamp) {
    if (cancelled) return

    if (lastTimestamp === 0) {
      lastTimestamp = timestamp
      animationFrameId = requestAnimationFrame(tick)
      return
    }

    const dt = Math.min((timestamp - lastTimestamp) / 16.667, 3)
    lastTimestamp = timestamp

    for (const p of particles) {
      updateParticle(p, dt)
    }

    draw()

    if (!cancelled) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  // -------------------------------------------------------------------------
  // Start / Stop
  // -------------------------------------------------------------------------

  async function start() {
    stop()
    cancelled = false
    lastTimestamp = 0
    frameCount = 0

    const id = straitId.value
    if (!id) return

    polygonData = await loadPolygon(id)
    if (!polygonData) return

    // Build containment grid
    grid = rasterizePolygon(polygonData)

    // Compute flow direction
    entryCentroid = edgeCentroid(polygonData.entryEdge)
    exitCentroid = edgeCentroid(polygonData.exitEdge)
    const dx = exitCentroid.x - entryCentroid.x
    const dy = exitCentroid.y - entryCentroid.y
    const dist = Math.hypot(dx, dy) || 1
    flowDirX = dx / dist
    flowDirY = dy / dist

    // Build particles
    particles = buildParticles(id, year.value, polygonData)
    groupByType()

    if (prefersReducedMotion) {
      draw()
      return
    }

    animationFrameId = requestAnimationFrame(tick)
  }

  function stop() {
    cancelled = true
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  onMounted(() => {
    const canvas = canvasRef.value
    if (!canvas) return

    ctx = canvas.getContext('2d')
    if (!ctx) return

    syncCanvasSize(canvas)
    setupResizeObserver()

    // Reduced motion
    motionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion = motionMql.matches
    motionHandler = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches
      if (straitId.value) {
        if (prefersReducedMotion) { stop(); draw() }
        else { start() }
      }
    }
    motionMql.addEventListener('change', motionHandler)

    // Tab visibility
    visibilityHandler = () => {
      if (document.hidden) {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId)
          animationFrameId = null
        }
      } else if (straitId.value && !prefersReducedMotion && !cancelled) {
        lastTimestamp = 0
        animationFrameId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)

    if (straitId.value) {
      start()
    }
  })

  watch(straitId, (newId, _oldId, onCleanup) => {
    if (newId) {
      start()
    } else {
      stop()
      const canvas = canvasRef.value
      if (ctx && canvas) {
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.restore()
      }
    }
    onCleanup(() => stop())
  })

  watch(year, () => {
    if (straitId.value) start()
  })

  onUnmounted(() => {
    stop()
    if (ro) { ro.disconnect(); ro = null }
    if (resizeRafId !== null) { cancelAnimationFrame(resizeRafId); resizeRafId = null }
    if (visibilityHandler) { document.removeEventListener('visibilitychange', visibilityHandler); visibilityHandler = null }
    if (motionMql && motionHandler) { motionMql.removeEventListener('change', motionHandler); motionMql = null; motionHandler = null }
    ctx = null
    grid = null
    polygonData = null
  })

  return { start, stop }
}
