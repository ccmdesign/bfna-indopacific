# Particle System Unification Refactor

## Problem Statement

The particle system is implemented as **6 nearly-identical 950–1130-line test pages** plus a **separate 741-line production composable** that uses an entirely different (simpler) flow model. Every test page copy-pastes the same ~800 lines of physics, rendering, and UI code, diverging only in:

1. **Per-strait data** — polygon import path, spine waypoints, background image
2. **Feature tier** — Malacca and Lombok add branching spines + stuck detection + waypoint tracking; the other 4 pages lack these features
3. **Per-strait tuning defaults** — particle count, spawn zone fractions, speed

The production composable (`useParticleSystem.ts`) uses a basic centroid-to-centroid flow with no spine system at all — it's a completely separate implementation that needs to be replaced.

This creates three maintenance hazards:
- **Bug fixes must be applied 6+ times** (e.g., a boundary-checking improvement in one page is never ported to others)
- **Feature inconsistency** — Malacca/Lombok have waypoint tracking and stuck detection; the other 4 straits don't, even though they'd benefit from it
- **Production/test drift** — the production composable is architecturally different from the test pages, so "porting" improvements means rewriting, not copying

---

## Current Architecture

```
pages/test/hormuz/index.vue      (959 lines) — single spine, no waypoint tracking
pages/test/luzon/index.vue       (955 lines) — single spine, no waypoint tracking
pages/test/taiwan/index.vue      (955 lines) — single spine, no waypoint tracking
pages/test/bab-el-mandeb/index.vue (958 lines) — single spine, no waypoint tracking
pages/test/malacca/index.vue     (1132 lines) — branching spine, waypoint tracking, stuck detection
pages/test/lombok/index.vue      (1109 lines) — branching spine, waypoint tracking, stuck detection

composables/useParticleSystem.ts (741 lines) — production, centroid flow (no spine)
components/straits/StraitParticleCanvas.vue (66 lines) — thin canvas wrapper
```

### What varies per page (the "10%" that differs)

| Concern | Hormuz/Luzon/Taiwan/BabElMandeb | Malacca/Lombok |
|---------|-------------------------------|----------------|
| Polygon import | `hormuz-polygon.json` etc. | `malacca-polygon.json` etc. |
| Background image | `/assets/images/straits/hormuz.jpg` etc. | Same pattern |
| Spine definition | Single `FLOW_SPINE` array | `FLOW_SPINE` + `FLOW_SPINE_B` |
| `branchBRatio` param | N/A | 0.3 |
| Particle interface | No `branch`, `waypointIdx`, `stuck*` fields | Has all fields |
| Waypoint tracking | Heuristic (nearest 2 waypoints at launch) | Proper `waypointIdx` monotonic advancement |
| Stuck detection | None | `stuckX/Y`, `stuckFrames`, `stuckTarget` |
| `nearestBoundaryPoint()` | Not present | Present |
| Exit edge manipulation | None | Extends exit edge with canvas-edge points |
| Default `particleCount` | 80–120 | 150 |
| Default spawn zones | Varies | `0.1–0.9` |

### What's identical across all 6 pages (the "90%" that's duplicated)

- `pointInPolygon()`, `rasterize()`, `isInWater()` — polygon containment
- `buildDistanceField()`, `getWallRepulsion()` — wall repulsion
- `edgeLengths()`, `pointAtDistance()`, `randomPointOnEdge()` — edge sampling
- `noise()` — sine-based pseudo-noise
- `buildSpine()`, `spineNearest()`, `spineAt()`, `spineDistance()` — spine geometry
- Particle spawn/respawn logic (identical pattern, slightly different fields)
- Progressive spawning (batch interval, fraction)
- The entire `tick()` animation loop structure
- Open water mode physics (steering, spine pull, wall repulsion, noise, candidates)
- Strait mode physics (1D advancement)
- Exit steering near end of spine
- Canvas rendering (debug overlays, particles, glow, circle mask)
- Tweakpane control panel setup (identical folder structure, same bindings)
- Drag/drop waypoint editing
- Template and CSS (identical structure)

---

## Proposed Architecture

### Layer 1: Pure Physics Engine (`utils/particleEngine.ts`)

A zero-dependency TypeScript module containing all the math and physics — no Vue, no Canvas, no DOM. Pure functions + a simulation class.

```typescript
// --- Pure geometry functions (stateless) ---

export function pointInPolygon(px, py, poly): boolean
export function rasterizePolygon(polygon): Uint8Array
export function isInWater(x, y, grid): boolean
export function buildDistanceField(grid): Float32Array
export function getWallRepulsion(x, y, distField): WallRepulsion
export function noise(x): number

// --- Edge sampling ---
export function edgeLengths(edge): EdgeLengths
export function pointAtDistance(edge, lengths, target): Point
export function randomPointOnEdge(edge, rangeStart, rangeEnd): Point

// --- Spine geometry ---
export function buildSpine(pts): SpineGeometry
export function spineNearest(px, py, pts, tangents, segStart?, segEnd?): SpineProjection
export function spineAt(d, spineData): SpinePoint
export function spineDistance(segIdx, segT, spineData): number
export function nearestBoundaryPoint(px, py, boundary): Point

// --- Simulation class ---
export class ParticleSimulation {
  constructor(config: StraitConfig)

  // Lifecycle
  init(): void          // Rasterize polygon, build distance field, build spines
  tick(dt: number): void // Update all particles
  getParticles(): readonly Particle[]

  // State
  readonly grid: Uint8Array
  readonly distField: Float32Array
  readonly spines: SpineData[]
}
```

**Key design decisions:**
- All spine branches are stored in a single `spines: SpineData[]` array. Single-spine straits have `spines.length === 1`. The branching ratio becomes part of the config.
- Waypoint tracking and stuck detection are **always present** on every particle. For single-spine straits, `branch` is always `0`. This eliminates the feature-tier split.
- The simulation is frame-rate independent (takes `dt` as input) and has no side effects.

### Layer 2: Vue Composable (`composables/useParticleFlow.ts`)

Replaces both the current `useParticleSystem.ts` and the inline logic in test pages. Handles:
- Canvas setup, DPR scaling, ResizeObserver
- `requestAnimationFrame` loop calling `simulation.tick(dt)`
- Rendering particles to canvas (batched by type)
- `prefers-reduced-motion` / tab visibility
- Glow pass
- Reactive parameter updates

```typescript
export function useParticleFlow(options: {
  canvasRef: Ref<HTMLCanvasElement | null>
  config: StraitConfig | Ref<StraitConfig>
  params?: Partial<FlowParams>  // Runtime overrides (from Tweakpane)
  debug?: Ref<boolean>
}): {
  simulation: ParticleSimulation
  start(): void
  stop(): void
  drawDebug(ctx: CanvasRenderingContext2D): void
}
```

### Layer 3: Per-Strait Config (`data/straits/{id}-flow.ts`)

Each strait exports its unique configuration as a typed object:

```typescript
// data/straits/hormuz-flow.ts
import type { StraitConfig } from '~/utils/particleEngine'

export const hormuzConfig: StraitConfig = {
  id: 'hormuz',
  polygonPath: '~/data/straits/hormuz-polygon.json',
  backgroundImage: '/assets/images/straits/hormuz.jpg',
  particleCount: 120,
  spines: [
    {
      waypoints: [
        [290, 456, 58, 0.6],
        [332, 510, 42, 0.6],
        // ...
      ],
      ratio: 1.0,  // 100% of particles use this spine
    },
  ],
  spawnZones: {
    entry: { start: 0.35, end: 1.0 },
    exit: { start: 0, end: 1.0 },
  },
  // Optional edge extensions (like Malacca's exit edge manipulation)
  exitEdgeExtensions: undefined,
}
```

```typescript
// data/straits/malacca-flow.ts
export const malaccaConfig: StraitConfig = {
  id: 'malacca',
  polygonPath: '~/data/straits/malacca-polygon.json',
  backgroundImage: '/assets/images/straits/malacca.jpg',
  particleCount: 150,
  spines: [
    {
      waypoints: [ /* spine A */ ],
      ratio: 0.7,
    },
    {
      waypoints: [ /* spine B */ ],
      ratio: 0.3,
    },
  ],
  spawnZones: {
    entry: { start: 0.1, end: 0.9 },
    exit: { start: 0.1, end: 0.9 },
  },
  exitEdgeExtensions: [
    [0, 1080],
    [0, 0],
  ],
}
```

### Layer 4: Test Page (thin shell)

Each test page becomes ~80–120 lines instead of ~1000:

```vue
<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { hormuzConfig } from '~/data/straits/hormuz-flow'
import { useParticleFlow } from '~/composables/useParticleFlow'
import { setupTweakpane } from '~/utils/particleTweakpane'

definePageMeta({ hideFooter: true, suppressRotateOverlay: true })
if (!import.meta.dev) navigateTo('/', { replace: true })

const canvasRef = ref<HTMLCanvasElement | null>(null)
const params = reactive({ /* defaults from hormuzConfig, overridable */ })

const { simulation, start, stop, drawDebug } = useParticleFlow({
  canvasRef,
  config: hormuzConfig,
  params,
  debug: ref(true),
})

onMounted(async () => {
  if (!import.meta.dev) return
  const pane = await setupTweakpane(params, simulation)
  onUnmounted(() => pane?.dispose())
})
</script>

<template>
  <ParticleTestPage
    :canvas-ref="canvasRef"
    :config="hormuzConfig"
    :params="params"
  />
</template>
```

### Layer 5: Tweakpane Helper (`utils/particleTweakpane.ts`)

Extracts the ~80 lines of Tweakpane folder/binding setup that's identical across all pages:

```typescript
export async function setupTweakpane(
  params: FlowParams,
  simulation: ParticleSimulation,
  options?: { enableDrag?: boolean; canvas?: HTMLCanvasElement }
): Promise<Pane> {
  const { Pane } = await import('tweakpane')
  const pane = new Pane({ title: 'Particle Controls' })

  // Flow & Movement folder
  // Steering folder
  // Organic Motion folder
  // Wall Repulsion folder
  // Appearance folder
  // Waypoint Width folder (dynamic from simulation.spines)
  // Waypoint Speed folder (dynamic from simulation.spines)
  // Spawn Zones folder
  // Debug folder
  // Copy All Tuning button

  if (options?.enableDrag && options.canvas) {
    setupWaypointDrag(options.canvas, simulation)
  }

  return pane
}
```

### Layer 6: Production Integration

`StraitParticleCanvas.vue` switches from `useParticleSystem()` to `useParticleFlow()`:

```typescript
// Before: centroid-based flow, no spine
const { start, stop } = useParticleSystem({ canvasRef, straitId, year, circleSize })

// After: spine-based flow, same API surface
const config = computed(() => straitConfigs[straitId.value])
const { start, stop } = useParticleFlow({
  canvasRef,
  config,
  circleSize,  // production-only: maps world coords to circle
})
```

The production composable gains all features (spine, waypoint tracking, stuck detection, progressive spawn) that were previously only in test pages.

---

## Types

```typescript
// utils/particleEngine.ts

interface StraitConfig {
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

interface SpineBranch {
  waypoints: [number, number, number, number][]  // [x, y, width, speed]
  ratio: number  // fraction of particles assigned to this branch (all ratios sum to 1)
}

interface SpineData {
  pts: [number, number, number, number][]
  tangents: { tx: number; ty: number }[]
  cumLen: number[]
  totalLen: number
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  radius: number
  targetRadius: number
  noiseOffset: number
  speed: number
  color: string
  waitFrames: number
  forward: boolean
  exitX: number; exitY: number
  branchIdx: number      // index into StraitConfig.spines[]
  waypointIdx: number    // next waypoint target (monotonic)
  stuckX: number; stuckY: number
  stuckFrames: number
  stuckTarget: Point | null
}

interface FlowParams {
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
  showDebug: boolean
  showGlow: boolean
  showCircleMask: boolean
}
```

---

## Migration Plan

### Phase 1: Extract Pure Functions

1. Create `utils/particleEngine.ts`
2. Move all pure geometry functions from any test page (they're identical):
   - `pointInPolygon`, `rasterizePolygon`, `isInWater`
   - `buildDistanceField`, `getWallRepulsion`
   - `edgeLengths`, `pointAtDistance`, `randomPointOnEdge`
   - `noise`
   - `buildSpine`, `spineNearest`, `spineAt`, `spineDistance`
   - `nearestBoundaryPoint`
3. Add types (`StraitPolygon`, `SpineData`, `Particle`, `FlowParams`, `StraitConfig`)
4. Write the `ParticleSimulation` class wrapping `init()` + `tick()`
5. **Validation**: import from one test page (e.g., Hormuz), verify identical behavior

### Phase 2: Create Unified Composable

1. Create `composables/useParticleFlow.ts`
2. Port canvas management (DPR, ResizeObserver, animation loop) from `useParticleSystem.ts`
3. Port rendering (batched dots, glow pass, debug overlays) from test pages
4. Wire to `ParticleSimulation` for physics
5. **Validation**: replace Hormuz test page internals with composable, verify identical behavior

### Phase 3: Create Per-Strait Configs

1. Create `data/straits/{id}-flow.ts` for each of the 6 straits
2. Extract spine waypoints, particle counts, spawn zones from each test page
3. Include edge extensions (Malacca, potentially others)
4. **Validation**: each config produces identical simulation to its original test page

### Phase 4: Extract Tweakpane Helper

1. Create `utils/particleTweakpane.ts`
2. Move folder structure, bindings, waypoint drag, "Copy All Tuning" into it
3. Support dynamic spine count (1 or 2 branches)
4. **Validation**: Tweakpane panel works identically

### Phase 5: Slim Down Test Pages

1. Rewrite each test page to ~80–120 lines using the composable + config + Tweakpane helper
2. Optionally extract `ParticleTestPage.vue` component for shared template/CSS
3. Delete all duplicated code
4. **Validation**: all 6 test pages work identically to before

### Phase 6: Upgrade Production

1. Replace `useParticleSystem.ts` with `useParticleFlow.ts` in `StraitParticleCanvas.vue`
2. Production gains: spine-based flow, waypoint tracking, stuck detection, progressive spawn, spawn zones
3. Maintain: responsive budget, `prefers-reduced-motion`, tab visibility, vessel-type distribution
4. Delete `useParticleSystem.ts`
5. **Validation**: production particle rendering improved, no regressions

---

## Feature Unification

After refactoring, **all straits automatically get all features**:

| Feature | Before (4 basic pages) | Before (Malacca/Lombok) | After (all 6) |
|---------|----------------------|-------------------------|----------------|
| Spine-based flow | Single spine | Branching spines | Branching (1+ spines) |
| Waypoint tracking | Heuristic (nearest 2) | Monotonic `waypointIdx` | Monotonic `waypointIdx` |
| Constrained spine search | No (full spine scan) | Yes (segment window) | Yes |
| Stuck detection | No | Yes (12px / 3s) | Yes |
| Boundary escape | No | Yes (`nearestBoundaryPoint`) | Yes |
| Progressive spawn | Yes | Yes | Yes |
| Spawn zone control | Yes | Yes | Yes |
| Exit edge extensions | No | Yes | Config-driven |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Behavior regression in specific strait | Phase-by-phase migration with per-strait visual validation |
| Tweakpane parameter drift (tuned values lost) | Extract current tuned values into config files BEFORE refactoring |
| Performance regression from abstraction | `ParticleSimulation` is a thin class, not a framework; hot path remains identical typed arrays + math |
| Production composable features (vessel-type budget, responsive scaling) lost | Explicitly carry forward in `useParticleFlow` production mode |
| Stuck detection overhead for simple straits | Negligible: 2 comparisons + 1 counter per particle per frame |

---

## Line Count Estimate

| File | Before | After |
|------|--------|-------|
| `utils/particleEngine.ts` | — | ~450 lines |
| `composables/useParticleFlow.ts` | — | ~250 lines |
| `utils/particleTweakpane.ts` | — | ~120 lines |
| `data/straits/{id}-flow.ts` (×6) | — | ~40 lines each (~240 total) |
| `components/ParticleTestPage.vue` | — | ~60 lines |
| Test pages (×6) | ~6,000 total | ~80 lines each (~480 total) |
| `composables/useParticleSystem.ts` | 741 lines | deleted |
| **Total** | **~6,741** | **~1,600** |

**Net reduction: ~5,100 lines (~76% less code)**

---

## Open Questions

1. **Should the test page template/CSS be a shared component or just duplicated?** — At ~30 lines of template + CSS, a shared `ParticleTestPage.vue` component is worth it if we want consistent styling, but copy-paste is also fine for 6 pages.

2. **Should `ParticleSimulation` be a class or a closure-based factory?** — Class is more natural for mutable state (particles array, grid, distance field). A factory function returning an object would also work but adds indirection.

3. **Should the production composable support runtime config changes (switching straits)?** — Currently `useParticleSystem` watches `straitId` and restarts. The new composable should preserve this capability via a `watch` on the config ref.

4. **Should the `FlowParams` type include per-strait defaults or always use overrides?** — Per-strait defaults in the config, with a `params` reactive object for runtime Tweakpane overrides that merge on top.

5. **Worker thread for rasterization?** — `rasterizePolygon()` + `buildDistanceField()` take ~10–30ms on cold start. Not a bottleneck now, but if we add more straits, offloading to a Web Worker could prevent frame drops during init. Out of scope for this refactor.
