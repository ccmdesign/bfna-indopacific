/**
 * useShipSimulation — Rendering-agnostic ship traffic simulation composable.
 *
 * Manages ship state (spawning, flowing along a corridor centerline, despawning)
 * driven entirely by corridor geometry from `useCorridor`. Ships flow
 * bidirectionally in two lanes, funnel through narrow sections, scatter in wide
 * sections, and are proportionally distributed by vessel type using traffic data.
 *
 * Features:
 * - Object pool pattern to eliminate GC stutters on 100+ ships
 * - shallowRef + triggerRef for single-notification-per-frame reactivity
 * - Pre-computed tangent normals at geometry derivation time (no per-frame trig)
 * - Frame-rate-independent via delta-time normalization
 * - Cancellation-token pattern to prevent orphaned rAF loops
 * - prefers-reduced-motion: static ship positions (no animation loop)
 * - Tab visibility pause to save CPU/battery
 * - SSR safe (all browser APIs gated behind onMounted)
 * - onScopeDispose cleanup for proper effect scope handling
 *
 * @warning Downstream consumers reading `ships.value` will be triggered every
 * frame (~60Hz) via triggerRef. Consumers must be frame-aware or use throttling
 * to avoid unnecessary template updates.
 */

import {
  ref,
  shallowRef,
  triggerRef,
  watch,
  onMounted,
  onScopeDispose,
  type Ref,
  type ShallowRef,
} from 'vue'
import type { CorridorGeometry, Point2D } from '~/types/strait'
import type { Ship, VesselType } from '~/types/strait'
import { VESSEL_TYPES } from '~/types/strait'

// Re-export for backward-compatibility with consumers that imported from here.
export { VESSEL_TYPES }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Speed multiplier per vessel type (containers fastest, tankers slowest). */
const SPEED_MULTIPLIERS: Record<VesselType, number> = {
  container: 1.2,
  dryBulk: 1.0,
  tanker: 0.8,
}

/** Default target ship count. Halved on mobile. */
const DEFAULT_TARGET_COUNT = 100

/** Object pool headroom: 1.5x target to handle burst. */
const POOL_MULTIPLIER = 1.5

/** Maximum ships to spawn per frame to prevent clumping at doors. */
const MAX_SPAWNS_PER_FRAME = 2

/**
 * Half-lane factor: ships use laneOffset * localWidth * HALF_LANE_FACTOR px
 * of lateral offset. 0.4 means ships occupy 80% of corridor width total,
 * leaving a 10% margin on each side before the wall.
 */
const HALF_LANE_FACTOR = 0.4

/**
 * Target transit time in seconds for a full corridor traversal.
 * Base speed is calibrated from this value.
 */
const TRANSIT_SECONDS = 10

/**
 * Delta-time clamp ceiling (in frame-ratio units where 1.0 = 16.667ms).
 * Prevents teleportation after tab resume. Value of 4 accommodates both
 * 60Hz (normal dt ~1.0) and 120Hz (normal dt ~0.5) displays.
 */
const DT_CLAMP = 4

// ---------------------------------------------------------------------------
// Pre-computed geometry helpers
// ---------------------------------------------------------------------------

/** Perpendicular normals and tangent data, computed once per geometry change. */
interface GeometryLUT {
  /** Unit perpendicular vector (pointing left) at each centerline point */
  perpNormals: Point2D[]
  /** Centerline points (reference from geometry) */
  centerline: Point2D[]
  /** Progress values (reference from geometry) */
  progress: number[]
  /** Local widths (reference from geometry) */
  widths: number[]
}

/**
 * Pre-compute perpendicular normals for the centerline.
 * Computed once when geometry changes; eliminates per-frame atan2/sqrt.
 */
function buildGeometryLUT(geometry: CorridorGeometry): GeometryLUT {
  const { centerline } = geometry
  const n = centerline.length
  const perpNormals: Point2D[] = []

  for (let i = 0; i < n; i++) {
    let dx: number, dy: number

    if (i === 0) {
      // One-sided forward difference at start
      dx = centerline[1][0] - centerline[0][0]
      dy = centerline[1][1] - centerline[0][1]
    } else if (i === n - 1) {
      // One-sided backward difference at end
      dx = centerline[n - 1][0] - centerline[n - 2][0]
      dy = centerline[n - 1][1] - centerline[n - 2][1]
    } else {
      // Central difference: average adjacent segments for smoothness at corners
      dx = centerline[i + 1][0] - centerline[i - 1][0]
      dy = centerline[i + 1][1] - centerline[i - 1][1]
    }

    const len = Math.sqrt(dx * dx + dy * dy)
    if (len > 0) {
      // Perpendicular = rotate tangent 90 degrees CCW: (-dy, dx)
      perpNormals.push([-dy / len, dx / len])
    } else {
      perpNormals.push([0, 1]) // fallback for degenerate segment
    }
  }

  return {
    perpNormals,
    centerline: geometry.centerline,
    progress: geometry.progress,
    widths: geometry.widths,
  }
}

// ---------------------------------------------------------------------------
// Traffic config
// ---------------------------------------------------------------------------

export interface TrafficConfig {
  vessels: { total: number; container: number; dryBulk: number; tanker: number }
  targetCount?: number
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useShipSimulation(options: {
  geometry: Ref<CorridorGeometry | null>
  trafficConfig: Ref<TrafficConfig | null>
}) {
  const { geometry, trafficConfig } = options
  const isRunning = ref(false)
  const ships: ShallowRef<Ship[]> = shallowRef([])

  // Internal state
  let pool: Ship[] = []
  let freeIndices: number[] = [] // Free-list stack for O(1) slot allocation (#100)
  let lut: GeometryLUT | null = null
  let animationFrameId: number | null = null
  let cancelled = false
  let lastTimestamp = 0
  /** Ship ID counter. Reset to pool size in initPool() on every start(). */
  let nextId = 0
  let baseSpeed = 0
  let vesselThresholds: [number, number, number] = [0.333, 0.667, 1.0]
  let prefersReducedMotion = false
  let cachedTargetCount = DEFAULT_TARGET_COUNT // Cached target count (#102)
  let resizeHandler: (() => void) | null = null
  let visibilityHandler: (() => void) | null = null
  let motionMql: MediaQueryList | null = null
  let motionHandler: ((e: MediaQueryListEvent) => void) | null = null
  let mounted = false

  // -------------------------------------------------------------------------
  // Target count (halved on mobile)
  // -------------------------------------------------------------------------

  /**
   * Re-compute the cached target count from traffic config and viewport width.
   * Called once on start() and on window resize -- NOT every frame (#102).
   */
  function updateTargetCount(): void {
    const config = trafficConfig.value
    const base = config?.targetCount ?? DEFAULT_TARGET_COUNT
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      cachedTargetCount = Math.round(base / 2)
    } else {
      cachedTargetCount = base
    }
  }

  // -------------------------------------------------------------------------
  // Object pool
  // -------------------------------------------------------------------------

  function initPool(size: number) {
    pool = Array.from({ length: size }, (_, i) => ({
      id: i,
      progress: 0,
      direction: 1 as 1 | -1,
      vesselType: 'container' as VesselType,
      laneOffset: 0,
      speed: 0,
      x: 0,
      y: 0,
      active: false,
      segmentIndex: 0,
    }))
    nextId = size
    // Build free-list: all slots are free initially (#100)
    freeIndices = Array.from({ length: size }, (_, i) => i)
    ships.value = pool
  }

  function clearPool() {
    freeIndices.length = 0
    for (let i = 0; i < pool.length; i++) {
      pool[i].active = false
      freeIndices.push(i)
    }
  }

  // -------------------------------------------------------------------------
  // Vessel type weighted random selection
  // -------------------------------------------------------------------------

  function computeVesselThresholds() {
    const config = trafficConfig.value
    if (!config || config.vessels.total === 0) {
      vesselThresholds = [0.333, 0.667, 1.0]
      return
    }
    const total = config.vessels.total
    const containerRatio = config.vessels.container / total
    const dryBulkRatio = config.vessels.dryBulk / total
    vesselThresholds = [
      containerRatio,
      containerRatio + dryBulkRatio,
      1.0,
    ]
  }

  function pickVesselType(): VesselType {
    const r = Math.random()
    if (r < vesselThresholds[0]) return 'container'
    if (r < vesselThresholds[1]) return 'dryBulk'
    return 'tanker'
  }

  // -------------------------------------------------------------------------
  // Spawn / despawn
  // -------------------------------------------------------------------------

  function spawnShip(direction: 1 | -1): Ship | null {
    // O(1) slot allocation via free-list (#100)
    if (freeIndices.length === 0) return null // pool exhausted
    const slotIndex = freeIndices.pop()!
    const slot = pool[slotIndex]

    const vesselType = pickVesselType()

    slot.active = true
    slot.id = nextId++
    slot.direction = direction
    slot.vesselType = vesselType
    slot.progress = direction === 1 ? 0 : 1
    slot.segmentIndex = 0
    // Lane offset: direction 1 (A->B) = left lane (negative), direction -1 (B->A) = right lane (positive)
    // Range excludes exact 0 to prevent centerline collisions with opposing traffic.
    // Math.random() returns [0, 1), so offset is [0.1, 0.9).
    slot.laneOffset = direction === 1
      ? -(0.1 + Math.random() * 0.8)
      : (0.1 + Math.random() * 0.8)
    slot.speed = baseSpeed * SPEED_MULTIPLIERS[vesselType] * (0.85 + Math.random() * 0.3)
    slot.x = 0
    slot.y = 0

    return slot
  }

  // -------------------------------------------------------------------------
  // Position resolution
  // -------------------------------------------------------------------------

  /**
   * Resolve a ship's [x, y] position from its progress along the centerline.
   *
   * Uses a linear scan from the ship's cached segment index (#099). Ships move
   * incrementally, so the segment typically stays the same or advances by 1,
   * giving O(1) amortized lookups instead of O(n) from index 0.
   */
  function resolvePosition(ship: Ship) {
    if (!lut) return

    const { centerline, progress, widths, perpNormals } = lut
    const n = centerline.length
    const t = ship.progress

    // Start scan from cached segment index for O(1) amortized resolution (#099)
    let i = Math.min(ship.segmentIndex, n - 2)
    // Scan forward or backward depending on direction
    if (ship.direction === 1) {
      while (i < n - 2 && progress[i + 1] < t) i++
      while (i > 0 && progress[i] > t) i--
    } else {
      while (i > 0 && progress[i] > t) i--
      while (i < n - 2 && progress[i + 1] < t) i++
    }
    ship.segmentIndex = i

    // Interpolation factor within segment
    const segStart = progress[i]
    const segEnd = progress[i + 1]
    const segRange = segEnd - segStart
    const segT = segRange > 0 ? (t - segStart) / segRange : 0

    // Interpolate centerline position
    const cx = centerline[i][0] + (centerline[i + 1][0] - centerline[i][0]) * segT
    const cy = centerline[i][1] + (centerline[i + 1][1] - centerline[i][1]) * segT

    // Interpolate local width
    const localWidth = widths[i] + (widths[i + 1] - widths[i]) * segT

    // Interpolate perpendicular normal
    const perpX = perpNormals[i][0] + (perpNormals[i + 1][0] - perpNormals[i][0]) * segT
    const perpY = perpNormals[i][1] + (perpNormals[i + 1][1] - perpNormals[i][1]) * segT

    // Lateral offset: laneOffset * localWidth * HALF_LANE_FACTOR
    // When localWidth drops to 0 at a pinch point, lateralPx becomes 0 and all
    // ships collapse to the centerline -- this is intentional (single-file squeeze).
    const lateralPx = ship.laneOffset * localWidth * HALF_LANE_FACTOR

    ship.x = cx + perpX * lateralPx
    ship.y = cy + perpY * lateralPx
  }

  // -------------------------------------------------------------------------
  // Animation loop
  // -------------------------------------------------------------------------

  function tick(timestamp: DOMHighResTimeStamp) {
    if (cancelled) return

    // Skip first frame to establish baseline timestamp (prevents large dt on start)
    if (lastTimestamp === 0) {
      lastTimestamp = timestamp
      animationFrameId = requestAnimationFrame(tick)
      return
    }

    const dt = Math.min((timestamp - lastTimestamp) / 16.667, DT_CLAMP)
    lastTimestamp = timestamp

    // --- Tick: advance ships ---
    let activeCount = 0
    for (let idx = 0; idx < pool.length; idx++) {
      const ship = pool[idx]
      if (!ship.active) continue
      activeCount++

      ship.progress += ship.speed * ship.direction * dt

      // Despawn if exited through opposite door
      if ((ship.direction === 1 && ship.progress > 1) ||
          (ship.direction === -1 && ship.progress < 0)) {
        ship.active = false
        freeIndices.push(idx) // Return to free-list (#100)
        activeCount--
        continue
      }

      resolvePosition(ship)
    }

    // --- Spawn: fill up to target count, max MAX_SPAWNS_PER_FRAME per frame ---
    let spawned = 0
    while (activeCount < cachedTargetCount && spawned < MAX_SPAWNS_PER_FRAME) {
      // 50/50 direction split
      const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1
      const ship = spawnShip(direction)
      if (!ship) break // pool exhausted
      resolvePosition(ship)
      activeCount++
      spawned++
    }

    // Single reactivity trigger after all mutations
    triggerRef(ships)

    if (!cancelled) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  // -------------------------------------------------------------------------
  // Static positions (prefers-reduced-motion)
  // -------------------------------------------------------------------------

  function placeStaticShips() {
    if (!lut) return

    clearPool()

    for (let i = 0; i < cachedTargetCount && i < pool.length; i++) {
      const ship = pool[i]
      freeIndices.splice(freeIndices.indexOf(i), 1) // Remove from free-list
      const vesselType = pickVesselType()
      const direction: 1 | -1 = i % 2 === 0 ? 1 : -1

      ship.active = true
      ship.id = nextId++
      ship.direction = direction
      ship.vesselType = vesselType
      ship.progress = i / cachedTargetCount
      ship.segmentIndex = 0
      ship.laneOffset = direction === 1
        ? -(0.1 + Math.random() * 0.8)
        : (0.1 + Math.random() * 0.8)
      ship.speed = 0

      resolvePosition(ship)
    }

    triggerRef(ships)
  }

  // -------------------------------------------------------------------------
  // Start / Stop
  // -------------------------------------------------------------------------

  function start() {
    stop()

    const geo = geometry.value
    if (!geo) return

    cancelled = false
    lastTimestamp = 0
    isRunning.value = true

    // Build geometry LUT and calibrate speed
    lut = buildGeometryLUT(geo)
    // baseSpeed: progress-units per frame at 60fps for a TRANSIT_SECONDS traversal
    baseSpeed = 1.0 / (TRANSIT_SECONDS * 60)

    // Set up vessel distribution thresholds
    computeVesselThresholds()

    // Compute target count from traffic config and viewport (#102)
    updateTargetCount()

    // Initialize pool
    const poolSize = Math.round(cachedTargetCount * POOL_MULTIPLIER)
    initPool(poolSize)

    if (prefersReducedMotion) {
      placeStaticShips()
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
    mounted = true

    // Cache target count on resize instead of reading window.innerWidth every frame (#102)
    resizeHandler = () => updateTargetCount()
    window.addEventListener('resize', resizeHandler)

    // Reduced motion
    motionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion = motionMql.matches
    motionHandler = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches
      if (geometry.value) {
        if (prefersReducedMotion) {
          stop()
          placeStaticShips()
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
      } else if (geometry.value && !prefersReducedMotion && !cancelled) {
        lastTimestamp = 0
        animationFrameId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)

    // Start if geometry is already available
    if (geometry.value) {
      start()
    }
  })

  // Watch geometry changes: stop, clear pool, restart with new geometry.
  // This prevents ships from having stale progress values against new geometry.
  watch(geometry, (newGeo, _oldGeo, onCleanup) => {
    if (!mounted) return
    if (newGeo) {
      start()
    } else {
      stop()
      clearPool()
      triggerRef(ships)
    }
    onCleanup(() => stop())
  })

  // Watch traffic config changes: rebuild vessel thresholds
  watch(trafficConfig, () => {
    if (!mounted) return
    computeVesselThresholds()
    if (geometry.value) {
      start()
    }
  })

  function cleanup() {
    stop()
    clearPool()

    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = null
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

    lut = null
    mounted = false
  }

  // Use onScopeDispose only — it fires on both component unmount and standalone
  // scope disposal, so onUnmounted is redundant and would cause double cleanup (#098).
  onScopeDispose(cleanup)

  return { ships, start, stop, isRunning }
}
