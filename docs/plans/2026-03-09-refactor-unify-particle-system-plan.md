---
title: Unify Particle System Across Test Pages and Production Composable
type: refactor
status: active
date: 2026-03-09
linear: BF-104
---

# Unify Particle System Across Test Pages and Production Composable

## Overview

Extract ~5,100 lines of duplicated particle physics, rendering, and Tweakpane UI code from 6 test pages and a separate production composable into a shared architecture: a pure physics engine, a unified Vue composable, per-strait config files, and a Tweakpane helper. Net result: ~6,700 lines reduced to ~1,600 lines (76% reduction), with all 6 straits gaining features (waypoint tracking, stuck detection, boundary escape) that currently only exist in Malacca and Lombok.

## Problem Statement / Motivation

Three maintenance hazards exist today:

1. **Bug fixes must be applied 6+ times.** Each test page (`pages/test/{hormuz,luzon,taiwan,bab-el-mandeb,malacca,lombok}/index.vue`) contains ~800 lines of identical physics and rendering code. Any improvement to boundary checking, stuck detection, or rendering must be manually ported to each copy.

2. **Feature inconsistency.** Malacca and Lombok have branching spines, monotonic waypoint tracking, stuck detection, and `nearestBoundaryPoint` escape. The other 4 straits lack these features despite benefiting from them -- they use a heuristic "nearest 2 waypoints" launch and have no stuck detection at all.

3. **Production/test drift.** The production composable (`composables/useParticleSystem.ts`, 740 lines) uses a fundamentally different architecture -- centroid-to-centroid flow with no spine system. "Porting" test page improvements to production means rewriting, not copying.

## Proposed Solution

Split the system into 5 layers, migrated in 6 sequential phases:

| Layer | File | Lines | Purpose |
|-------|------|-------|---------|
| 1 - Engine | `utils/particleEngine.ts` | ~450 | Pure math/physics. Zero Vue/DOM deps. |
| 2 - Composable | `composables/useParticleFlow.ts` | ~250 | Canvas management, animation loop, rendering. Wraps engine. |
| 3 - Configs | `data/straits/{id}-flow.ts` (x6) | ~240 total | Per-strait spine waypoints, spawn zones, particle count. |
| 4 - Tweakpane | `utils/particleTweakpane.ts` | ~120 | Shared control panel setup and waypoint drag/drop. |
| 5 - Test pages | `pages/test/{id}/index.vue` (x6) | ~480 total | Thin shells: import config + composable + Tweakpane. |

## Technical Approach

### Architecture

#### Layer 1: Pure Physics Engine (`utils/particleEngine.ts`)

All pure geometry and simulation functions extracted verbatim from test pages. No Vue, no Canvas, no DOM.

**Exported pure functions:**
- `pointInPolygon(px, py, poly)` -- ray-casting containment test
- `rasterizePolygon(polygon)` -- Uint8Array grid for O(1) containment lookup
- `isInWater(x, y, grid)` -- grid lookup
- `buildDistanceField(grid)` -- BFS distance field for wall repulsion
- `getWallRepulsion(x, y, distField)` -- gradient-based repulsion vector
- `edgeLengths(edge)` -- cumulative lengths for edge polyline
- `pointAtDistance(edge, lengths, target)` -- sample point at distance along edge
- `randomPointOnEdge(edge, rangeStart, rangeEnd)` -- random point within fraction range
- `noise(x)` -- sine-based pseudo-noise
- `buildSpine(pts)` -- precompute tangents + cumulative lengths
- `spineNearest(px, py, pts, tangents, segStart?, segEnd?)` -- nearest point on spine with interpolated width/speed
- `spineAt(d, spineData)` -- convert 1D distance to (x, y) + tangent
- `spineDistance(segIdx, segT, spineData)` -- convert segment position to 1D distance
- `nearestBoundaryPoint(px, py, boundary)` -- nearest point on boundary polygon (currently only in Malacca/Lombok)

**Exported class:**
- `ParticleSimulation` -- wraps `init()` (rasterize, build distance field, build spines) and `tick(dt)` (update all particles). Holds grid, distField, spines, and particles array.

**Key design decision:** All particles always get `waypointIdx`, `stuckX/Y`, `stuckFrames`, `stuckTarget`, and `branchIdx` fields. Single-spine straits use `branchIdx = 0`. This eliminates the feature-tier split between the 4 basic pages and Malacca/Lombok, and is negligible overhead (2 comparisons + 1 counter per particle per frame for stuck detection).

**Types to export:**

```typescript
interface StraitFlowConfig {
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
  ratio: number  // fraction of particles on this branch (all sum to 1)
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
  branchIdx: number
  waypointIdx: number
  stuckX: number; stuckY: number
  stuckFrames: number
  stuckTarget: { x: number; y: number } | null
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
  branchBRatio: number  // ignored for single-spine straits
  showDebug: boolean
  showGlow: boolean
  showCircleMask: boolean
}
```

#### Layer 2: Vue Composable (`composables/useParticleFlow.ts`)

Replaces both `useParticleSystem.ts` and the inline logic in test pages.

```typescript
export function useParticleFlow(options: {
  canvasRef: Ref<HTMLCanvasElement | null>
  config: StraitFlowConfig | Ref<StraitFlowConfig>
  params?: Partial<FlowParams>
  debug?: Ref<boolean>
  // Production-only options:
  circleSize?: Ref<number>
  straitId?: Ref<string | null>
  year?: Ref<string>
}): {
  simulation: ParticleSimulation
  params: FlowParams  // reactive, for Tweakpane binding
  start(): void
  stop(): void
}
```

Responsibilities:
- Canvas setup, DPR scaling, ResizeObserver (from current `useParticleSystem.ts`)
- `requestAnimationFrame` loop calling `simulation.tick(dt)` (from test pages)
- Rendering: batched dots per color, glow pass, debug overlays, circle mask (from test pages)
- `prefers-reduced-motion` and tab visibility pause (from current `useParticleSystem.ts`)
- Reactive parameter updates when `params` change
- Production mode: vessel-type distribution via `straitsData`, responsive budget, world-to-canvas coordinate mapping via `circleSize`
- Watch `straitId` and `year` to restart when they change (from current `useParticleSystem.ts`)

#### Layer 3: Per-Strait Config (`data/straits/{id}-flow.ts`)

Each file exports a `StraitFlowConfig` object. Example for Hormuz:

```typescript
// data/straits/hormuz-flow.ts
import type { StraitFlowConfig } from '~/utils/particleEngine'

export const hormuzFlowConfig: StraitFlowConfig = {
  id: 'hormuz',
  polygonPath: '~/data/straits/hormuz-polygon.json',
  backgroundImage: '/assets/images/straits/hormuz.jpg',
  particleCount: 120,
  spines: [{
    waypoints: [
      [290, 456, 58, 0.6],
      [332, 510, 42, 0.6],
      [390, 548, 34, 0.4],
      [444, 576, 38, 0.4],
      [498, 558, 16, 0.4],
      [544, 532, 10, 0.6],
      [554, 577, 16, 0.7],
      [580, 601, 30, 0.8],
      [657, 631, 46, 1.0],
      [773, 705, 110, 1.0],
      [856, 1044, 344, 1.0],
    ],
    ratio: 1.0,
  }],
  spawnZones: {
    entry: { start: 0.35, end: 1.0 },
    exit: { start: 0, end: 1.0 },
  },
}
```

Example for Malacca (branching + exit edge extensions):

```typescript
// data/straits/malacca-flow.ts
export const malaccaFlowConfig: StraitFlowConfig = {
  id: 'malacca',
  polygonPath: '~/data/straits/malacca-polygon.json',
  backgroundImage: '/assets/images/straits/malacca.jpg',
  particleCount: 150,
  spines: [
    { waypoints: [/* spine A */], ratio: 0.7 },
    { waypoints: [/* spine B */], ratio: 0.3 },
  ],
  spawnZones: {
    entry: { start: 0.1, end: 0.9 },
    exit: { start: 0.1, end: 0.9 },
  },
  exitEdgeExtensions: [[0, 1080], [0, 0]],
}
```

Per-strait values to extract (from reading each test page):

| Strait | particleCount | entry spawn | exit spawn | Spines | Exit extensions |
|--------|-------------|-------------|------------|--------|-----------------|
| Hormuz | 120 | 0.35-1.0 | 0-1.0 | 1 (11 waypoints) | None |
| Luzon | 120 | 0.35-1.0 | 0-1.0 | 1 | None |
| Taiwan | 120 | 0.35-1.0 | 0-1.0 | 1 | None |
| Bab el-Mandeb | 120 | 0.35-1.0 | 0-1.0 | 1 | None |
| Malacca | 150 | 0.1-0.9 | 0.1-0.9 | 2 (7+3 waypoints) | `[0,1080],[0,0]` prepended |
| Lombok | 150 | 0.1-0.9 | 0.1-0.9 | 2 (5+3 waypoints) | None |

#### Layer 4: Tweakpane Helper (`utils/particleTweakpane.ts`)

Extracts the ~80 lines of identical Tweakpane folder/binding setup:

```typescript
export async function setupTweakpane(
  params: FlowParams,
  simulation: ParticleSimulation,
  options?: {
    enableDrag?: boolean
    canvas?: HTMLCanvasElement
    spines: { pts: reactive<[number,number,number,number][]>; label: string }[]
  }
): Promise<Pane>
```

Folders: Flow & Movement, Steering, Organic Motion, Wall Repulsion, Appearance, Waypoint Width (dynamic per spine), Waypoint Speed (dynamic per spine), Spawn Zones, Debug, Copy All Tuning button.

For branching straits, Tweakpane renders width/speed folders for each spine (e.g., "Spine A Width", "Spine B Width").

Waypoint drag/drop supports multiple spines (already done in Malacca/Lombok pattern with `dragBranch`).

#### Layer 5: Thin Test Pages (~80 lines each)

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { hormuzFlowConfig } from '~/data/straits/hormuz-flow'
import { useParticleFlow } from '~/composables/useParticleFlow'
import { setupTweakpane } from '~/utils/particleTweakpane'

definePageMeta({ hideFooter: true, suppressRotateOverlay: true })
if (!import.meta.dev) navigateTo('/', { replace: true })

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { simulation, params, start, stop } = useParticleFlow({
  canvasRef,
  config: hormuzFlowConfig,
  debug: ref(true),
})

let pane: any = null
onMounted(async () => {
  if (!import.meta.dev) return
  pane = await setupTweakpane(params, simulation, {
    enableDrag: true,
    canvas: canvasRef.value!,
    spines: simulation.getReactiveSpines(),
  })
})
onUnmounted(() => { stop(); pane?.dispose() })
</script>

<template>
  <div class="test-page">
    <div class="canvas-wrap">
      <img :src="hormuzFlowConfig.backgroundImage" width="1080" height="1080" alt="" class="bg-image" />
      <canvas ref="canvasRef" class="overlay" />
    </div>
  </div>
</template>

<!-- shared CSS could be extracted to a ParticleTestPage component -->
```

### Implementation Phases

#### Phase 1: Extract Pure Physics Engine

**Deliverable:** `utils/particleEngine.ts`

1. Create the file with all pure geometry functions copied verbatim from `pages/test/hormuz/index.vue` (lines 61-336):
   - `pointInPolygon`, `rasterize` (renamed to `rasterizePolygon`), `isInWater`
   - `buildDistanceField`, `getWallRepulsion`
   - `edgeLengths`, `pointAtDistance`, `randomPointOnEdge`
   - `noise`
   - `buildSpine`, `spineNearest`, `spineAt`, `spineDistance`
2. Add `nearestBoundaryPoint` from Malacca/Lombok (line 507 in Malacca).
3. Define all TypeScript interfaces (`StraitFlowConfig`, `SpineBranch`, `SpineData`, `Particle`, `FlowParams`).
4. Create `ParticleSimulation` class wrapping `init()` + `tick()`:
   - `init()`: load polygon JSON, rasterize grid, build distance field, build spine data for each branch.
   - `tick(dt)`: progressive spawn, update all particles (wait phase, strait mode, open water mode, stuck detection, waypoint advancement, respawn checks).
5. The `spineNearest` function must accept optional `segStart`/`segEnd` parameters (the constrained search from Malacca/Lombok).

**Validation:** Import engine in one test page (Hormuz), replace inline functions with engine calls, verify identical visual behavior.

**Estimated effort:** ~2-3 hours

#### Phase 2: Create Unified Vue Composable

**Deliverable:** `composables/useParticleFlow.ts`

1. Port canvas management from `useParticleSystem.ts` (lines 300-322): DPR scaling, ResizeObserver, `syncCanvasSize`.
2. Port animation loop from test pages (line 454 in Hormuz): `requestAnimationFrame` with dt normalization.
3. Port rendering from test pages (lines 640-783 in Hormuz): debug overlays, particle dots, glow pass, circle mask.
4. Port `prefers-reduced-motion` and tab visibility from `useParticleSystem.ts` (lines 677-701).
5. Wire to `ParticleSimulation` for physics.
6. Add production-mode features from current `useParticleSystem.ts`:
   - `computeParticleCount(straitId, year)` using vessel data from `straitsData` (lines 218-230).
   - `distributeByType(straitId, year, count)` for vessel-type colors (lines 232-247).
   - `circleSize` mapping: scale world coords (1080x1080) to canvas pixels (lines 301-309, 464-476).
   - Watchers on `straitId` and `year` to restart (lines 708-726).

**Validation:** Replace Hormuz test page with composable call. Verify identical behavior.

**Estimated effort:** ~2 hours

#### Phase 3: Create Per-Strait Config Files

**Deliverables:** 6 files in `data/straits/`

1. Copy polygon JSON files from main repo to worktree (5 missing: `bab-el-mandeb`, `lombok`, `luzon`, `malacca`, `taiwan`).
2. For each strait, extract from its test page:
   - `FLOW_SPINE` waypoints (and `FLOW_SPINE_B` for Malacca/Lombok)
   - `particleCount` default
   - Spawn zone fractions (`entrySpawnStart`, `entrySpawnEnd`, `exitSpawnStart`, `exitSpawnEnd`)
   - Exit edge extensions (Malacca only: lines 62-68)
   - Background image path
3. Write each as a typed `StraitFlowConfig` export.

**Validation:** Each config produces the same spine/polygon/params as its original test page.

**Estimated effort:** ~1 hour

#### Phase 4: Extract Tweakpane Helper

**Deliverable:** `utils/particleTweakpane.ts`

1. Extract folder structure from Hormuz test page (lines 793-870).
2. Make Waypoint Width/Speed folders dynamic based on spine count.
3. Support multi-spine drag/drop from Malacca pattern (lines 398-448).
4. Include "Copy All Tuning" button.
5. Add `branchBRatio` binding for multi-spine configs (from Malacca line 48).

**Validation:** Tweakpane panel works identically in Hormuz and Malacca test pages.

**Estimated effort:** ~1 hour

#### Phase 5: Slim Down Test Pages

**Deliverables:** 6 rewritten test pages (~80-120 lines each)

1. Copy test page directories from main repo for any missing straits.
2. Rewrite each page to: import config + composable + Tweakpane helper.
3. Optionally extract shared `<template>` and `<style>` into a `ParticleTestPage.vue` component (~60 lines for the canvas-wrap, bg-image, overlay, legend, and CSS).
4. Delete all duplicated physics and rendering code.

**Validation:** All 6 test pages render identically to their originals. Tweakpane works for all.

**Estimated effort:** ~1.5 hours

#### Phase 6: Upgrade Production

**Deliverables:** Updated `StraitParticleCanvas.vue`, updated `StraitCircle.vue`, deleted `useParticleSystem.ts`

1. In `StraitParticleCanvas.vue` (66 lines), replace `useParticleSystem()` with `useParticleFlow()`:
   - Map `straitId` to `StraitFlowConfig` via a lookup (import all 6 configs).
   - Pass `circleSize`, `straitId`, `year` for production-mode behavior.
2. In `StraitCircle.vue`, remove the `POLYGON_READY_STRAITS` gate (line 3) -- all 6 straits now have polygon data and flow configs.
3. Delete `composables/useParticleSystem.ts`.
4. Verify production gains: all straits now use spine-based flow with waypoint tracking and stuck detection.

**Validation:** Production particle rendering works for all 6 straits. No visual regressions. `prefers-reduced-motion` and tab visibility still respected.

**Estimated effort:** ~1 hour

## System-Wide Impact

- **Interaction graph**: `StraitParticleCanvas.vue` -> `useParticleFlow` -> `ParticleSimulation`. Test pages -> same composable + `setupTweakpane`. No callbacks or observers beyond existing `watch(straitId)` and `watch(year)`.
- **Error propagation**: Polygon loading failure (missing JSON) falls back to empty polygon, same as today. The `loadPolygon` dynamic import pattern is preserved.
- **State lifecycle risks**: Animation frame cleanup is centralized in `useParticleFlow` (currently duplicated 7 times). The `stop()` + `onUnmounted()` pattern is unchanged.
- **API surface parity**: `StraitParticleCanvas.vue` props remain identical (`straitId`, `year`, `circleSize`). No external API changes.
- **Integration test scenarios**: (1) Switch between straits in production -- particles restart with correct config. (2) Resize window -- canvas DPR recalculates. (3) Tab hidden/shown -- animation pauses/resumes. (4) Tweakpane parameter changes in test page -- particles update in real time.

## Acceptance Criteria

### Functional Requirements

- [ ] `utils/particleEngine.ts` contains all pure physics functions with zero Vue/DOM dependencies
- [ ] `composables/useParticleFlow.ts` replaces both `useParticleSystem.ts` and inline test page logic
- [ ] All 6 `data/straits/{id}-flow.ts` config files contain correct spine waypoints, particle counts, and spawn zones
- [ ] `utils/particleTweakpane.ts` provides shared control panel for all test pages
- [ ] All 6 test pages work identically to their originals (visual parity)
- [ ] Production `StraitParticleCanvas.vue` uses new composable for all 6 straits
- [ ] `POLYGON_READY_STRAITS` gate removed from `StraitCircle.vue`
- [ ] Old `composables/useParticleSystem.ts` deleted

### Feature Unification

- [ ] All 6 straits have monotonic waypoint tracking (not just Malacca/Lombok)
- [ ] All 6 straits have stuck detection with boundary escape
- [ ] All 6 straits have constrained spine search (segment window)
- [ ] Branching spines work for any strait with `spines.length > 1`

### Non-Functional Requirements

- [ ] No performance regression in particle rendering (same typed arrays + math hot path)
- [ ] `prefers-reduced-motion` respected (static dots, no animation)
- [ ] Tab visibility pause/resume works
- [ ] Production vessel-type distribution and responsive budget preserved
- [ ] Test pages remain dev-only (redirect in production)

### Quality Gates

- [ ] TypeScript compiles with no errors
- [ ] Each test page visually matches its original at default params
- [ ] Net line reduction >= 70%

## Dependencies & Prerequisites

- All 6 polygon JSON files must be in `data/straits/` (5 need copying from main repo: bab-el-mandeb, lombok, luzon, malacca, taiwan)
- Test page source files need copying from main repo (5 directories besides hormuz)
- Background images must exist in `public/assets/images/straits/` for all 6 straits (or `public/assets/straits/` -- verify actual paths)

## Risk Analysis & Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Visual regression in specific strait | Medium | Phase-by-phase migration with per-strait visual comparison. Hormuz first as baseline. |
| Tuned waypoint values lost during extraction | Low | Extract current FLOW_SPINE arrays exactly as-is into config files before any code changes. |
| Performance regression from class/function overhead | Very Low | `ParticleSimulation` is a thin wrapper. Hot path remains identical: typed arrays + inline math. No virtual dispatch. |
| Production composable features dropped | Medium | Explicitly carry forward from `useParticleSystem.ts`: vessel-type budget (lines 218-247), responsive scaling (lines 211-216), reduced motion (lines 677-686), tab visibility (lines 689-701). |
| Lombok composite spine pattern differs from Malacca | Low | Lombok uses `buildCompositeBPts()` to merge shared spine prefix with branch. Config must support both patterns: independent branches (Malacca) and prefix-sharing branches (Lombok). |

## Open Questions for Implementer

1. **Lombok's composite spine pattern.** Lombok builds a composite spine B by concatenating `spineA[0..BRANCH_IDX]` + `spineB[1..]`. Malacca treats spines A and B as fully independent. The engine needs to handle both: either (a) always use the composite pattern, storing a `branchFromIdx` in the config, or (b) let configs define independent full-path spines and have Lombok's config pre-concatenate the shared prefix. Option (b) is simpler -- recommend pre-concatenating in the config file.

2. **Shared test page component vs. duplicated template.** The `<template>` and `<style>` are ~55 lines of identical markup across all 6 pages. A `ParticleTestPage.vue` component saves repetition but adds a file. Given it is only 6 pages and the markup is trivial, either approach is fine. Recommend the shared component to keep test pages under 80 lines.

3. **Background image paths.** The worktree has images in `public/assets/straits/` (SVGs) but test pages reference `/assets/images/straits/hormuz.jpg`. Verify actual paths before creating configs.

4. **Production `circleSize` coordinate mapping.** The current `useParticleSystem.ts` uses `ctx.setTransform(dpr * scale, ...)` where `scale = cssSize / WORLD_SIZE`. The new composable must preserve this exact transform for production rendering inside `StraitCircle`. Test pages use a fixed 1080x1080 canvas with no transform.

## Sources & References

- Detailed refactor spec: `process/particle-system-refactor.md` (in main repo, authored before this plan)
- Production composable: `composables/useParticleSystem.ts` (740 lines)
- Canvas wrapper: `components/straits/StraitParticleCanvas.vue` (66 lines)
- Circle gate: `components/straits/StraitCircle.vue` (line 3, `POLYGON_READY_STRAITS`)
- Hormuz test page (single spine reference): `pages/test/hormuz/index.vue` (959 lines)
- Malacca test page (branching spine reference): `pages/test/malacca/index.vue` (1132 lines)
- Lombok test page (composite branch reference): `pages/test/lombok/index.vue` (1109 lines)
- Polygon data: `data/straits/{id}-polygon.json` (6 files in main repo)
