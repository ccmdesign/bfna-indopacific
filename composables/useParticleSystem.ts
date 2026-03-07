/**
 * useParticleSystem — Canvas 2D particle animation composable.
 *
 * Renders animated dots along Bezier shipping-lane paths inside the
 * zoomed lens view of a selected strait. Particles are distributed
 * proportionally to real vessel counts by type (container / dry-bulk / tanker).
 *
 * Features:
 * - Frame-rate-independent animation via delta-time normalization
 * - Batch rendering (one beginPath + fill per particle type)
 * - Cancellation-token pattern to prevent orphaned rAF loops on rapid toggling
 * - DPR-aware canvas sizing via ResizeObserver (mirrors useFisheyeCanvas.ts)
 * - prefers-reduced-motion: renders static dots without animation
 * - Tab visibility pause to save CPU/battery
 * - SSR safe (all browser APIs gated behind onMounted)
 */

import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { Strait, Point, ParticleType, StraitHistoricalEntry } from '~/types/strait'
import straitPaths from '~/data/straits/strait-paths'
import straitsData from '~/data/straits/straits.json'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2
const BASE_SPEED = 0.0015 // progress units per frame at 60 fps
const TOTAL_BUDGET = 240
const ENABLE_GLOW = true

/** Particle colors per vessel type (from acceptance criteria). */
const PARTICLE_COLORS: Record<ParticleType, string> = {
  container: 'hsl(218, 60%, 58%)',
  dryBulk: 'hsl(34, 60%, 50%)',
  tanker: 'hsl(186, 60%, 50%)',
}

const PARTICLE_TYPES: ParticleType[] = ['container', 'dryBulk', 'tanker']

// ---------------------------------------------------------------------------
// Particle interface (internal — not exported)
// ---------------------------------------------------------------------------

interface Particle {
  progress: number
  speed: number
  direction: 1 | -1
  type: ParticleType
  radius: number
}

// ---------------------------------------------------------------------------
// Bezier evaluation (reusable output object — non-reentrant, hot-path safe)
// ---------------------------------------------------------------------------

const _pt = { x: 0, y: 0 }

function evalCubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const u = 1 - t
  const u2 = u * u
  const u3 = u2 * u
  const t2 = t * t
  const t3 = t2 * t
  _pt.x = u3 * p0.x + 3 * u2 * t * p1.x + 3 * u * t2 * p2.x + t3 * p3.x
  _pt.y = u3 * p0.y + 3 * u2 * t * p1.y + 3 * u * t2 * p2.y + t3 * p3.y
  return _pt
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
  if (!vessels) return 20 // fallback
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

function buildParticles(straitId: string, year: string): Particle[] {
  const count = computeParticleCount(straitId, year)
  const vessels = getVesselData(straitId, year)
  if (!vessels) return createUniformParticles(count)

  const total = vessels.total || 1
  let containerCount = Math.max(vessels.container > 0 ? 1 : 0, Math.round(count * (vessels.container / total)))
  let dryBulkCount = Math.max(vessels.dryBulk > 0 ? 1 : 0, Math.round(count * (vessels.dryBulk / total)))
  let tankerCount = Math.max(0, count - containerCount - dryBulkCount)

  // Guard against negative tanker count from rounding
  if (tankerCount < 0) {
    tankerCount = 0
    const excess = containerCount + dryBulkCount - count
    if (dryBulkCount > containerCount) dryBulkCount -= excess
    else containerCount -= excess
  }

  const particles: Particle[] = []
  const addParticles = (n: number, type: ParticleType) => {
    for (let i = 0; i < n; i++) {
      particles.push({
        progress: Math.random(),
        speed: BASE_SPEED * (0.7 + Math.random() * 0.6),
        direction: Math.random() > 0.5 ? 1 : -1,
        type,
        radius: 2 + Math.random() * 2,
      })
    }
  }

  addParticles(containerCount, 'container')
  addParticles(dryBulkCount, 'dryBulk')
  addParticles(tankerCount, 'tanker')
  return particles
}

function createUniformParticles(count: number): Particle[] {
  const particles: Particle[] = []
  const perType = Math.ceil(count / 3)
  for (const type of PARTICLE_TYPES) {
    const n = Math.min(perType, count - particles.length)
    for (let i = 0; i < n; i++) {
      particles.push({
        progress: Math.random(),
        speed: BASE_SPEED * (0.7 + Math.random() * 0.6),
        direction: Math.random() > 0.5 ? 1 : -1,
        type,
        radius: 2 + Math.random() * 2,
      })
    }
  }
  return particles
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useParticleSystem(options: {
  canvasRef: Ref<HTMLCanvasElement | null>
  straitId: Ref<string | null>
  year: Ref<string>
  innerSize: Ref<{ w: number; h: number }>
  zoomScale: Ref<number>
  selectedStrait: Ref<Strait | null>
  clipRadius: Ref<number>
}) {
  const { canvasRef, straitId, year, innerSize, zoomScale, selectedStrait, clipRadius } = options
  const isRunning = ref(false)

  // Internal state
  let particles: Particle[] = []
  let ctx: CanvasRenderingContext2D | null = null
  let animationFrameId: number | null = null
  let cancelled = false
  let lastTimestamp = 0
  let ro: ResizeObserver | null = null
  let resizeRafId: number | null = null
  let prefersReducedMotion = false
  let visibilityHandler: (() => void) | null = null
  let motionMql: MediaQueryList | null = null
  let motionHandler: ((e: MediaQueryListEvent) => void) | null = null

  // Pre-grouped particle arrays for batch rendering
  let particlesByType: Record<ParticleType, Particle[]> = {
    container: [],
    dryBulk: [],
    tanker: [],
  }

  function groupParticlesByType() {
    particlesByType = { container: [], dryBulk: [], tanker: [] }
    for (const p of particles) {
      particlesByType[p.type].push(p)
    }
  }

  // -------------------------------------------------------------------------
  // Canvas sizing (DPR-aware, mirrors useFisheyeCanvas.ts)
  // -------------------------------------------------------------------------

  function syncCanvasSize(canvas: HTMLCanvasElement, width: number, height: number) {
    const maxDim = 2048
    canvas.width = Math.min(Math.round(width), maxDim)
    canvas.height = Math.min(Math.round(height), maxDim)
    if (ctx) {
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }

  function setupResizeObserver() {
    const canvas = canvasRef.value
    if (!canvas) return

    ro = new ResizeObserver((entries) => {
      if (resizeRafId !== null) return
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = null
        for (const entry of entries) {
          let width: number
          let height: number
          if ((entry as any).devicePixelContentBoxSize?.[0]) {
            width = (entry as any).devicePixelContentBoxSize[0].inlineSize
            height = (entry as any).devicePixelContentBoxSize[0].blockSize
          } else if (entry.contentBoxSize?.[0]) {
            const dpr = window.devicePixelRatio || 1
            width = Math.round(entry.contentBoxSize[0].inlineSize * dpr)
            height = Math.round(entry.contentBoxSize[0].blockSize * dpr)
          } else {
            const dpr = window.devicePixelRatio || 1
            width = Math.round(entry.contentRect.width * dpr)
            height = Math.round(entry.contentRect.height * dpr)
          }
          syncCanvasSize(canvas, width, height)
        }
      })
    })

    try {
      ro.observe(canvas, { box: 'device-pixel-content-box' as any })
    } catch {
      ro.observe(canvas)
    }
  }

  // -------------------------------------------------------------------------
  // Coordinate transform
  // -------------------------------------------------------------------------

  function toCanvasCoords(normX: number, normY: number, w: number, h: number, S: number, tx: number, ty: number) {
    return {
      cx: normX * w * S + tx,
      cy: normY * h * S + ty,
    }
  }

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------

  function draw(isStatic: boolean = false) {
    const canvas = canvasRef.value
    if (!ctx || !canvas) return

    const strait = selectedStrait.value
    if (!strait) return

    const path = straitPaths[strait.id]
    if (!path) return

    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.width / dpr
    const cssH = canvas.height / dpr

    // Clear
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()

    // Compute transform constants (same as mapBgTransform in StraitMap.vue)
    const { w, h } = innerSize.value
    const S = zoomScale.value
    const txMap = w / 2 - (strait.posX / 100) * w * S
    const tyMap = h / 2 - (strait.posY / 100) * h * S

    // Circular clip
    const centerX = cssW / 2
    const centerY = cssH / 2
    const cr = clipRadius.value

    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, cr, 0, TAU)
    ctx.clip()

    const [p0, p1, p2, p3] = path.points

    // Pass 1: Core dots (batched by type)
    for (const type of PARTICLE_TYPES) {
      const group = particlesByType[type]
      if (group.length === 0) continue

      ctx.fillStyle = PARTICLE_COLORS[type]
      ctx.globalAlpha = 0.85
      ctx.beginPath()

      for (const p of group) {
        const pt = evalCubicBezier(p.progress, p0, p1, p2, p3)
        const { cx, cy } = toCanvasCoords(pt.x, pt.y, w, h, S, txMap, tyMap)

        // Skip particles outside clip circle + margin
        const dist = Math.hypot(cx - centerX, cy - centerY)
        if (dist > cr + 20) continue

        ctx.moveTo(cx + p.radius, cy)
        ctx.arc(cx, cy, p.radius, 0, TAU)
      }
      ctx.fill()
    }

    // Pass 2: Glow (optional, batched by type)
    if (ENABLE_GLOW) {
      for (const type of PARTICLE_TYPES) {
        const group = particlesByType[type]
        if (group.length === 0) continue

        ctx.fillStyle = PARTICLE_COLORS[type]
        ctx.globalAlpha = 0.25
        ctx.beginPath()

        for (const p of group) {
          const pt = evalCubicBezier(p.progress, p0, p1, p2, p3)
          const { cx, cy } = toCanvasCoords(pt.x, pt.y, w, h, S, txMap, tyMap)

          const dist = Math.hypot(cx - centerX, cy - centerY)
          if (dist > cr + 20) continue

          ctx.moveTo(cx + p.radius * 2.5, cy)
          ctx.arc(cx, cy, p.radius * 2.5, 0, TAU)
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

    // Update particle positions
    for (const p of particles) {
      p.progress += p.speed * p.direction * dt
      if (p.progress > 1) p.progress -= 1
      if (p.progress < 0) p.progress += 1
    }

    draw()

    if (!cancelled) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  function drawStaticParticles() {
    // For reduced motion: place particles at evenly spaced fixed positions
    const id = straitId.value
    if (!id) return
    const count = particles.length
    for (let i = 0; i < count; i++) {
      const p = particles[i]
      if (p) p.progress = i / count
    }
    draw(true)
  }

  // -------------------------------------------------------------------------
  // Start / Stop
  // -------------------------------------------------------------------------

  function initParticles() {
    const id = straitId.value
    if (!id) return
    particles = buildParticles(id, year.value)
    groupParticlesByType()
  }

  function start() {
    stop()
    cancelled = false
    lastTimestamp = 0
    isRunning.value = true

    initParticles()

    if (prefersReducedMotion) {
      drawStaticParticles()
      return
    }

    animationFrameId = requestAnimationFrame(tick)
  }

  function stop() {
    cancelled = true
    isRunning.value = false
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

    // DPR-aware initial size
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    syncCanvasSize(canvas, Math.round(rect.width * dpr), Math.round(rect.height * dpr))

    setupResizeObserver()

    // Reduced motion
    motionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion = motionMql.matches
    motionHandler = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches
      if (straitId.value) {
        if (prefersReducedMotion) {
          stop()
          drawStaticParticles()
        } else {
          start()
        }
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

    // Start if a strait is already selected
    if (straitId.value) {
      start()
    }
  })

  // Watch strait changes
  watch(straitId, (newId, _oldId, onCleanup) => {
    if (newId) {
      start()
    } else {
      stop()
      // Clear canvas
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

  // Watch year changes — rebuild particles
  watch(year, () => {
    if (straitId.value) {
      initParticles()
    }
  })

  onUnmounted(() => {
    stop()

    if (ro) {
      ro.disconnect()
      ro = null
    }
    if (resizeRafId !== null) {
      cancelAnimationFrame(resizeRafId)
      resizeRafId = null
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
    if (motionMql && motionHandler) {
      motionMql.removeEventListener('change', motionHandler)
      motionMql = null
      motionHandler = null
    }

    ctx = null
  })

  return { start, stop, isRunning }
}
