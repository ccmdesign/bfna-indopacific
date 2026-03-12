/**
 * particleEngine — Pure physics engine for strait particle flow.
 *
 * Zero Vue/DOM/Canvas dependencies. All geometry, simulation, and
 * containment logic lives here so it can be shared by the composable
 * (useParticleFlow) and tested in isolation.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const WORLD_SIZE = 1080
export const GRID_CELL = 4
export const GRID_DIM = WORLD_SIZE / GRID_CELL // 270
const TAU = Math.PI * 2

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StraitFlowConfig {
  id: string
  polygonPath: string
  backgroundImage: string
  particleCount: number
  spines: SpineBranch[]
  spawnZones: {
    entry: { start: number; end: number }
    exit: { start: number; end: number }
  }
  exitEdgeExtensions?: [number, number][]
}

export interface SpineBranch {
  waypoints: [number, number, number, number][] // [x, y, width, speed]
  ratio: number // fraction of particles on this branch (all sum to 1)
}

export interface SpineData {
  pts: [number, number, number, number][]
  tangents: { tx: number; ty: number }[]
  cumLen: number[]
  totalLen: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  targetRadius: number
  noiseOffset: number
  speed: number
  color: string
  waitFrames: number
  forward: boolean
  exitX: number
  exitY: number
  branchIdx: number
  waypointIdx: number
  stuckX: number
  stuckY: number
  stuckFrames: number
  opacity: number       // 1.0 = fully visible, fades to 0
  fadeRate: number       // 0 = not fading, >0 = decrement per frame
}

export interface FlowParams {
  particleCount: number
  spawnRate: number
  speed: number
  speedVariation: number
  steer: number
  spinePull: number
  noiseAmount: number
  noiseSpeed: number
  wallRepelDist: number
  wallRepelForce: number
  dotMin: number
  dotMax: number
  glowRadius: number
  glowOpacity: number
  dotOpacity: number
  respawnThreshold: number
  branchBRatio: number
  showDebug: boolean
  showGlow: boolean
  showCircleMask: boolean
}

export interface StraitPolygon {
  viewBox?: [number, number, number, number]
  boundary: [number, number][]
  islands: [number, number][][]
  entryEdge: [number, number][]
  exitEdge: [number, number][]
}

export interface SpineNearestResult {
  cx: number
  cy: number
  tx: number
  ty: number
  dist: number
  width: number
  speedMult: number
  segIdx: number
  segT: number
}

// ---------------------------------------------------------------------------
// Default params
// ---------------------------------------------------------------------------

export function defaultFlowParams(overrides?: Partial<FlowParams>): FlowParams {
  return {
    particleCount: 120,
    spawnRate: 2,
    speed: 1.2,
    speedVariation: 0.4,
    steer: 0.3,
    spinePull: 0.5,
    noiseAmount: 0.2,
    noiseSpeed: 0.02,
    wallRepelDist: 40,
    wallRepelForce: 1.5,
    dotMin: 2,
    dotMax: 4.5,
    glowRadius: 2.5,
    glowOpacity: 0.2,
    dotOpacity: 0.9,
    respawnThreshold: 15,
    branchBRatio: 0.3,
    showDebug: false,
    showGlow: false,
    showCircleMask: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Pure geometry functions
// ---------------------------------------------------------------------------

/** Ray-casting point-in-polygon test */
export function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
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

/** Rasterize polygon to a Uint8Array grid for O(1) containment lookup */
export function rasterizePolygon(polygon: StraitPolygon): Uint8Array {
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

/** O(1) grid lookup for containment */
export function isInWater(x: number, y: number, grid: Uint8Array): boolean {
  const gx = Math.floor(x / GRID_CELL)
  const gy = Math.floor(y / GRID_CELL)
  if (gx < 0 || gx >= GRID_DIM || gy < 0 || gy >= GRID_DIM) return false
  return grid[gy * GRID_DIM + gx] === 1
}

/** BFS distance field from boundary cells for wall repulsion */
export function buildDistanceField(grid: Uint8Array): Float32Array {
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

  // BFS outward into water.
  // Note: Uses push/head++ pattern — processed entries remain in the array.
  // Acceptable trade-off: runs once at init on a 270x270 grid (~150KB peak).
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
export function getWallRepulsion(x: number, y: number, distField: Float32Array): { rx: number; ry: number; wallDist: number } {
  const gx = Math.floor(x / GRID_CELL)
  const gy = Math.floor(y / GRID_CELL)
  if (gx < 1 || gx >= GRID_DIM - 1 || gy < 1 || gy >= GRID_DIM - 1) return { rx: 0, ry: 0, wallDist: 0 }

  const wallDist = distField[gy * GRID_DIM + gx]! * GRID_CELL

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

// ---------------------------------------------------------------------------
// Edge helpers
// ---------------------------------------------------------------------------

/** Precompute cumulative lengths for an edge polyline */
export function edgeLengths(edge: [number, number][]): { lengths: number[]; total: number } {
  const lengths: number[] = [0]
  for (let i = 1; i < edge.length; i++) {
    const dx = edge[i]![0] - edge[i - 1]![0]
    const dy = edge[i]![1] - edge[i - 1]![1]
    lengths.push(lengths[i - 1]! + Math.hypot(dx, dy))
  }
  return { lengths, total: lengths[lengths.length - 1]! }
}

/** Sample a point at a given distance along the edge */
export function pointAtDistance(edge: [number, number][], lengths: number[], target: number): { x: number; y: number } {
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
  return { x: edge[edge.length - 1]![0], y: edge[edge.length - 1]![1] }
}

/** Pick a random point on the edge within [rangeStart, rangeEnd] (0-1 fractions) */
export function randomPointOnEdge(edge: [number, number][], rangeStart = 0, rangeEnd = 1): { x: number; y: number } {
  if (edge.length < 2) return { x: edge[0]![0], y: edge[0]![1] }
  const { lengths, total } = edgeLengths(edge)
  const lo = rangeStart * total
  const hi = rangeEnd * total
  const target = lo + Math.random() * (hi - lo)
  return pointAtDistance(edge, lengths, target)
}

/** Simple sine-based pseudo-noise for organic drift */
export function noise(x: number): number {
  return Math.sin(x * 1.7) * 0.5 + Math.sin(x * 3.1 + 1.3) * 0.3 + Math.sin(x * 5.9 + 2.7) * 0.2
}

// ---------------------------------------------------------------------------
// Spine helpers
// ---------------------------------------------------------------------------

/** Precompute spine segment tangents and cumulative lengths */
export function buildSpine(pts: [number, number, number, number][]): SpineData {
  const tangents: { tx: number; ty: number }[] = []
  const cumLen: number[] = [0]
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1]![0] - pts[i]![0]
    const dy = pts[i + 1]![1] - pts[i]![1]
    const len = Math.hypot(dx, dy) || 1
    tangents.push({ tx: dx / len, ty: dy / len })
    cumLen.push(cumLen[i]! + len)
  }
  tangents.push(tangents[tangents.length - 1]!)
  return { pts, tangents, cumLen, totalLen: cumLen[cumLen.length - 1]! }
}

/** Find the nearest point on the spine with optional segment constraint */
export function spineNearest(
  px: number, py: number,
  pts: [number, number, number, number][],
  tangents: { tx: number; ty: number }[],
  segStart = 0,
  segEnd?: number,
): SpineNearestResult {
  const end = Math.min(segEnd ?? pts.length - 1, pts.length - 1)
  let bestDist = Infinity
  let bestCx = 0, bestCy = 0, bestTx = 0, bestTy = 0, bestWidth = 80, bestSpeedMult = 1
  let bestSegIdx = segStart, bestSegT = 0
  for (let i = segStart; i < end; i++) {
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
      const t0 = tangents[i]!, t1 = tangents[i + 1]!
      bestTx = t0.tx + t * (t1.tx - t0.tx)
      bestTy = t0.ty + t * (t1.ty - t0.ty)
      bestWidth = pts[i]![2] + t * (pts[i + 1]![2] - pts[i]![2])
      bestSpeedMult = pts[i]![3] + t * (pts[i + 1]![3] - pts[i]![3])
    }
  }
  const len = Math.hypot(bestTx, bestTy) || 1
  return {
    cx: bestCx, cy: bestCy,
    tx: bestTx / len, ty: bestTy / len,
    dist: bestDist, width: bestWidth, speedMult: bestSpeedMult,
    segIdx: bestSegIdx, segT: bestSegT,
  }
}

/** Convert a 1D distance along the spine to an (x, y) position + tangent */
export function spineAt(d: number, sd: SpineData): { x: number; y: number; tx: number; ty: number } {
  const pts = sd.pts
  d = Math.max(0, Math.min(d, sd.totalLen))
  for (let i = 0; i < pts.length - 1; i++) {
    const segStart = sd.cumLen[i]!
    const segEnd = sd.cumLen[i + 1]!
    if (d <= segEnd || i === pts.length - 2) {
      const segLen = segEnd - segStart
      const t = segLen > 0 ? (d - segStart) / segLen : 0
      const x = pts[i]![0] + t * (pts[i + 1]![0] - pts[i]![0])
      const y = pts[i]![1] + t * (pts[i + 1]![1] - pts[i]![1])
      const tan = sd.tangents[i]!
      return { x, y, tx: tan.tx, ty: tan.ty }
    }
  }
  const last = pts[pts.length - 1]!
  const lastTan = sd.tangents[sd.tangents.length - 1]!
  return { x: last[0], y: last[1], tx: lastTan.tx, ty: lastTan.ty }
}

/** Convert segIdx + segT from spineNearest into a 1D distance */
export function spineDistance(segIdx: number, segT: number, sd: SpineData): number {
  return sd.cumLen[segIdx]! + segT * (sd.cumLen[segIdx + 1]! - sd.cumLen[segIdx]!)
}

/** Find the nearest point on a boundary polygon.
 *  Currently unused internally -- retained as public API. */
export function nearestBoundaryPoint(px: number, py: number, boundary: [number, number][]): { x: number; y: number } {
  let bestDist = Infinity, bestX = 0, bestY = 0
  for (let i = 0; i < boundary.length; i++) {
    const ax = boundary[i]![0], ay = boundary[i]![1]
    const bx = boundary[(i + 1) % boundary.length]![0], by = boundary[(i + 1) % boundary.length]![1]
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const cx = ax + t * dx, cy = ay + t * dy
    const d = Math.hypot(px - cx, py - cy)
    if (d < bestDist) { bestDist = d; bestX = cx; bestY = cy }
  }
  return { x: bestX, y: bestY }
}

// ---------------------------------------------------------------------------
// ParticleSimulation
// ---------------------------------------------------------------------------

const WAIT_SECONDS = 2
const GROW_SECONDS = 0.5
const GROW_FRAMES = Math.round(GROW_SECONDS * 60)
const STRAIT_THRESHOLD = 30
const STUCK_RADIUS = 12
const STUCK_SECONDS = 2
const STUCK_FRAMES = Math.round(STUCK_SECONDS * 60)
const SPAWN_INTERVAL = 30
const SPAWN_BATCH_FRAC = 0.05
const FADE_SECONDS = 0.5
const FADE_RATE = 1 / (FADE_SECONDS * 60) // ~0.033 per frame
const COLORS = ['hsl(218,60%,58%)', 'hsl(34,60%,50%)', 'hsl(186,60%,50%)']

export class ParticleSimulation {
  grid: Uint8Array | null = null
  distField: Float32Array | null = null
  spineDataArr: SpineData[] = []
  particles: Particle[] = []
  polygon: StraitPolygon | null = null
  frameCount = 0

  private config: StraitFlowConfig
  private params: FlowParams
  private spawnAccum = SPAWN_INTERVAL

  constructor(config: StraitFlowConfig, params: FlowParams) {
    this.config = config
    this.params = params
  }

  /** Initialize grid, distance field, and spines from a loaded polygon */
  init(polygon: StraitPolygon, spinePtsArrays: [number, number, number, number][][]) {
    // Clone polygon to avoid mutating the module-cached import data.
    // Without this, exitEdgeExtensions would be prepended repeatedly
    // on each init() call since dynamic import() caches the module.
    let poly = polygon
    if (this.config.exitEdgeExtensions?.length) {
      poly = {
        ...polygon,
        exitEdge: [
          ...this.config.exitEdgeExtensions.map(p => p as [number, number]),
          ...polygon.exitEdge,
        ],
      }
    }

    this.polygon = poly
    this.grid = rasterizePolygon(poly)
    this.distField = buildDistanceField(this.grid)
    this.spineDataArr = spinePtsArrays.map(pts => buildSpine(pts))
    this.particles = []
    this.spawnAccum = SPAWN_INTERVAL
    this.frameCount = 0
  }

  /** Reset simulation (reuse existing grid/distField, clear particles) */
  reset() {
    this.particles = []
    this.spawnAccum = SPAWN_INTERVAL
    this.frameCount = 0
  }

  /** Advance simulation by dt (in units of 16.667ms frames) */
  tick(dt: number) {
    if (!this.grid || !this.distField || !this.polygon) return

    this.frameCount++
    const params = this.params
    const particles = this.particles

    // Cap particle count
    while (particles.length > params.particleCount) particles.pop()

    // Progressive spawn
    if (particles.length < params.particleCount) {
      this.spawnAccum += dt
      if (this.spawnAccum >= SPAWN_INTERVAL) {
        this.spawnAccum -= SPAWN_INTERVAL
        const batchSize = Math.ceil(params.particleCount * SPAWN_BATCH_FRAC)
        const toSpawn = Math.min(batchSize, params.particleCount - particles.length)
        for (let s = 0; s < toSpawn; s++) particles.push(this.spawn())
      }
    }

    // Update all particles
    for (const p of particles) {
      this.updateParticle(p, dt)
    }
  }

  private spawn(): Particle {
    const params = this.params
    const polygon = this.polygon!
    const forward = Math.random() > 0.5
    const spawnEdge = forward ? polygon.entryEdge : polygon.exitEdge
    const destEdge = forward ? polygon.exitEdge : polygon.entryEdge
    const spawnStart = forward ? this.config.spawnZones.entry.start : this.config.spawnZones.exit.start
    const spawnEnd = forward ? this.config.spawnZones.entry.end : this.config.spawnZones.exit.end
    const exitStart = forward ? this.config.spawnZones.exit.start : this.config.spawnZones.entry.start
    const exitEnd = forward ? this.config.spawnZones.exit.end : this.config.spawnZones.entry.end
    const pos = randomPointOnEdge(spawnEdge, spawnStart, spawnEnd)
    const exit = randomPointOnEdge(destEdge, exitStart, exitEnd)
    const speed = params.speed * (1 - params.speedVariation + Math.random() * params.speedVariation * 2)
    const targetR = params.dotMin + Math.random() * (params.dotMax - params.dotMin)

    // Assign branch based on ratios
    let branchIdx = 0
    if (this.config.spines.length > 1) {
      const roll = Math.random()
      let cumRatio = 0
      for (let i = 0; i < this.config.spines.length; i++) {
        cumRatio += this.config.spines[i]!.ratio
        if (roll < cumRatio) { branchIdx = i; break }
      }
    }

    return {
      x: pos.x, y: pos.y,
      vx: 0, vy: 0,
      radius: 0,
      targetRadius: targetR,
      noiseOffset: Math.random() * 1000,
      speed,
      color: COLORS[Math.floor(Math.random() * 3)]!,
      waitFrames: Math.round(WAIT_SECONDS * 60),
      forward,
      exitX: exit.x, exitY: exit.y,
      branchIdx,
      waypointIdx: -1,
      stuckX: pos.x, stuckY: pos.y,
      stuckFrames: 0,
      opacity: 1,
      fadeRate: 0,
    }
  }

  private respawn(p: Particle) {
    Object.assign(p, this.spawn())
  }

  private updateParticle(p: Particle, dt: number) {
    const params = this.params
    const grid = this.grid!
    const distField = this.distField!
    const polygon = this.polygon!

    const sd = this.spineDataArr[p.branchIdx]
    if (!sd) { this.respawn(p); return }
    const spinePts = sd.pts

    // Fade-out phase: decrement opacity, freeze position
    if (p.fadeRate > 0) {
      p.opacity = Math.max(0, p.opacity - p.fadeRate * dt)
      if (p.opacity <= 0) {
        this.respawn(p)
      }
      return
    }

    // Wait phase
    if (p.waitFrames > 0) {
      p.waitFrames -= dt
      const totalWait = Math.round(WAIT_SECONDS * 60)
      const elapsed = totalWait - p.waitFrames
      const growT = Math.min(elapsed / GROW_FRAMES, 1)
      p.radius = p.targetRadius * growT
      if (p.waitFrames <= 0) {
        // Launch: find nearest waypoint
        let nearestIdx = 0, nearestDist = Infinity
        for (let i = 0; i < spinePts.length; i++) {
          const d = Math.hypot(p.x - spinePts[i]![0], p.y - spinePts[i]![1])
          if (d < nearestDist) { nearestDist = d; nearestIdx = i }
        }
        p.waypointIdx = nearestIdx
        const target = spinePts[p.waypointIdx]!
        const dx = target[0] - p.x, dy = target[1] - p.y
        const dLen = Math.hypot(dx, dy) || 1
        p.vx = (dx / dLen) * p.speed
        p.vy = (dy / dLen) * p.speed
      }
      return
    }

    const forward = p.forward
    const sign = forward ? 1 : -1

    // Safety: if waypointIdx is out of range, respawn
    if (p.waypointIdx < 0 || p.waypointIdx >= spinePts.length) { this.respawn(p); return }

    // Constrained spine search (3-segment window for monotonic advancement)
    const wpIdx = p.waypointIdx
    const prevWpIdx = forward ? Math.max(0, wpIdx - 1) : Math.min(spinePts.length - 1, wpIdx + 1)
    const segLo = Math.min(prevWpIdx, wpIdx)
    const segHi = Math.max(prevWpIdx, wpIdx) + 1

    const near = spineNearest(p.x, p.y, spinePts, sd.tangents, segLo, segHi)

    const localWidth = Math.max(near.width, 2)
    const inStrait = localWidth < STRAIT_THRESHOLD
    const nearStrait = localWidth < STRAIT_THRESHOLD * 1.5
    const narrowFactor = Math.min(localWidth / STRAIT_THRESHOLD, 1)

    if (inStrait) {
      // STRAIT MODE: 1D advancement along spine polyline
      const straitSpeed = p.speed * near.speedMult
      const d = spineDistance(near.segIdx, near.segT, sd)
      const newD = d + sign * straitSpeed * dt
      const pos = spineAt(newD, sd)

      p.x = pos.x
      p.y = pos.y
      p.vx = sign * pos.tx * straitSpeed
      p.vy = sign * pos.ty * straitSpeed

      // Check if we passed the target waypoint
      const straitTargetD = sd.cumLen[wpIdx]!
      if (forward ? newD >= straitTargetD : newD <= straitTargetD) {
        p.waypointIdx += sign
        if (p.waypointIdx < 0 || p.waypointIdx >= spinePts.length) { this.respawn(p); return }
      }
    } else {
      // OPEN WATER MODE: steering + wall repulsion + noise
      const localPull = params.spinePull
      const pullStrength = Math.min(near.dist / localWidth, 1) * localPull
      const toCx = near.dist > 0 ? (near.cx - p.x) / near.dist : 0
      const toCy = near.dist > 0 ? (near.cy - p.y) / near.dist : 0

      // Direction toward target waypoint
      const targetWp = spinePts[wpIdx]!
      const toWpDx = targetWp[0] - p.x, toWpDy = targetWp[1] - p.y
      const toWpLen = Math.hypot(toWpDx, toWpDy) || 1
      const wpDirX = toWpDx / toWpLen, wpDirY = toWpDy / toWpLen

      let desiredX = wpDirX * (1 - pullStrength) + toCx * pullStrength
      let desiredY = wpDirY * (1 - pullStrength) + toCy * pullStrength

      // Near the end of the spine, steer toward personal exit point
      const lastSeg = spinePts.length - 2
      const isNearEnd = forward ? near.segIdx >= lastSeg - 1 : near.segIdx <= 1
      const distToExit = Math.hypot(p.exitX - p.x, p.exitY - p.y)
      if (isNearEnd) {
        const toExitDx = p.exitX - p.x, toExitDy = p.exitY - p.y
        const toExitLen = distToExit || 1
        const exitBlend = Math.min(1, 100 / toExitLen) * 0.9
        desiredX = desiredX * (1 - exitBlend) + (toExitDx / toExitLen) * exitBlend
        desiredY = desiredY * (1 - exitBlend) + (toExitDy / toExitLen) * exitBlend
      }

      // Wall repulsion
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

      const localSpeed = p.speed * near.speedMult
      const steer = params.steer
      p.vx = p.vx * (1 - steer) + desiredX * localSpeed * steer
      p.vy = p.vy * (1 - steer) + desiredY * localSpeed * steer

      const vLen = Math.hypot(p.vx, p.vy) || 1
      p.vx = (p.vx / vLen) * localSpeed
      p.vy = (p.vy / vLen) * localSpeed

      // Lateral noise
      const time = this.frameCount * params.noiseSpeed + p.noiseOffset
      const distScale = Math.max(0.05, 1 - near.dist / (localWidth * 1.25))
      const lateral = noise(time) * localSpeed * params.noiseAmount * distScale * narrowFactor
      const perpX = -p.vy / localSpeed, perpY = p.vx / localSpeed

      const step = localSpeed * dt

      if (nearStrait || distToExit < 60) {
        p.x += (p.vx + perpX * lateral) * dt
        p.y += (p.vy + perpY * lateral) * dt
      } else {
        // Candidate positions with boundary checking
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

    // Edge collision: particle left water polygon -> dock fade-out
    // Skip for strait-mode particles: spineAt() positions them on the polyline,
    // which may cross non-water grid cells due to 4px quantization.
    if (!inStrait && !isInWater(p.x, p.y, grid)) {
      p.vx = 0
      p.vy = 0
      p.fadeRate = FADE_RATE
      return
    }

    // Stuck detection -- trigger fade instead of boundary steering
    const dFromRef = Math.hypot(p.x - p.stuckX, p.y - p.stuckY)
    if (dFromRef < STUCK_RADIUS) {
      p.stuckFrames += dt
      if (p.stuckFrames >= STUCK_FRAMES) {
        p.fadeRate = FADE_RATE
        p.vx = 0
        p.vy = 0
        p.stuckFrames = 0 // prevent redundant re-trigger
      }
    } else {
      p.stuckX = p.x; p.stuckY = p.y
      p.stuckFrames = 0
    }

    // Waypoint advancement
    if (p.waypointIdx >= 0 && p.waypointIdx < spinePts.length) {
      const wp = spinePts[p.waypointIdx]!
      const distToWp = Math.hypot(p.x - wp[0], p.y - wp[1])
      const threshold = Math.max(wp[2] * 0.3, 15)
      if (distToWp < threshold) {
        p.waypointIdx += sign
        if (p.waypointIdx < 0 || p.waypointIdx >= spinePts.length) { this.respawn(p); return }
      }
    }

    // Check if reached exit point
    const dExit = Math.hypot(p.x - p.exitX, p.y - p.exitY)
    if (dExit < params.respawnThreshold * 2) { this.respawn(p) }
    else if (p.x < -10 || p.x > WORLD_SIZE + 10 || p.y < -10 || p.y > WORLD_SIZE + 10) { this.respawn(p) }
  }
}
