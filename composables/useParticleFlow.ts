/**
 * useParticleFlow — Unified Vue composable for strait particle rendering.
 *
 * Replaces both useParticleSystem.ts (production) and inline test-page logic.
 * Wraps ParticleSimulation for physics, handles Canvas2D rendering,
 * animation loop, DPR scaling, resize observation, prefers-reduced-motion,
 * and tab visibility pause/resume.
 *
 * Two modes:
 * - Test mode (no circleSize): fixed 1080x1080 canvas, debug overlays, uniform colors.
 * - Production mode (circleSize provided): world-to-canvas transform, vessel-type colors,
 *   responsive budget, straitId/year watchers.
 */

import { reactive, watch, onMounted, onUnmounted, type Ref, computed } from 'vue'
import {
  type StraitFlowConfig,
  type FlowParams,
  type Particle,
  type StraitPolygon,
  type SpineData,
  ParticleSimulation,
  defaultFlowParams,
  buildSpine,
  edgeLengths,
  noise,
  WORLD_SIZE,
  GRID_CELL,
  GRID_DIM,
} from '~/utils/particleEngine'
import type { ParticleType, StraitHistoricalEntry } from '~/types/strait'
import straitsData from '~/data/straits/straits.json'

const TAU = Math.PI * 2
const TOTAL_BUDGET = 240

// Shared render constants — used by both batched and fading draw paths
// to ensure visual consistency at opacity=1.
const DOT_ALPHA = 0.85
const GLOW_ALPHA = 0.2
const GLOW_RADIUS_MULT = 2.5
const PARTICLE_COLORS: Record<ParticleType, string> = {
  container: 'hsl(218, 60%, 58%)',
  dryBulk: 'hsl(34, 60%, 50%)',
  tanker: 'hsl(186, 60%, 50%)',
}
const PARTICLE_TYPES: ParticleType[] = ['container', 'dryBulk', 'tanker']
const historical = (straitsData as any).historical as Record<string, Record<string, StraitHistoricalEntry>>

// Reusable buffer for fading particles — avoids per-frame allocation / GC pressure
let fadingBuf: Particle[] = []

// ---------------------------------------------------------------------------
// Vessel data helpers (production mode)
// ---------------------------------------------------------------------------

function getVesselData(straitId: string, year: string): StraitHistoricalEntry['vessels'] | null {
  return historical[year]?.[straitId]?.vessels ?? null
}

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

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useParticleFlow(options: {
  canvasRef: Ref<HTMLCanvasElement | null>
  config: StraitFlowConfig | Ref<StraitFlowConfig | null>
  params?: Partial<FlowParams>
  debug?: Ref<boolean>
  // Production-only:
  circleSize?: Ref<number>
  straitId?: Ref<string | null>
  year?: Ref<string>
}) {
  const { canvasRef, debug } = options
  const circleSize = options.circleSize
  const straitId = options.straitId
  const year = options.year
  const isProductionMode = !!circleSize

  // Resolve config (may be ref or plain; may be null if no flow config for strait)
  const resolvedConfig = computed((): StraitFlowConfig | null => {
    const c = options.config
    return 'value' in c ? c.value : c
  })

  // Reactive params
  const params = reactive(defaultFlowParams({
    particleCount: resolvedConfig.value?.particleCount ?? 120,
    showDebug: debug?.value ?? !isProductionMode,
    ...options.params,
  }))

  // Simulation instance
  let simulation: ParticleSimulation | null = null
  let spineDataArrays: [number, number, number, number][][] = []

  // Internal state
  let ctx: CanvasRenderingContext2D | null = null
  let animationFrameId: number | null = null
  let cancelled = false
  let lastTimestamp = 0
  let prefersReducedMotion = false
  let motionMql: MediaQueryList | null = null
  let motionHandler: ((e: MediaQueryListEvent) => void) | null = null
  let visibilityHandler: (() => void) | null = null
  let ro: ResizeObserver | null = null
  let resizeRafId: number | null = null
  let startGeneration = 0

  // Production: vessel type mapping
  let particleTypeMap: Map<Particle, ParticleType> = new Map()

  // ---------------------------------------------------------------------------
  // Canvas sizing
  // ---------------------------------------------------------------------------

  function syncCanvasSize(canvas: HTMLCanvasElement) {
    if (isProductionMode) {
      const dpr = window.devicePixelRatio || 1
      const size = circleSize!.value
      if (size <= 0) return // Guard against 0-size during initial layout
      const bufferSize = Math.min(Math.round(size * dpr), 2048)
      if (canvas.width !== bufferSize || canvas.height !== bufferSize) {
        canvas.width = bufferSize
        canvas.height = bufferSize
      }
    } else {
      if (canvas.width !== WORLD_SIZE || canvas.height !== WORLD_SIZE) {
        canvas.width = WORLD_SIZE
        canvas.height = WORLD_SIZE
      }
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

  // ---------------------------------------------------------------------------
  // Polygon loading
  // ---------------------------------------------------------------------------

  async function loadPolygon(id: string): Promise<StraitPolygon | null> {
    try {
      const mod = await import(`~/data/straits/${id}-polygon.json`)
      return mod.default as StraitPolygon
    } catch {
      if (import.meta.dev) console.warn(`[useParticleFlow] No polygon data for: ${id}`)
      return null
    }
  }

  // ---------------------------------------------------------------------------
  // Drawing helpers
  // ---------------------------------------------------------------------------

  function drawPolyline(pts: [number, number][]) {
    if (pts.length === 0) return
    ctx!.moveTo(pts[0]![0], pts[0]![1])
    for (let i = 1; i < pts.length; i++) ctx!.lineTo(pts[i]![0], pts[i]![1])
  }

  function drawSpawnZone(edge: [number, number][], start: number, end: number, color: string) {
    if (start >= end) return
    const { lengths, total } = edgeLengths(edge)
    const lo = start * total, hi = end * total
    ctx!.strokeStyle = color
    ctx!.lineWidth = 8
    ctx!.lineCap = 'round'
    ctx!.beginPath()
    let started = false
    for (let i = 1; i < lengths.length; i++) {
      const segStart = lengths[i - 1]!, segEnd = lengths[i]!
      if (segEnd < lo || segStart > hi) continue
      const t0 = segStart < lo ? (lo - segStart) / (segEnd - segStart) : 0
      const t1 = segEnd > hi ? (hi - segStart) / (segEnd - segStart) : 1
      const x0 = edge[i - 1]![0] + t0 * (edge[i]![0] - edge[i - 1]![0])
      const y0 = edge[i - 1]![1] + t0 * (edge[i]![1] - edge[i - 1]![1])
      const x1 = edge[i - 1]![0] + t1 * (edge[i]![0] - edge[i - 1]![0])
      const y1 = edge[i - 1]![1] + t1 * (edge[i]![1] - edge[i - 1]![1])
      if (!started) { ctx!.moveTo(x0, y0); started = true }
      else { ctx!.lineTo(x0, y0) }
      ctx!.lineTo(x1, y1)
    }
    ctx!.stroke()
    ctx!.lineCap = 'butt'
  }

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------

  function draw() {
    const canvas = canvasRef.value
    if (!ctx || !canvas || !simulation?.polygon) return

    if (isProductionMode) {
      drawProduction(canvas)
    } else {
      drawTest(canvas)
    }
  }

  function drawTest(canvas: HTMLCanvasElement) {
    const sim = simulation!
    const polygon = sim.polygon!

    ctx!.clearRect(0, 0, WORLD_SIZE, WORLD_SIZE)

    // Debug overlays
    if (params.showDebug) {
      // Boundary
      ctx!.fillStyle = 'rgba(255, 255, 0, 0.15)'
      ctx!.strokeStyle = 'rgba(255, 255, 0, 0.6)'
      ctx!.lineWidth = 1
      ctx!.beginPath()
      drawPolyline(polygon.boundary)
      ctx!.closePath()
      ctx!.fill()
      ctx!.stroke()

      // Islands
      ctx!.fillStyle = 'rgba(255, 0, 0, 0.2)'
      ctx!.strokeStyle = 'rgba(255, 0, 0, 0.6)'
      for (const island of polygon.islands) {
        ctx!.beginPath()
        drawPolyline(island)
        ctx!.closePath()
        ctx!.fill()
        ctx!.stroke()
      }

      // Entry/exit edges
      ctx!.strokeStyle = 'rgba(0, 255, 0, 0.8)'
      ctx!.lineWidth = 3
      ctx!.beginPath()
      drawPolyline(polygon.entryEdge)
      ctx!.stroke()

      ctx!.strokeStyle = 'rgba(255, 0, 255, 0.8)'
      ctx!.lineWidth = 3
      ctx!.beginPath()
      drawPolyline(polygon.exitEdge)
      ctx!.stroke()

      // Spawn zones
      const config = resolvedConfig.value
      if (config) {
        drawSpawnZone(polygon.entryEdge, config.spawnZones.entry.start, config.spawnZones.entry.end, 'rgba(0, 255, 0, 1)')
        drawSpawnZone(polygon.exitEdge, config.spawnZones.exit.start, config.spawnZones.exit.end, 'rgba(255, 0, 255, 1)')
      }

      // Draw all spines
      for (let si = 0; si < sim.spineDataArr.length; si++) {
        const sd = sim.spineDataArr[si]!
        const pts = sd.pts
        const isB = si > 0
        ctx!.strokeStyle = isB ? 'rgba(255, 165, 0, 0.9)' : 'rgba(0, 255, 255, 0.9)'
        ctx!.lineWidth = 2
        ctx!.setLineDash([8, 6])
        ctx!.beginPath()
        ctx!.moveTo(pts[0]![0], pts[0]![1])
        for (let i = 1; i < pts.length; i++) {
          ctx!.lineTo(pts[i]![0], pts[i]![1])
        }
        ctx!.stroke()
        ctx!.setLineDash([])

        // Waypoint circles + dots + labels
        for (let i = 0; i < pts.length; i++) {
          const [wx, wy, ww] = pts[i]!
          ctx!.strokeStyle = ww < 30 ? 'rgba(255, 100, 100, 0.5)' : (isB ? 'rgba(255, 165, 0, 0.3)' : 'rgba(0, 255, 255, 0.3)')
          ctx!.lineWidth = 1
          ctx!.setLineDash([4, 4])
          ctx!.beginPath()
          ctx!.arc(wx, wy, ww, 0, TAU)
          ctx!.stroke()
          ctx!.setLineDash([])

          ctx!.fillStyle = ww < 30 ? 'rgba(255, 100, 100, 1)' : (isB ? 'rgba(255, 165, 0, 1)' : 'rgba(0, 255, 255, 1)')
          ctx!.beginPath()
          ctx!.arc(wx, wy, 6, 0, TAU)
          ctx!.fill()

          ctx!.fillStyle = '#000'
          ctx!.font = 'bold 10px monospace'
          ctx!.textAlign = 'center'
          ctx!.textBaseline = 'middle'
          ctx!.fillText(String(i), wx, wy)
        }
      }
    }

    // Particles
    for (const p of sim.particles) {
      ctx!.fillStyle = p.color
      ctx!.globalAlpha = params.dotOpacity * p.opacity
      ctx!.beginPath()
      ctx!.arc(p.x, p.y, p.radius, 0, TAU)
      ctx!.fill()

      if (params.showGlow && params.glowOpacity > 0) {
        ctx!.globalAlpha = params.glowOpacity * p.opacity
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius * params.glowRadius, 0, TAU)
        ctx!.fill()
      }
    }
    ctx!.globalAlpha = 1

    // Circle mask
    if (params.showCircleMask) {
      const cx = WORLD_SIZE / 2, cy = WORLD_SIZE / 2
      const r = WORLD_SIZE / 2
      ctx!.save()
      ctx!.fillStyle = '#1a1a2e'
      ctx!.beginPath()
      ctx!.rect(0, 0, WORLD_SIZE, WORLD_SIZE)
      ctx!.arc(cx, cy, r, 0, TAU, true)
      ctx!.fill()
      ctx!.strokeStyle = 'hsla(218, 60%, 58%, 0.6)'
      ctx!.lineWidth = 3
      ctx!.beginPath()
      ctx!.arc(cx, cy, r, 0, TAU)
      ctx!.stroke()
      ctx!.restore()
    }
  }

  function drawProduction(canvas: HTMLCanvasElement) {
    const sim = simulation!
    const dpr = window.devicePixelRatio || 1
    const cssSize = circleSize!.value
    const scale = cssSize / WORLD_SIZE

    // Clear
    ctx!.save()
    ctx!.setTransform(1, 0, 0, 1, 0, 0)
    ctx!.clearRect(0, 0, canvas.width, canvas.height)
    ctx!.restore()

    // Set transform: world coords -> canvas pixels
    ctx!.save()
    ctx!.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)

    // Debug overlay (dev only, toggleable via params.showDebug)
    if (import.meta.dev && params.showDebug && sim.grid && sim.polygon) {
      ctx!.fillStyle = 'rgba(0, 100, 255, 0.15)'
      for (let gy = 0; gy < GRID_DIM; gy++) {
        for (let gx = 0; gx < GRID_DIM; gx++) {
          if (sim.grid[gy * GRID_DIM + gx] === 1) {
            ctx!.fillRect(gx * GRID_CELL, gy * GRID_CELL, GRID_CELL, GRID_CELL)
          }
        }
      }

      const polygon = sim.polygon
      ctx!.strokeStyle = 'rgba(255, 255, 0, 0.8)'
      ctx!.lineWidth = 2
      ctx!.beginPath()
      drawPolyline(polygon.boundary)
      ctx!.closePath()
      ctx!.stroke()

      ctx!.strokeStyle = 'rgba(255, 0, 0, 0.8)'
      ctx!.lineWidth = 2
      for (const island of polygon.islands) {
        ctx!.beginPath()
        drawPolyline(island)
        ctx!.closePath()
        ctx!.stroke()
      }

      ctx!.strokeStyle = 'rgba(0, 255, 0, 1)'
      ctx!.lineWidth = 4
      ctx!.beginPath()
      drawPolyline(polygon.entryEdge)
      ctx!.stroke()

      ctx!.strokeStyle = 'rgba(255, 0, 255, 1)'
      ctx!.lineWidth = 4
      ctx!.beginPath()
      drawPolyline(polygon.exitEdge)
      ctx!.stroke()
    }

    // Group particles by type; separate fading particles for individual alpha draws
    fadingBuf.length = 0
    const fading = fadingBuf
    const grouped: Record<ParticleType, Particle[]> = { container: [], dryBulk: [], tanker: [] }
    for (const p of sim.particles) {
      if (p.opacity < 1) {
        fading.push(p)
      } else {
        const type = particleTypeMap.get(p) ?? 'tanker'
        grouped[type].push(p)
      }
    }

    // Dot pass (batched, non-fading)
    for (const type of PARTICLE_TYPES) {
      const group = grouped[type]
      if (group.length === 0) continue

      ctx!.fillStyle = PARTICLE_COLORS[type]
      ctx!.globalAlpha = DOT_ALPHA
      ctx!.beginPath()
      for (const p of group) {
        ctx!.moveTo(p.x + p.radius, p.y)
        ctx!.arc(p.x, p.y, p.radius, 0, TAU)
      }
      ctx!.fill()
    }

    // Glow pass (batched, non-fading)
    for (const type of PARTICLE_TYPES) {
      const group = grouped[type]
      if (group.length === 0) continue

      ctx!.fillStyle = PARTICLE_COLORS[type]
      ctx!.globalAlpha = GLOW_ALPHA
      ctx!.beginPath()
      for (const p of group) {
        const gr = p.radius * GLOW_RADIUS_MULT
        ctx!.moveTo(p.x + gr, p.y)
        ctx!.arc(p.x, p.y, gr, 0, TAU)
      }
      ctx!.fill()
    }

    // Individual draw for fading particles (per-particle globalAlpha)
    for (const p of fading) {
      const type = particleTypeMap.get(p) ?? 'tanker'
      ctx!.fillStyle = PARTICLE_COLORS[type]
      ctx!.globalAlpha = DOT_ALPHA * p.opacity
      ctx!.beginPath()
      ctx!.arc(p.x, p.y, p.radius, 0, TAU)
      ctx!.fill()
      // Glow
      ctx!.globalAlpha = GLOW_ALPHA * p.opacity
      ctx!.beginPath()
      ctx!.arc(p.x, p.y, p.radius * GLOW_RADIUS_MULT, 0, TAU)
      ctx!.fill()
    }
    ctx!.globalAlpha = 1 // Reset after fading draws

    ctx!.restore()
  }

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  function tick(timestamp: DOMHighResTimeStamp) {
    if (cancelled) return

    if (lastTimestamp === 0) {
      lastTimestamp = timestamp
      animationFrameId = requestAnimationFrame(tick)
      return
    }

    const dt = Math.min((timestamp - lastTimestamp) / 16.667, 3)
    lastTimestamp = timestamp

    simulation?.tick(dt)

    // Update type map for new particles in production mode
    if (isProductionMode && simulation) {
      for (const p of simulation.particles) {
        if (!particleTypeMap.has(p)) {
          // Assign type based on color (mapped at spawn)
          particleTypeMap.set(p, typeFromColor(p.color))
        }
      }
    }

    draw()

    if (!cancelled) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  function typeFromColor(color: string): ParticleType {
    if (color.includes('218')) return 'container'
    if (color.includes('34')) return 'dryBulk'
    return 'tanker'
  }

  // ---------------------------------------------------------------------------
  // Start / Stop
  // ---------------------------------------------------------------------------

  async function startSimulation(config: StraitFlowConfig, gen: number) {
    stop()
    cancelled = false
    lastTimestamp = 0

    const polygon = await loadPolygon(config.id)
    if (!polygon || gen !== startGeneration) return

    // Build spine pts arrays from config
    spineDataArrays = config.spines.map(s => s.waypoints.map(w => [...w] as [number, number, number, number]))

    // Create simulation
    simulation = new ParticleSimulation(config, params)
    simulation.init(polygon, spineDataArrays)

    // In production mode, override particle count from vessel data
    if (isProductionMode && straitId?.value && year?.value) {
      params.particleCount = computeParticleCount(straitId.value, year.value)
      particleTypeMap = new Map()
    }

    if (prefersReducedMotion) {
      // Spawn and distribute particles along the flow path for a static snapshot.
      // Calls tick() repeatedly so particles spread along the spine (not clustered
      // at spawn). This is intentionally heavier than animated init (~240 ticks)
      // but runs only once and completes in <50ms on modern hardware.
      for (let i = 0; i < params.particleCount; i++) {
        simulation.tick(1)
      }
      draw()
      return
    }

    animationFrameId = requestAnimationFrame(tick)
  }

  // Vessel type assignment: particles get types via typeFromColor()
  // which maps engine HSL colors to ParticleType. The distribution
  // is approximately uniform (~33% each) rather than proportional
  // to vessel data. This is acceptable for visualization purposes.

  function start() {
    const config = resolvedConfig.value
    if (!config) return // No config available; skip silently
    startGeneration++
    startSimulation(config, startGeneration)
  }

  function stop() {
    cancelled = true
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

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
      if (prefersReducedMotion) { stop(); draw() }
      else { start() }
    }
    motionMql.addEventListener('change', motionHandler)

    // Tab visibility
    visibilityHandler = () => {
      if (document.hidden) {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId)
          animationFrameId = null
        }
      } else if (!prefersReducedMotion && !cancelled) {
        lastTimestamp = 0
        animationFrameId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)

    // Start
    start()
  })

  // Production: watch straitId and year with generation counter
  if (isProductionMode && straitId && year) {
    watch([straitId, year], () => {
      if (straitId.value) {
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
    })
  }

  onUnmounted(() => {
    stop()
    if (ro) { ro.disconnect(); ro = null }
    if (resizeRafId !== null) { cancelAnimationFrame(resizeRafId); resizeRafId = null }
    if (visibilityHandler) { document.removeEventListener('visibilitychange', visibilityHandler); visibilityHandler = null }
    if (motionMql && motionHandler) { motionMql.removeEventListener('change', motionHandler); motionMql = null; motionHandler = null }
    ctx = null
  })

  return {
    get simulation() { return simulation },
    params,
    start,
    stop,
    /** Get mutable spine arrays for Tweakpane drag editing */
    getSpineArrays() { return spineDataArrays },
    /** Rebuild spine data after drag editing */
    rebuildSpines() {
      if (simulation) {
        simulation.spineDataArr = spineDataArrays.map(pts => buildSpine(pts))
      }
    },
  }
}
