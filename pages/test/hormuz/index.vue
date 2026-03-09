<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Pane } from 'tweakpane'
import polygonData from '~/data/straits/hormuz-polygon.json'

// Dev-only page — redirect to home in production builds
if (!import.meta.dev) {
  navigateTo('/', { replace: true })
}

const SIZE = 1080
const GRID_CELL = 4
const GRID_DIM = SIZE / GRID_CELL
const TAU = Math.PI * 2

const canvasRef = ref<HTMLCanvasElement | null>(null)

// --- Tunable parameters (reactive, bound to control panel) ---
const params = reactive({
  particleCount: 120,     // Total dots on screen
  speed: 1.2,             // Base speed in world-units/frame
  speedVariation: 0.4,    // How much speed varies per particle (0=uniform, 1=huge range)
  steer: 0.3,             // How fast particles align to spine (0=ignore spine, 1=instant snap)
  spinePull: 0.5,         // How strongly particles are pulled toward spine centerline
  pullDistance: 80,        // Distance (px) at which pull reaches max strength
  noiseAmount: 0.2,       // Lateral wiggle intensity (0=straight, 1=very wavy)
  noiseSpeed: 0.02,       // How fast the wiggle oscillates (lower=smoother)
  dotMin: 2,              // Minimum dot radius
  dotMax: 4.5,            // Maximum dot radius
  glowRadius: 2.5,        // Glow size multiplier (1=no glow, 3=large bloom)
  glowOpacity: 0.2,       // Glow alpha (0=off, 1=solid)
  dotOpacity: 0.9,        // Core dot alpha
  respawnThreshold: 15,   // Distance to target edge before recycling (px)
  showDebug: true,        // Show boundary/edge/spine overlays
  showGlow: true,         // Enable glow pass
})

const polygon = polygonData as unknown as {
  boundary: [number, number][]
  islands: [number, number][][]
  entryEdge: [number, number][]
  exitEdge: [number, number][]
}

// --- Polygon containment ---
function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i]![1], yj = poly[j]![1]
    const xi = poly[i]![0], xj = poly[j]![0]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function rasterize(): Uint8Array {
  const grid = new Uint8Array(GRID_DIM * GRID_DIM)
  for (let gy = 0; gy < GRID_DIM; gy++) {
    const wy = gy * GRID_CELL + GRID_CELL / 2
    for (let gx = 0; gx < GRID_DIM; gx++) {
      const wx = gx * GRID_CELL + GRID_CELL / 2
      if (pointInPolygon(wx, wy, polygon.boundary)) {
        let inIsland = false
        for (const island of polygon.islands) {
          if (pointInPolygon(wx, wy, island)) { inIsland = true; break }
        }
        if (!inIsland) grid[gy * GRID_DIM + gx] = 1
      }
    }
  }
  return grid
}

function isInWater(x: number, y: number, grid: Uint8Array): boolean {
  const gx = Math.floor(x / GRID_CELL)
  const gy = Math.floor(y / GRID_CELL)
  if (gx < 0 || gx >= GRID_DIM || gy < 0 || gy >= GRID_DIM) return false
  return grid[gy * GRID_DIM + gx] === 1
}

// --- Edge helpers ---
function randomPointOnEdge(edge: [number, number][]): { x: number; y: number } {
  if (edge.length < 2) return { x: edge[0]![0], y: edge[0]![1] }
  const lengths: number[] = [0]
  for (let i = 1; i < edge.length; i++) {
    const dx = edge[i]![0] - edge[i - 1]![0]
    const dy = edge[i]![1] - edge[i - 1]![1]
    lengths.push(lengths[i - 1]! + Math.hypot(dx, dy))
  }
  const total = lengths[lengths.length - 1]!
  const target = Math.random() * total
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i]! >= target) {
      const seg = lengths[i]! - lengths[i - 1]!
      const t = seg > 0 ? (target - lengths[i - 1]!) / seg : 0
      return {
        x: edge[i - 1]![0] + t * (edge[i]![0] - edge[i - 1]![0]),
        y: edge[i - 1]![1] + t * (edge[i]![1] - edge[i - 1]![1]),
      }
    }
  }
  return { x: edge[0]![0], y: edge[0]![1] }
}

function edgeCentroid(edge: [number, number][]): { x: number; y: number } {
  let sx = 0, sy = 0
  for (const p of edge) { sx += p[0]; sy += p[1] }
  return { x: sx / edge.length, y: sy / edge.length }
}

function distToEdge(px: number, py: number, edge: [number, number][]): number {
  let minD = Infinity
  for (let i = 0; i < edge.length - 1; i++) {
    const ax = edge[i]![0], ay = edge[i]![1]
    const bx = edge[i + 1]![0], by = edge[i + 1]![1]
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    minD = Math.min(minD, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)))
  }
  return minD
}

function noise(x: number): number {
  return Math.sin(x * 1.7) * 0.5 + Math.sin(x * 3.1 + 1.3) * 0.3 + Math.sin(x * 5.9 + 2.7) * 0.2
}

// --- Particle ---
interface Particle {
  x: number; y: number
  vx: number; vy: number
  radius: number
  noiseOffset: number
  speed: number
  color: string
}

const COLORS = ['hsl(218,60%,58%)', 'hsl(34,60%,50%)', 'hsl(186,60%,50%)']

// --- Flow spine: waypoints through the channel ---
// Each waypoint has [x, y, gravity] where gravity controls local pull strength.
// gravity=1 is neutral, >1 attracts particles (denser), <1 repels (sparser).
// Order: entry → exit. Particles going "backward" reverse this.
const FLOW_SPINE: [number, number, number][] = [
  [308, 500, 1.0],   // 0
  [413, 568, 1.0],   // 1
  [482, 572, 1.0],   // 2
  [544, 532, 1.0],   // 3
  [559, 585, 1.0],   // 4
  [780, 678, 1.0],   // 5
  [809, 833, 1.0],   // 6
]

// Precompute spine segment tangents and cumulative lengths
function buildSpine(pts: [number, number, number][]) {
  const tangents: { tx: number; ty: number }[] = []
  const cumLen: number[] = [0]
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1]![0] - pts[i]![0]
    const dy = pts[i + 1]![1] - pts[i]![1]
    const len = Math.hypot(dx, dy) || 1
    tangents.push({ tx: dx / len, ty: dy / len })
    cumLen.push(cumLen[i]! + len)
  }
  // Last tangent = same as previous
  tangents.push(tangents[tangents.length - 1]!)
  return { tangents, cumLen, totalLen: cumLen[cumLen.length - 1]! }
}

/** Find the nearest point on the spine and its tangent + interpolated gravity */
function spineNearest(px: number, py: number, pts: [number, number, number][], tans: { tx: number; ty: number }[]): { cx: number; cy: number; tx: number; ty: number; dist: number; gravity: number } {
  let bestDist = Infinity
  let bestCx = 0, bestCy = 0, bestTx = 0, bestTy = 0, bestGravity = 1
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i]![0], ay = pts[i]![1]
    const bx = pts[i + 1]![0], by = pts[i + 1]![1]
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const cx = ax + t * dx, cy = ay + t * dy
    const dist = Math.hypot(px - cx, py - cy)
    if (dist < bestDist) {
      bestDist = dist
      bestCx = cx; bestCy = cy
      const t0 = tans[i]!, t1 = tans[i + 1]!
      bestTx = t0.tx + t * (t1.tx - t0.tx)
      bestTy = t0.ty + t * (t1.ty - t0.ty)
      // Interpolate gravity between waypoints
      bestGravity = pts[i]![2] + t * (pts[i + 1]![2] - pts[i]![2])
    }
  }
  const len = Math.hypot(bestTx, bestTy) || 1
  return { cx: bestCx, cy: bestCy, tx: bestTx / len, ty: bestTy / len, dist: bestDist, gravity: bestGravity }
}

/** Find the local flow direction at (px, py) by projecting onto the nearest spine segment */
function spineFlowAt(px: number, py: number, pts: [number, number, number][], tans: { tx: number; ty: number }[], forward: boolean): { fx: number; fy: number } {
  const { tx, ty } = spineNearest(px, py, pts, tans)
  const sign = forward ? 1 : -1
  return { fx: sign * tx, fy: sign * ty }
}

// Mutable copy for drag/drop editing (reactive for template bindings)
const spine = reactive(FLOW_SPINE.map(p => [...p] as [number, number, number]))
let spineTangents = buildSpine(spine).tangents

// Drag state
let dragIdx: number | null = null
const HIT_RADIUS = 14 // px tolerance for grabbing a waypoint
let animId: number | null = null

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // --- Drag/drop handlers ---
  function canvasXY(e: MouseEvent): { x: number; y: number } {
    const rect = canvas!.getBoundingClientRect()
    const scaleX = SIZE / rect.width
    const scaleY = SIZE / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function onMouseDown(e: MouseEvent) {
    const { x, y } = canvasXY(e)
    for (let i = 0; i < spine.length; i++) {
      if (Math.hypot(x - spine[i]![0], y - spine[i]![1]) < HIT_RADIUS) {
        dragIdx = i
        canvas!.style.cursor = 'grabbing'
        e.preventDefault()
        return
      }
    }
  }

  function onMouseMove(e: MouseEvent) {
    const { x, y } = canvasXY(e)
    if (dragIdx !== null) {
      spine[dragIdx]![0] = Math.round(x)
      spine[dragIdx]![1] = Math.round(y)
      spineTangents = buildSpine(spine).tangents
      e.preventDefault()
      return
    }
    // Hover cursor
    let hover = false
    for (const pt of spine) {
      if (Math.hypot(x - pt[0], y - pt[1]) < HIT_RADIUS) { hover = true; break }
    }
    canvas!.style.cursor = hover ? 'grab' : 'default'
  }

  function onMouseUp() {
    if (dragIdx !== null) {
      dragIdx = null
      canvas!.style.cursor = 'default'
    }
  }

  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  cleanupListeners = () => {
    canvas.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  const grid = rasterize()
  const ec = edgeCentroid(polygon.entryEdge)
  const xc = edgeCentroid(polygon.exitEdge)

  function spawn(): Particle {
    const forward = Math.random() > 0.5
    const spawnEdge = forward ? polygon.entryEdge : polygon.exitEdge
    const pos = randomPointOnEdge(spawnEdge)
    // Initial velocity from spine direction at spawn point
    const { fx, fy } = spineFlowAt(pos.x, pos.y, spine, spineTangents, forward)
    const speed = params.speed * (1 - params.speedVariation + Math.random() * params.speedVariation * 2)
    return {
      x: pos.x, y: pos.y,
      vx: fx * speed, vy: fy * speed,
      radius: params.dotMin + Math.random() * (params.dotMax - params.dotMin),
      noiseOffset: Math.random() * 1000,
      speed,
      color: COLORS[Math.floor(Math.random() * 3)]!,
    }
  }

  function respawn(p: Particle) {
    Object.assign(p, spawn())
  }

  // Build particles, scatter some along their path
  const particles: Particle[] = []
  for (let i = 0; i < params.particleCount; i++) {
    const p = spawn()
    // Scatter along spine direction
    const scatter = Math.random() * 300
    const sx = p.x + p.vx / p.speed * scatter
    const sy = p.y + p.vy / p.speed * scatter
    if (isInWater(sx, sy, grid)) { p.x = sx; p.y = sy }
    particles.push(p)
  }

  let lastTs = 0
  let frameCount = 0

  function drawPolyline(pts: [number, number][]) {
    if (pts.length === 0) return
    ctx!.moveTo(pts[0]![0], pts[0]![1])
    for (let i = 1; i < pts.length; i++) ctx!.lineTo(pts[i]![0], pts[i]![1])
  }

  function tick(ts: DOMHighResTimeStamp) {
    if (lastTs === 0) { lastTs = ts; animId = requestAnimationFrame(tick); return }
    const dt = Math.min((ts - lastTs) / 16.667, 3)
    lastTs = ts
    frameCount++

    // Dynamic particle count
    while (particles.length < params.particleCount) particles.push(spawn())
    while (particles.length > params.particleCount) particles.pop()

    // Update particles
    for (const p of particles) {
      // Determine if this particle is going forward (entry→exit) or backward
      const forward = p.vx * (xc.x - ec.x) + p.vy * (xc.y - ec.y) > 0
      const sign = forward ? 1 : -1

      // Find nearest spine point + tangent
      const near = spineNearest(p.x, p.y, spine, spineTangents)

      // Gravity modulates local speed: high gravity = slower = denser cluster
      const localSpeed = p.speed / Math.max(near.gravity, 0.1)

      // Build desired velocity: spine tangent + pull toward spine centerline
      // Pull strength increases with distance from spine (clamped)
      // Gravity also increases pull (high gravity = tighter stream)
      const pullStrength = Math.min(near.dist / params.pullDistance, 1) * params.spinePull * near.gravity
      const toCx = near.dist > 0 ? (near.cx - p.x) / near.dist : 0
      const toCy = near.dist > 0 ? (near.cy - p.y) / near.dist : 0

      // Desired direction: blend spine tangent with pull toward center
      let desiredX = sign * near.tx * (1 - pullStrength) + toCx * pullStrength
      let desiredY = sign * near.ty * (1 - pullStrength) + toCy * pullStrength
      const desiredLen = Math.hypot(desiredX, desiredY) || 1
      desiredX /= desiredLen
      desiredY /= desiredLen

      // Steer current velocity toward desired
      const steer = params.steer
      p.vx = p.vx * (1 - steer) + desiredX * localSpeed * steer
      p.vy = p.vy * (1 - steer) + desiredY * localSpeed * steer

      // Renormalize to localSpeed (gravity-adjusted)
      const vLen = Math.hypot(p.vx, p.vy) || 1
      p.vx = (p.vx / vLen) * localSpeed
      p.vy = (p.vy / vLen) * localSpeed

      // Add lateral noise (reduced when far from spine)
      const time = frameCount * params.noiseSpeed + p.noiseOffset
      const noiseScale = Math.max(0.05, 1 - near.dist / (params.pullDistance * 1.25))
      const lateral = noise(time) * localSpeed * params.noiseAmount * noiseScale
      const perpX = -p.vy / localSpeed, perpY = p.vx / localSpeed

      const step = localSpeed * dt

      // Try candidate positions in priority order
      const candidates: [number, number, number, number][] = [
        [p.x + (p.vx + perpX * lateral) * dt, p.y + (p.vy + perpY * lateral) * dt, p.vx, p.vy],  // full move
        [p.x + p.vx * dt, p.y + p.vy * dt, p.vx, p.vy],  // no lateral
        [p.x + desiredX * step, p.y + desiredY * step, desiredX * p.speed, desiredY * p.speed],  // pure desired
        [p.x + toCx * step, p.y + toCy * step, toCx * p.speed, toCy * p.speed],  // straight to spine
      ]

      let moved = false
      for (const [nx, ny, nvx, nvy] of candidates) {
        if (isInWater(nx, ny, grid)) {
          p.x = nx; p.y = ny
          p.vx = nvx; p.vy = nvy
          moved = true
          break
        }
      }

      if (!moved) {
        // Last resort: teleport to nearest spine point if in water
        if (isInWater(near.cx, near.cy, grid)) {
          p.x = near.cx; p.y = near.cy
          p.vx = sign * near.tx * p.speed
          p.vy = sign * near.ty * p.speed
        } else {
          respawn(p)
        }
        continue
      }

      // Check if reached target edge
      const targetEdge = forward ? polygon.exitEdge : polygon.entryEdge
      if (distToEdge(p.x, p.y, targetEdge) < params.respawnThreshold) { respawn(p) }
    }

    // Draw
    ctx!.clearRect(0, 0, SIZE, SIZE)

    // Debug boundaries
    if (params.showDebug) {
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

    // Flow spine (cyan dashed line with numbered waypoints)
    ctx!.strokeStyle = 'rgba(0, 255, 255, 0.9)'
    ctx!.lineWidth = 2
    ctx!.setLineDash([8, 6])
    ctx!.beginPath()
    ctx!.moveTo(spine[0]![0], spine[0]![1])
    for (let i = 1; i < spine.length; i++) {
      ctx!.lineTo(spine[i]![0], spine[i]![1])
    }
    ctx!.stroke()
    ctx!.setLineDash([])

    // Waypoint dots + labels
    for (let i = 0; i < spine.length; i++) {
      const [wx, wy] = spine[i]!
      ctx!.fillStyle = 'rgba(0, 255, 255, 1)'
      ctx!.beginPath()
      ctx!.arc(wx, wy, 6, 0, TAU)
      ctx!.fill()
      ctx!.fillStyle = '#000'
      ctx!.font = 'bold 10px monospace'
      ctx!.textAlign = 'center'
      ctx!.textBaseline = 'middle'
      ctx!.fillText(String(i), wx, wy)
    }
    } // end showDebug

    // Particles
    for (const p of particles) {
      ctx!.fillStyle = p.color
      ctx!.globalAlpha = params.dotOpacity
      ctx!.beginPath()
      ctx!.arc(p.x, p.y, p.radius, 0, TAU)
      ctx!.fill()

      // Glow
      if (params.showGlow && params.glowOpacity > 0) {
        ctx!.globalAlpha = params.glowOpacity
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius * params.glowRadius, 0, TAU)
        ctx!.fill()
      }
    }
    ctx!.globalAlpha = 1

    animId = requestAnimationFrame(tick)
  }

  animId = requestAnimationFrame(tick)
})

let cleanupListeners: (() => void) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pane: any = null

// Tweakpane setup — runs after DOM is ready
onMounted(() => {
  pane = new Pane({ title: 'Particle Controls' }) as any

  // Flow & Movement
  const flow = pane.addFolder({ title: 'Flow & Movement' })
  flow.addBinding(params, 'particleCount', { label: 'Count', min: 10, max: 500, step: 10 })
  flow.addBinding(params, 'speed', { label: 'Speed', min: 0.1, max: 5, step: 0.1 })
  flow.addBinding(params, 'speedVariation', { label: 'Speed var', min: 0, max: 1, step: 0.05 })

  // Steering
  const steer = pane.addFolder({ title: 'Steering' })
  steer.addBinding(params, 'steer', { label: 'Steer', min: 0, max: 1, step: 0.05 })
  steer.addBinding(params, 'spinePull', { label: 'Spine pull', min: 0, max: 2, step: 0.05 })
  steer.addBinding(params, 'pullDistance', { label: 'Pull dist', min: 10, max: 300, step: 10 })

  // Organic Motion
  const motion = pane.addFolder({ title: 'Organic Motion' })
  motion.addBinding(params, 'noiseAmount', { label: 'Noise amt', min: 0, max: 1, step: 0.05 })
  motion.addBinding(params, 'noiseSpeed', { label: 'Noise spd', min: 0.005, max: 0.1, step: 0.005 })

  // Appearance
  const appearance = pane.addFolder({ title: 'Appearance' })
  appearance.addBinding(params, 'dotMin', { label: 'Dot min', min: 0.5, max: 6, step: 0.5 })
  appearance.addBinding(params, 'dotMax', { label: 'Dot max', min: 1, max: 10, step: 0.5 })
  appearance.addBinding(params, 'dotOpacity', { label: 'Dot alpha', min: 0.1, max: 1, step: 0.05 })
  appearance.addBinding(params, 'showGlow', { label: 'Glow' })
  appearance.addBinding(params, 'glowRadius', { label: 'Glow size', min: 1, max: 5, step: 0.5 })
  appearance.addBinding(params, 'glowOpacity', { label: 'Glow alpha', min: 0, max: 0.6, step: 0.05 })

  // Waypoint Gravity — sync a plain object with the reactive spine array
  const gravity = pane.addFolder({ title: 'Waypoint Gravity' })
  const gravityParams: Record<string, number> = {}
  for (let i = 0; i < spine.length; i++) {
    const key = `pt${i}`
    gravityParams[key] = spine[i][2]
    gravity.addBinding(gravityParams, key, { label: `Pt ${i}`, min: 0.2, max: 3, step: 0.1 })
      .on('change', (ev: { value: number }) => { spine[i][2] = ev.value; spineTangents = buildSpine(spine).tangents })
  }

  // Debug
  const debug = pane.addFolder({ title: 'Debug' })
  debug.addBinding(params, 'showDebug', { label: 'Boundaries' })
  debug.addBinding(params, 'respawnThreshold', { label: 'Respawn px', min: 5, max: 60, step: 5 })

  // Copy spine coords button
  pane.addButton({ title: 'Copy Spine Coords' }).on('click', () => {
    const text = spine.map((p, i) => `  [${p[0]}, ${p[1]}, ${p[2].toFixed(1)}],   // ${i}`).join('\n')
    navigator.clipboard.writeText(text)
  })
})

onUnmounted(() => {
  if (animId !== null) cancelAnimationFrame(animId)
  cleanupListeners?.()
  pane?.dispose()
})
</script>

<template>
  <div class="test-page">
    <div class="canvas-wrap">
      <img
        src="/assets/images/straits/hormuz.jpg"
        :width="SIZE"
        :height="SIZE"
        alt="Hormuz satellite"
        class="bg-image"
      />
      <canvas ref="canvasRef" class="overlay" />
    </div>
    <div class="legend">
      <p><span class="swatch yellow" /> Boundary</p>
      <p><span class="swatch red" /> Islands</p>
      <p><span class="swatch green" /> Entry edge</p>
      <p><span class="swatch magenta" /> Exit edge</p>
      <p><span class="swatch cyan" /> Flow spine (drag to edit)</p>
      <p><span class="swatch blue" /> Particles (ships)</p>
    </div>
  </div>

</template>

<style scoped>
.test-page {
  background: #111;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 20px;
}

.canvas-wrap {
  position: relative;
  width: 1080px;
  height: 1080px;
}

.bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.legend {
  color: #fff;
  font-family: monospace;
  font-size: 14px;
  display: flex;
  gap: 24px;
}
.legend p { display: flex; align-items: center; gap: 6px; margin: 0; }
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
.swatch.yellow { background: rgba(255, 255, 0, 0.8); }
.swatch.red { background: rgba(255, 0, 0, 0.8); }
.swatch.green { background: rgba(0, 255, 0, 0.8); }
.swatch.magenta { background: rgba(255, 0, 255, 0.8); }
.swatch.cyan { background: rgba(0, 255, 255, 0.9); }
.swatch.blue { background: hsl(218, 60%, 58%); }
</style>
