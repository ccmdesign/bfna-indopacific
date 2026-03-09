<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'

// Dev-only page — redirect to home in production builds
if (!import.meta.dev) {
  navigateTo('/', { replace: true })
}

// Dynamic imports — only loaded at runtime in dev mode (never bundled in production)
const polygonData = import.meta.dev
  ? (await import('~/data/straits/hormuz-polygon.json')).default
  : null

const SIZE = 1080
const GRID_CELL = 4
const GRID_DIM = SIZE / GRID_CELL
const TAU = Math.PI * 2

const canvasRef = ref<HTMLCanvasElement | null>(null)

// --- Tunable parameters (reactive, bound to control panel) ---
const params = reactive({
  particleCount: 120,     // Total dots on screen
  spawnRate: 2,           // New particles per frame (constant influx at edges)
  speed: 1.2,             // Base speed in world-units/frame
  speedVariation: 0.4,    // How much speed varies per particle (0=uniform, 1=huge range)
  steer: 0.3,             // How fast particles align to spine (0=ignore spine, 1=instant snap)
  spinePull: 0.5,         // How strongly particles are pulled toward spine centerline
  noiseAmount: 0.2,       // Lateral wiggle intensity (0=straight, 1=very wavy)
  noiseSpeed: 0.02,       // How fast the wiggle oscillates (lower=smoother)
  wallRepelDist: 40,      // Distance (world px) from wall where repulsion begins
  wallRepelForce: 1.5,    // Strength of wall repulsion (0=off, 3=very strong)
  dotMin: 2,              // Minimum dot radius
  dotMax: 4.5,            // Maximum dot radius
  glowRadius: 2.5,        // Glow size multiplier (1=no glow, 3=large bloom)
  glowOpacity: 0.2,       // Glow alpha (0=off, 1=solid)
  dotOpacity: 0.9,        // Core dot alpha
  respawnThreshold: 15,   // Distance to target edge before recycling (px)
  showDebug: true,        // Show boundary/edge/spine overlays
  showGlow: false,        // Enable glow pass
  showCircleMask: false,  // Show circular clip mask (like production UI)
})

const polygon = (polygonData ?? { boundary: [], islands: [], entryEdge: [], exitEdge: [] }) as unknown as {
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

// --- Distance field for wall repulsion (BFS from boundary cells) ---
function buildDistanceField(grid: Uint8Array): Float32Array {
  const dist = new Float32Array(GRID_DIM * GRID_DIM).fill(Infinity)
  const queue: number[] = []

  // Seed: water cells adjacent to non-water (wall edges)
  for (let gy = 0; gy < GRID_DIM; gy++) {
    for (let gx = 0; gx < GRID_DIM; gx++) {
      if (grid[gy * GRID_DIM + gx] !== 1) continue
      let atEdge = false
      for (let dy = -1; dy <= 1 && !atEdge; dy++) {
        for (let dx = -1; dx <= 1 && !atEdge; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = gx + dx, ny = gy + dy
          if (nx < 0 || nx >= GRID_DIM || ny < 0 || ny >= GRID_DIM || grid[ny * GRID_DIM + nx] !== 1) {
            atEdge = true
          }
        }
      }
      if (atEdge) {
        dist[gy * GRID_DIM + gx] = 0
        queue.push(gy * GRID_DIM + gx)
      }
    }
  }

  // BFS outward into water
  let head = 0
  while (head < queue.length) {
    const idx = queue[head++]!
    const gy = Math.floor(idx / GRID_DIM)
    const gx = idx % GRID_DIM
    const d = dist[idx] ?? 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = gx + dx, ny = gy + dy
        if (nx < 0 || nx >= GRID_DIM || ny < 0 || ny >= GRID_DIM) continue
        const nIdx = ny * GRID_DIM + nx
        if (grid[nIdx] !== 1) continue
        const nd = d + (dx !== 0 && dy !== 0 ? 1.414 : 1)
        if (nd < (dist[nIdx] ?? Infinity)) {
          dist[nIdx] = nd
          queue.push(nIdx)
        }
      }
    }
  }

  return dist
}

/** Get wall repulsion vector at (x,y) using distance field gradient */
function getWallRepulsion(x: number, y: number, distField: Float32Array): { rx: number; ry: number; wallDist: number } {
  const gx = Math.floor(x / GRID_CELL)
  const gy = Math.floor(y / GRID_CELL)
  if (gx < 1 || gx >= GRID_DIM - 1 || gy < 1 || gy >= GRID_DIM - 1) return { rx: 0, ry: 0, wallDist: 0 }

  const wallDist = distField[gy * GRID_DIM + gx]! * GRID_CELL // convert grid units → world px

  // Gradient via central differences (points toward increasing distance = away from wall)
  const dxp = distField[gy * GRID_DIM + gx + 1]!
  const dxm = distField[gy * GRID_DIM + gx - 1]!
  const dyp = distField[(gy + 1) * GRID_DIM + gx]!
  const dym = distField[(gy - 1) * GRID_DIM + gx]!

  let grdx = dxp - dxm
  let grdy = dyp - dym
  const glen = Math.hypot(grdx, grdy) || 1
  grdx /= glen
  grdy /= glen

  return { rx: grdx, ry: grdy, wallDist }
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

function noise(x: number): number {
  return Math.sin(x * 1.7) * 0.5 + Math.sin(x * 3.1 + 1.3) * 0.3 + Math.sin(x * 5.9 + 2.7) * 0.2
}

// --- Particle ---
const WAIT_SECONDS = 2 // How long particles sit at the edge before moving
const GROW_SECONDS = 0.5 // How long the radius grows from 0 → target
const GROW_FRAMES = Math.round(GROW_SECONDS * 60)
interface Particle {
  x: number; y: number
  vx: number; vy: number
  radius: number        // Current visible radius (animated)
  targetRadius: number  // Final radius after grow-in
  noiseOffset: number
  speed: number
  color: string
  waitFrames: number // Countdown frames before particle starts moving
  forward: boolean   // true = entry→exit, false = exit→entry
  exitX: number      // Random target point on destination edge
  exitY: number
}

const COLORS = ['hsl(218,60%,58%)', 'hsl(34,60%,50%)', 'hsl(186,60%,50%)']

// --- Flow spine: waypoints through the channel ---
// Each waypoint has [x, y, width] where width = stream width at that point (px).
// Small width (e.g. 8–12) = single-file through the strait narrows.
// Large width (e.g. 60–100) = particles spread out in open water.
// Order: entry → exit. Particles going "backward" reverse this.
const FLOW_SPINE: [number, number, number][] = [
  [290, 456, 58],    // 0  open water
  [332, 510, 42],    // 1  funneling in
  [390, 548, 34],    // 2  funneling in
  [444, 576, 38],    // 3  approaching strait
  [498, 558, 16],    // 4  strait — single file
  [544, 532, 10],    // 5  strait — narrowest
  [554, 577, 16],    // 6  strait — single file
  [580, 601, 30],    // 7  leaving strait
  [657, 631, 46],    // 8  spreading out
  [773, 705, 110],   // 9  spreading out
  [856, 1044, 344],  // 10 open water
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

/** Find the nearest point on the spine and its tangent + interpolated width */
function spineNearest(px: number, py: number, pts: [number, number, number][], tans: { tx: number; ty: number }[]): { cx: number; cy: number; tx: number; ty: number; dist: number; width: number; segIdx: number; segT: number } {
  let bestDist = Infinity
  let bestCx = 0, bestCy = 0, bestTx = 0, bestTy = 0, bestWidth = 80
  let bestSegIdx = 0, bestSegT = 0
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
      bestSegIdx = i; bestSegT = t
      const t0 = tans[i]!, t1 = tans[i + 1]!
      bestTx = t0.tx + t * (t1.tx - t0.tx)
      bestTy = t0.ty + t * (t1.ty - t0.ty)
      // Interpolate width between waypoints
      bestWidth = pts[i]![2] + t * (pts[i + 1]![2] - pts[i]![2])
    }
  }
  const len = Math.hypot(bestTx, bestTy) || 1
  return { cx: bestCx, cy: bestCy, tx: bestTx / len, ty: bestTy / len, dist: bestDist, width: bestWidth, segIdx: bestSegIdx, segT: bestSegT }
}

// Mutable copy for drag/drop editing (reactive for template bindings)
const spine = reactive(FLOW_SPINE.map(p => [...p] as [number, number, number]))
let { tangents: spineTangents, cumLen: spineCumLen, totalLen: spineTotalLen } = buildSpine(spine)

function rebuildSpine() {
  const s = buildSpine(spine)
  spineTangents = s.tangents
  spineCumLen = s.cumLen
  spineTotalLen = s.totalLen
}

/** Convert a 1D distance along the spine to an (x, y) position + tangent */
function spineAt(d: number, pts: [number, number, number][]): { x: number; y: number; tx: number; ty: number } {
  d = Math.max(0, Math.min(d, spineTotalLen))
  for (let i = 0; i < pts.length - 1; i++) {
    const segStart = spineCumLen[i]!
    const segEnd = spineCumLen[i + 1]!
    if (d <= segEnd || i === pts.length - 2) {
      const segLen = segEnd - segStart
      const t = segLen > 0 ? (d - segStart) / segLen : 0
      const x = pts[i]![0] + t * (pts[i + 1]![0] - pts[i]![0])
      const y = pts[i]![1] + t * (pts[i + 1]![1] - pts[i]![1])
      const tan = spineTangents[i]!
      return { x, y, tx: tan.tx, ty: tan.ty }
    }
  }
  // Fallback (should never reach)
  const last = pts[pts.length - 1]!
  const lastTan = spineTangents[spineTangents.length - 1]!
  return { x: last[0], y: last[1], tx: lastTan.tx, ty: lastTan.ty }
}

/** Convert segIdx + segT from spineNearest into a 1D distance along the spine */
function spineDistance(segIdx: number, segT: number): number {
  return spineCumLen[segIdx]! + segT * (spineCumLen[segIdx + 1]! - spineCumLen[segIdx]!)
}

// Drag state
let dragIdx: number | null = null
const HIT_RADIUS = 14 // px tolerance for grabbing a waypoint
let animId: number | null = null

onMounted(() => {
  if (!import.meta.dev) return
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
      rebuildSpine()
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
  const distField = buildDistanceField(grid)

  function spawn(): Particle {
    const forward = Math.random() > 0.5
    const spawnEdge = forward ? polygon.entryEdge : polygon.exitEdge
    const destEdge = forward ? polygon.exitEdge : polygon.entryEdge
    const pos = randomPointOnEdge(spawnEdge)
    const exit = randomPointOnEdge(destEdge)
    const speed = params.speed * (1 - params.speedVariation + Math.random() * params.speedVariation * 2)
    // Spawn static — particle waits at edge before moving
    const targetR = params.dotMin + Math.random() * (params.dotMax - params.dotMin)
    return {
      x: pos.x, y: pos.y,
      vx: 0, vy: 0,
      radius: 0,
      targetRadius: targetR,
      noiseOffset: Math.random() * 1000,
      speed,
      color: COLORS[Math.floor(Math.random() * 3)]!,
      waitFrames: Math.round(WAIT_SECONDS * 60), // ~2s at 60fps
      forward,
      exitX: exit.x, exitY: exit.y,
    }
  }

  function respawn(p: Particle) {
    Object.assign(p, spawn())
  }

  // Build particles, scatter some along their path
  const particles: Particle[] = []
  const waitBudget = Math.round(WAIT_SECONDS * 60)
  for (let i = 0; i < params.particleCount; i++) {
    const p = spawn()
    // Stagger initial particles: some already waiting, some already in-flight
    p.waitFrames = Math.floor(Math.random() * waitBudget)
    // Pre-grow radius for particles that have already been "waiting"
    const elapsed = waitBudget - p.waitFrames
    p.radius = p.targetRadius * Math.min(elapsed / GROW_FRAMES, 1)
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

    // Cap particle count
    while (particles.length > params.particleCount) particles.pop()

    // Constant influx: spawn new particles at edges every frame (up to budget)
    const spawnCount = Math.min(params.spawnRate, params.particleCount - particles.length)
    for (let s = 0; s < spawnCount; s++) particles.push(spawn())

    // Update particles
    const STRAIT_THRESHOLD = 30 // width below this = "in the strait"
    const STRAIT_SPEED_MULT = 0.7 // 70% of min speed in strait
    const minSpeed = params.speed * (1 - params.speedVariation)

    for (const p of particles) {
      // Wait phase: particle sits at edge, then launches toward nearest waypoint
      if (p.waitFrames > 0) {
        p.waitFrames -= dt
        // Grow radius from 0 → targetRadius over GROW_FRAMES
        const totalWait = Math.round(WAIT_SECONDS * 60)
        const elapsed = totalWait - p.waitFrames
        const growT = Math.min(elapsed / GROW_FRAMES, 1)
        p.radius = p.targetRadius * growT
        if (p.waitFrames <= 0) {
          // Launch: aim toward nearby waypoints based on spawn edge
          // Entry (green) → waypoints 0 or 1, Exit (pink) → waypoints 9 or 10
          const targets = p.forward
            ? [spine[0]!, spine[1]!]
            : [spine[spine.length - 1]!, spine[spine.length - 2]!]
          // Pick the closer of the two target waypoints
          let bestDist = Infinity, bestWp = targets[0]!
          for (const wp of targets) {
            const d = Math.hypot(p.x - wp[0], p.y - wp[1])
            if (d < bestDist) { bestDist = d; bestWp = wp }
          }
          const dx = bestWp[0] - p.x, dy = bestWp[1] - p.y
          const dLen = Math.hypot(dx, dy) || 1
          p.vx = (dx / dLen) * p.speed
          p.vy = (dy / dLen) * p.speed
        }
        continue
      }

      // Direction from spawn edge
      const forward = p.forward
      const sign = forward ? 1 : -1

      // Find nearest spine point + tangent
      const near = spineNearest(p.x, p.y, spine, spineTangents)

      // Width = local stream width from spine interpolation (small = narrow strait)
      const localWidth = Math.max(near.width, 2)
      const inStrait = localWidth < STRAIT_THRESHOLD
      // "Near strait" = within 1.5x threshold — disable boundary checks in this zone too
      const nearStrait = localWidth < STRAIT_THRESHOLD * 1.5
      // narrowFactor: 0 = deep in strait, 1 = wide open water
      const narrowFactor = Math.min(localWidth / STRAIT_THRESHOLD, 1)

      if (inStrait) {
        // --- STRAIT MODE: 1D advancement along spine polyline ---
        // No projection, no tangents blending, no boundary checks.
        // Convert position to distance-along-spine, advance, convert back.
        const straitSpeed = minSpeed * STRAIT_SPEED_MULT

        // Current distance along spine
        const d = spineDistance(near.segIdx, near.segT)
        // Advance along the polyline
        const newD = d + sign * straitSpeed * dt
        const pos = spineAt(newD, spine)

        // Teleport to new position on spine (single-file, no oscillation)
        p.x = pos.x
        p.y = pos.y
        p.vx = sign * pos.tx * straitSpeed
        p.vy = sign * pos.ty * straitSpeed
      } else {
        // --- OPEN WATER MODE: steering + wall repulsion + noise ---
        const localPull = params.spinePull

        // Pull strength increases with distance from spine (clamped by width)
        const pullStrength = Math.min(near.dist / localWidth, 1) * localPull
        const toCx = near.dist > 0 ? (near.cx - p.x) / near.dist : 0
        const toCy = near.dist > 0 ? (near.cy - p.y) / near.dist : 0

        // Desired direction: blend spine tangent with pull toward center
        let desiredX = sign * near.tx * (1 - pullStrength) + toCx * pullStrength
        let desiredY = sign * near.ty * (1 - pullStrength) + toCy * pullStrength

        // Near the end of the spine, steer toward personal exit point
        const lastSeg = spine.length - 2
        const isNearEnd = forward ? near.segIdx >= lastSeg - 1 : near.segIdx <= 1
        const distToExit = Math.hypot(p.exitX - p.x, p.exitY - p.y)
        if (isNearEnd) {
          const toExitDx = p.exitX - p.x, toExitDy = p.exitY - p.y
          const toExitLen = distToExit || 1
          // Blend ramps up: at 200px away → 0.3, at 50px → 0.9+
          const exitBlend = Math.min(1, 100 / toExitLen) * 0.9
          desiredX = desiredX * (1 - exitBlend) + (toExitDx / toExitLen) * exitBlend
          desiredY = desiredY * (1 - exitBlend) + (toExitDy / toExitLen) * exitBlend
        }

        // Wall repulsion (disabled near strait and near exit point)
        if (!nearStrait && distToExit > 60) {
          const wall = getWallRepulsion(p.x, p.y, distField)
          if (wall.wallDist < params.wallRepelDist && params.wallRepelForce > 0) {
            const repelT = 1 - wall.wallDist / params.wallRepelDist
            const repelMag = repelT * repelT * params.wallRepelForce
            desiredX += wall.rx * repelMag
            desiredY += wall.ry * repelMag
          }
        }

        const desiredLen = Math.hypot(desiredX, desiredY) || 1
        desiredX /= desiredLen
        desiredY /= desiredLen

        // Steer current velocity toward desired
        const steer = params.steer
        p.vx = p.vx * (1 - steer) + desiredX * p.speed * steer
        p.vy = p.vy * (1 - steer) + desiredY * p.speed * steer

        // Renormalize to particle speed
        const vLen = Math.hypot(p.vx, p.vy) || 1
        p.vx = (p.vx / vLen) * p.speed
        p.vy = (p.vy / vLen) * p.speed

        // Add lateral noise (scaled by narrowFactor for smooth transition)
        const time = frameCount * params.noiseSpeed + p.noiseOffset
        const distScale = Math.max(0.05, 1 - near.dist / (localWidth * 1.25))
        const lateral = noise(time) * p.speed * params.noiseAmount * distScale * narrowFactor
        const perpX = -p.vy / p.speed, perpY = p.vx / p.speed

        const step = p.speed * dt

        // Near the strait entrance or exit point: skip boundary checks, just move
        if (nearStrait || distToExit < 60) {
          p.x += (p.vx + perpX * lateral) * dt
          p.y += (p.vy + perpY * lateral) * dt
        } else {
          // Try candidate positions with boundary checking
          const candidates: [number, number, number, number][] = [
            [p.x + (p.vx + perpX * lateral) * dt, p.y + (p.vy + perpY * lateral) * dt, p.vx, p.vy],
            [p.x + p.vx * dt, p.y + p.vy * dt, p.vx, p.vy],
            [p.x + desiredX * step, p.y + desiredY * step, desiredX * p.speed, desiredY * p.speed],
            [p.x + toCx * step, p.y + toCy * step, toCx * p.speed, toCy * p.speed],
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
            // Last resort: teleport to spine centerline
            p.x = near.cx; p.y = near.cy
            p.vx = sign * near.tx * p.speed
            p.vy = sign * near.ty * p.speed
          }
        }
      }

      // Check if reached personal exit point (use generous threshold since exit is on boundary)
      const dExit = Math.hypot(p.x - p.exitX, p.y - p.exitY)
      if (dExit < params.respawnThreshold * 2) { respawn(p) }
      // Also respawn if particle leaves the canvas
      else if (p.x < -10 || p.x > SIZE + 10 || p.y < -10 || p.y > SIZE + 10) { respawn(p) }
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

    // Waypoint width circles + dots + labels
    for (let i = 0; i < spine.length; i++) {
      const [wx, wy, ww] = spine[i]!
      // Width circle (shows pull radius)
      ctx!.strokeStyle = ww < 30 ? 'rgba(255, 100, 100, 0.5)' : 'rgba(0, 255, 255, 0.3)'
      ctx!.lineWidth = 1
      ctx!.setLineDash([4, 4])
      ctx!.beginPath()
      ctx!.arc(wx, wy, ww, 0, TAU)
      ctx!.stroke()
      ctx!.setLineDash([])
      // Dot
      ctx!.fillStyle = ww < 30 ? 'rgba(255, 100, 100, 1)' : 'rgba(0, 255, 255, 1)'
      ctx!.beginPath()
      ctx!.arc(wx, wy, 6, 0, TAU)
      ctx!.fill()
      // Label
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

    // Circle mask: cover everything outside a centered circle (like the strait circle UI)
    if (params.showCircleMask) {
      const cx = SIZE / 2, cy = SIZE / 2
      const r = SIZE / 2
      ctx!.save()
      ctx!.fillStyle = '#1a1a2e' // dark background matching the infographic
      ctx!.beginPath()
      ctx!.rect(0, 0, SIZE, SIZE)
      ctx!.arc(cx, cy, r, 0, TAU, true) // cut out the circle (counter-clockwise)
      ctx!.fill()
      // Circle border
      ctx!.strokeStyle = 'hsla(218, 60%, 58%, 0.6)'
      ctx!.lineWidth = 3
      ctx!.beginPath()
      ctx!.arc(cx, cy, r, 0, TAU)
      ctx!.stroke()
      ctx!.restore()
    }

    animId = requestAnimationFrame(tick)
  }

  animId = requestAnimationFrame(tick)
})

let cleanupListeners: (() => void) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pane: any = null

// Tweakpane setup — runs after DOM is ready (dynamic import to avoid production bundling)
onMounted(async () => {
  if (!import.meta.dev) return
  const { Pane } = await import('tweakpane')
  pane = new Pane({ title: 'Particle Controls' }) as any

  // Flow & Movement
  const flow = pane.addFolder({ title: 'Flow & Movement' })
  flow.addBinding(params, 'particleCount', { label: 'Count', min: 10, max: 500, step: 10 })
  flow.addBinding(params, 'spawnRate', { label: 'Spawn/frame', min: 0.5, max: 10, step: 0.5 })
  flow.addBinding(params, 'speed', { label: 'Speed', min: 0.1, max: 5, step: 0.1 })
  flow.addBinding(params, 'speedVariation', { label: 'Speed var', min: 0, max: 1, step: 0.05 })

  // Steering
  const steer = pane.addFolder({ title: 'Steering' })
  steer.addBinding(params, 'steer', { label: 'Steer', min: 0, max: 1, step: 0.05 })
  steer.addBinding(params, 'spinePull', { label: 'Spine pull', min: 0, max: 2, step: 0.05 })

  // Organic Motion
  const motion = pane.addFolder({ title: 'Organic Motion' })
  motion.addBinding(params, 'noiseAmount', { label: 'Noise amt', min: 0, max: 1, step: 0.05 })
  motion.addBinding(params, 'noiseSpeed', { label: 'Noise spd', min: 0.005, max: 0.1, step: 0.005 })

  // Wall Repulsion
  const walls = pane.addFolder({ title: 'Wall Repulsion' })
  walls.addBinding(params, 'wallRepelDist', { label: 'Repel dist', min: 5, max: 100, step: 5 })
  walls.addBinding(params, 'wallRepelForce', { label: 'Repel force', min: 0, max: 5, step: 0.1 })

  // Appearance
  const appearance = pane.addFolder({ title: 'Appearance' })
  appearance.addBinding(params, 'dotMin', { label: 'Dot min', min: 0.5, max: 6, step: 0.5 })
  appearance.addBinding(params, 'dotMax', { label: 'Dot max', min: 1, max: 10, step: 0.5 })
  appearance.addBinding(params, 'dotOpacity', { label: 'Dot alpha', min: 0.1, max: 1, step: 0.05 })
  appearance.addBinding(params, 'showGlow', { label: 'Glow' })
  appearance.addBinding(params, 'glowRadius', { label: 'Glow size', min: 1, max: 5, step: 0.5 })
  appearance.addBinding(params, 'glowOpacity', { label: 'Glow alpha', min: 0, max: 0.6, step: 0.05 })

  // Waypoint Width — sync a plain object with the reactive spine array
  const widthFolder = pane.addFolder({ title: 'Waypoint Width (px)' })
  const widthParams: Record<string, number> = {}
  for (let i = 0; i < spine.length; i++) {
    const key = `pt${i}`
    widthParams[key] = spine[i]![2]
    widthFolder.addBinding(widthParams, key, { label: `Pt ${i}`, min: 2, max: 400, step: 2 })
      .on('change', (ev: { value: number }) => { spine[i][2] = ev.value; rebuildSpine() })
  }

  // Debug
  const debug = pane.addFolder({ title: 'Debug' })
  debug.addBinding(params, 'showDebug', { label: 'Borders & Waypoints' })
  debug.addBinding(params, 'showCircleMask', { label: 'Circle Mask' })
  debug.addBinding(params, 'respawnThreshold', { label: 'Respawn px', min: 5, max: 60, step: 5 })

  // Copy all tuning state
  pane.addButton({ title: 'Copy All Tuning' }).on('click', () => {
    const state = {
      params: { ...params },
      spine: spine.map(p => [p[0], p[1], p[2]]),
    }
    navigator.clipboard.writeText(JSON.stringify(state, null, 2))
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
      <p><span class="swatch cyan" /> Spine — wide</p>
      <p><span class="swatch coral" /> Spine — strait (single file)</p>
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
.swatch.coral { background: rgba(255, 100, 100, 0.9); }
.swatch.blue { background: hsl(218, 60%, 58%); }
</style>
