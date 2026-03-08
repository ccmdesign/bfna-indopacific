---
title: Ship Simulation Composable
type: feat
status: active
date: 2026-03-07
deepened: 2026-03-07
---

# feat: Ship Simulation Composable (lifecycle, flow, bidirectional lanes)

## Enhancement Summary

**Deepened on:** 2026-03-07
**Sections enhanced:** 8
**Research sources:** Vue 3 docs (shallowRef/triggerRef), VueUse (useRafFn), existing codebase patterns (useParticleSystem, useCorridor), game programming patterns (object pooling), MDN (requestAnimationFrame), TypeScript reviewer, performance oracle, architecture strategist, frontend races reviewer, code simplicity reviewer, pattern recognition specialist

### Key Improvements
1. **Object pool pattern** replaces create/destroy lifecycle to eliminate GC stutters on 100+ ships per frame
2. **`triggerRef()` over array replacement** for the `shallowRef<Ship[]>` -- mutate in-place then trigger once, avoiding 100-element array allocation every frame
3. **Pre-computed tangent/perpendicular LUT** at geometry derivation time eliminates per-frame atan2/sqrt calls
4. **Cancellation token race-condition guard** prevents orphaned rAF loops when geometry changes rapidly (learned from existing `useParticleSystem` `cancelled` flag pattern)
5. **`onScopeDispose` cleanup** for proper effect scope handling beyond just `onUnmounted`

### New Risks Discovered
- **High-refresh-rate displays (120Hz+):** dt clamping at `Math.min(dt, 3)` assumes 60fps baseline; needs recalibration for 120Hz where dt ~1.0 not ~3.0 on frame drops
- **`triggerRef` + computed consumers:** If a downstream computed reads `ships.value`, `triggerRef` will trigger it every frame -- consumers must use `watchEffect` with explicit dirty-checking or throttling to avoid unnecessary template updates
- **Geometry hot-swap during animation:** If corridor ID changes while ships are mid-transit, all ship positions become invalid against the new geometry -- need an explicit reset-on-geometry-change guard

## Overview

Create a `useShipSimulation` composable that manages ship state -- spawning, flowing along a corridor centerline, and despawning -- driven entirely by corridor geometry from `useCorridor`. Ships flow bidirectionally in two lanes, funnel through narrow sections, scatter in wide sections, and are proportionally distributed by vessel type using existing traffic data. The composable is data-driven: no strait-specific constants.

## Problem Statement / Motivation

The existing `useParticleSystem` composable (BF-78) renders particles along Bezier curves inside a circular lens view. It is tightly coupled to `strait-paths.ts` Bezier control points and the lens coordinate system. BF-99 introduced polygon-based corridor geometry (`corridors.json`, `useCorridor.ts`) with walls, centerline, local widths, and door edges. The new ship simulation must use this corridor geometry to produce realistic bidirectional traffic flow where ships enter/exit only through doors, respect corridor walls via lateral width constraints, and visually funnel through narrow sections.

## Proposed Solution

A new composable `useShipSimulation` that:

1. Accepts corridor geometry (`CorridorGeometry`) and traffic data as inputs
2. Produces a reactive array of ship positions (progress along centerline + lateral offset)
3. Manages the full ship lifecycle: spawn at door -> flow -> despawn at opposite door
4. Is rendering-agnostic -- outputs positions, does not draw

### Architecture

```
corridors.json
      |
      v
useCorridor(id)  -->  CorridorGeometry { centerline, widths, progress, walls }
      |
      v
useShipSimulation(geometry, trafficData)  -->  Ref<Ship[]>
      |
      v
[Rendering component consumes Ship[] to draw on canvas/SVG]
```

### Research Insights

**Architecture Strategist Review:**
- The composable correctly follows the leaf-node pattern: it consumes `CorridorGeometry` (pure data) and produces `Ship[]` (pure data). No upward dependencies, no side effects beyond rAF. This is good separation of concerns.
- The rendering-agnostic output is the right call -- it follows the presentation/logic split pattern where the composable owns simulation state and a separate component owns rendering.
- Consider making `trafficConfig` a `MaybeRefOrGetter<T>` so it can be reactive (e.g., when the user changes the selected year, traffic proportions change). The existing `useParticleSystem` watches `year` for this reason.

**Pattern Recognition:**
- The existing codebase uses a consistent pattern across composables: `{ start, stop, isRunning }` return shape. `useShipSimulation` correctly mirrors this.
- The `cancelled` flag pattern in `useParticleSystem` (line 180) is the project's established cancellation-token approach. Reuse it exactly.

## Technical Approach

### Ship State Interface

```typescript
// composables/useShipSimulation.ts

export type VesselType = 'container' | 'dryBulk' | 'tanker'

export interface Ship {
  id: number
  /** Progress along centerline, 0..1 */
  progress: number
  /** Direction of travel: 1 = door A -> door B, -1 = door B -> door A */
  direction: 1 | -1
  /** Vessel classification */
  vesselType: VesselType
  /** Lateral offset from centerline, normalized -1..1 (negative = left lane, positive = right lane) */
  laneOffset: number
  /** Speed in progress-units per second (varies by vessel type) */
  speed: number
  /** Resolved position in corridor-local coordinates [x, y] */
  x: number
  y: number
  /** Whether this ship slot is currently active (for object pool) */
  active: boolean
}
```

### Research Insights

**TypeScript Reviewer (Kieran):**
- The `Ship` interface is clean and focused. The `id` field as `number` is correct for a monotonic counter (no need for UUID overhead in an ephemeral simulation).
- Consider making `VesselType` a const tuple for type-safe iteration: `const VESSEL_TYPES = ['container', 'dryBulk', 'tanker'] as const; type VesselType = typeof VESSEL_TYPES[number]`. This mirrors the existing `PARTICLE_TYPES` array in `useParticleSystem.ts` (line 39) and enables both type safety and runtime iteration from a single source.
- The `direction: 1 | -1` literal union is good -- avoids boolean ambiguity about which door is "forward".

**Code Simplicity Review:**
- The `active` field (for object pooling) is the only addition to the original interface. It is justified by the performance need to avoid GC on 100+ objects per frame. Do not add fields speculatively (e.g., no `opacity`, `scale`, `rotation` until a rendering ticket requires them).

### Phase 1: Core Simulation Loop

**File:** `composables/useShipSimulation.ts`

**Inputs:**
- `geometry: Ref<CorridorGeometry | null>` -- from `useCorridor`
- `trafficConfig: { vessels: { total, container, dryBulk, tanker }, targetCount?: number }`

**Outputs:**
- `ships: ShallowRef<Ship[]>` -- reactive ship array, updated each frame
- `start(): void`, `stop(): void`, `isRunning: Ref<boolean>`

**Core loop (rAF-driven, delta-time normalized):**

1. **Tick**: For each ship, advance `progress += speed * direction * dt`
2. **Despawn**: If `progress > 1` (direction=1) or `progress < 0` (direction=-1), remove ship
3. **Spawn**: If `ships.length < targetCount`, spawn a new ship at the appropriate door edge (`progress=0` for direction=1, `progress=1` for direction=-1). Stagger spawns: max 1-2 per frame to avoid clumping at doors.
4. **Resolve position**: Interpolate centerline at `ship.progress`, then offset laterally by `ship.laneOffset * localWidth * 0.4` (0.4 = half-lane factor, keeping ships within corridor)

**Position resolution algorithm:**

```
Given ship.progress (0..1):
1. Binary-search geometry.progress[] to find segment index i
2. Lerp between centerline[i] and centerline[i+1]
3. Compute perpendicular direction from centerline tangent
4. localWidth = lerp(widths[i], widths[i+1], segmentT)
5. lateralPx = ship.laneOffset * localWidth * 0.4
6. ship.x = centerX + perpX * lateralPx
7. ship.y = centerY + perpY * lateralPx
```

### Research Insights

**Performance Oracle:**
- **Binary search is O(log n) per ship per frame.** With ~100 ships and ~30 centerline segments, this is ~100 * ~5 comparisons = 500 comparisons/frame. This is fine, but a **linear scan with cached last-index** would be faster in practice because ships move incrementally: most frames, the segment index either stays the same or advances by 1. Use a `lastSegmentIndex` field on each Ship and scan from there.
- **Pre-compute tangent normals at geometry time, not per frame.** The centerline is static; the perpendicular direction at each segment can be computed once in `deriveGeometry` or in a one-time setup pass when geometry changes. Store as `tangentNormals: Point2D[]` alongside `centerline`. This eliminates per-frame `Math.atan2` and `Math.sqrt` calls for 100 ships.
- **`triggerRef()` over array replacement** is the correct strategy. The existing `useParticleSystem` mutates its particle array in-place every frame (line 372-375). For `shallowRef`, call `triggerRef(ships)` once after the full tick loop completes, not after each ship update. This batches the reactivity notification.

**Implementation detail for triggerRef:**
```typescript
import { shallowRef, triggerRef } from 'vue'

const ships = shallowRef<Ship[]>([])

function tick(timestamp: DOMHighResTimeStamp) {
  // ... dt calculation ...

  // Mutate ships in-place (no reactivity triggered yet)
  for (const ship of ships.value) {
    if (!ship.active) continue
    ship.progress += ship.speed * ship.direction * dt
    // ... resolve position ...
  }

  // Single reactivity trigger after all mutations
  triggerRef(ships)

  // ... schedule next frame ...
}
```

**Delta-time normalization best practice (from MDN and web research):**
- Never assume a fixed frame rate. The rAF callback receives a `DOMHighResTimeStamp`. Compute `dt` as `(timestamp - lastTimestamp) / 1000` for seconds-based speed, or `(timestamp - lastTimestamp) / 16.667` for frame-ratio-based speed (matching the existing `useParticleSystem` convention).
- Clamp dt to prevent teleportation after tab resume: `Math.min(dt, 3)` (as in existing code). However, on 120Hz displays, normal dt is ~0.5 (8.33ms / 16.667ms). Consider clamping to `Math.min(dt, 4)` to allow slightly larger catch-up frames without causing visual jumps.

### Phase 2: Bidirectional Two-Lane Flow

- Direction A ships (door A -> door B): `laneOffset` is negative (left half of corridor)
- Direction B ships (door B -> door A): `laneOffset` is positive (right half of corridor)
- Each ship gets a random `laneOffset` within its lane: direction=1 gets `random(-0.9, -0.1)`, direction=-1 gets `random(0.1, 0.9)`
- The `* localWidth * 0.4` scaling ensures ships automatically funnel in narrow sections and scatter in wide sections -- no special logic needed

### Research Insights

**Edge Cases (Frontend Races Reviewer - Julik):**
- **Lane offset of exactly 0.0:** A ship on the exact centerline could visually collide with opposing traffic. The `random(-0.9, -0.1)` and `random(0.1, 0.9)` ranges already prevent this. Good. However, verify the random function excludes the boundary: `Math.random()` returns `[0, 1)`, so `0.1 + Math.random() * 0.8` yields `[0.1, 0.9)` -- the upper bound 0.9 is technically excluded. This is fine for visual purposes but worth a comment.
- **Corridor with zero width at a point:** If `localWidth` drops to 0 at a pinch point (degenerate geometry), `lateralPx` becomes 0 and all ships collapse to the centerline. This is actually the correct visual behavior (ships squeeze through single-file). No special handling needed, but add a comment noting this is intentional.

**Motion Design (Emil Kowalski perspective):**
- The funneling/scattering behavior is the core visual payoff of this feature. The 0.4 half-lane factor is conservative (ships use 80% of corridor width total). This leaves a 10% margin on each side before the wall, which prevents the visual impression of ships "riding the rail." This is good restraint.

### Phase 3: Speed Variation & Vessel Distribution

**Speed by vessel type** (relative to base speed):
- `container`: 1.2x (faster, scheduled services)
- `dryBulk`: 1.0x (mid-range)
- `tanker`: 0.8x (slower, heavy cargo)

Plus per-ship random jitter of +/-15% to prevent lockstep movement.

**Base speed calibration:** Target a full corridor transit in ~8-12 seconds for visual appeal. With `centerlineLength` known, `baseSpeed = 1.0 / (transitSeconds * 60)` progress-units per frame at 60fps. Use delta-time normalization for frame-rate independence.

**Vessel distribution:** Proportional to `trafficData.vessels.{container, dryBulk, tanker}`. When spawning a new ship, use weighted random selection based on these ratios.

**Ship count:** The `targetCount` parameter defaults to ~100 but can be scaled by traffic volume. On mobile (`window.innerWidth < 768`), halve the count. Use `shallowRef` for the ship array to avoid deep reactivity overhead on 100+ objects.

### Research Insights

**Performance Oracle:**
- **Object pool pattern** is strongly recommended for 100+ ships. Instead of creating and destroying `Ship` objects each frame (which triggers GC), pre-allocate a fixed-size array and mark ships as `active`/`inactive`. When a ship despawns, set `active = false`. When spawning, find the first inactive slot and reinitialize it. This eliminates object allocation/deallocation churn entirely.
- The existing `useParticleSystem` does NOT use object pooling (it pre-builds all particles at init time and wraps them around: `p.progress -= 1` / `p.progress += 1` on line 374-375). The ship simulation is different because ships enter/exit at doors, so wrap-around is not appropriate. Object pooling is the correct alternative.
- **Weighted random selection** for vessel type: use cumulative probability, not repeated `Math.random()` calls. Pre-compute thresholds once: `[containerRatio, containerRatio + dryBulkRatio, 1.0]`. Single `Math.random()` per spawn.

**Implementation detail for object pool:**
```typescript
const POOL_SIZE = 150 // 1.5x target to handle burst headroom
const pool: Ship[] = Array.from({ length: POOL_SIZE }, (_, i) => ({
  id: i, progress: 0, direction: 1, vesselType: 'container',
  laneOffset: 0, speed: 0, x: 0, y: 0, active: false,
}))

function spawnShip(direction: 1 | -1, vesselType: VesselType): Ship | null {
  const slot = pool.find(s => !s.active)
  if (!slot) return null // pool exhausted
  slot.active = true
  slot.direction = direction
  slot.vesselType = vesselType
  slot.progress = direction === 1 ? 0 : 1
  slot.laneOffset = direction === 1
    ? -(0.1 + Math.random() * 0.8)
    : (0.1 + Math.random() * 0.8)
  slot.speed = baseSpeed * SPEED_MULTIPLIERS[vesselType] * (0.85 + Math.random() * 0.3)
  return slot
}

function despawnShip(ship: Ship) {
  ship.active = false
}
```

**Code Simplicity Review:**
- The speed multiplier constants (`1.2`, `1.0`, `0.8`) should be a `Record<VesselType, number>` constant, not inline values. This is consistent with how `PARTICLE_COLORS` is defined in `useParticleSystem.ts` (line 33-37).
- The mobile detection (`window.innerWidth < 768`) should match the existing `computeTotalBudget()` function in `useParticleSystem.ts` (line 84-88) for consistency. Consider extracting a shared utility if this pattern appears a third time.

### Phase 4: Lifecycle Guardrails

- Ships spawn at door edges only (`progress = 0.0` or `progress = 1.0`)
- Ships despawn when they exit the opposite door
- No wall-crossing: lateral offset is bounded by `localWidth * 0.4`, which is always inside the corridor polygon since walls are at `+/- localWidth * 0.5`
- Direction assignment: 50/50 split, or configurable via traffic data if directionality data becomes available

### Research Insights

**Frontend Races Reviewer (Julik):**
- **Critical race: geometry change during animation.** If the corridor ID changes (e.g., user navigates from Hormuz to Malacca), the old ships have progress values relative to the old geometry. The `watch(geometry)` handler MUST:
  1. Call `stop()` to cancel the current rAF loop
  2. Clear/deactivate all ships in the pool
  3. Call `start()` with the new geometry
  This is the same pattern used in `useParticleSystem` (line 488-503) where `watch(straitId)` stops, clears canvas, and restarts.

- **Tab resume spawn burst:** After a long tab-hidden period, `lastTimestamp` resets to 0 (line 362-363 in `useParticleSystem`). On resume, the first frame's dt should be treated as 0 (skip frame) rather than a large dt. The existing code handles this: `if (lastTimestamp === 0) { lastTimestamp = timestamp; return }`. Mirror this exactly.

- **Visibility handler race with stop():** The visibility handler in `useParticleSystem` checks `!cancelled` before restarting the rAF loop (line 474). This prevents a race where `stop()` is called but the visibility handler re-enables the loop. Copy this guard.

**Vue Composable Best Practices:**
- Use `onScopeDispose` (or VueUse's `tryOnScopeDispose`) in addition to `onUnmounted` for proper cleanup when the composable is used inside a `watchEffect` or `effectScope` that may be disposed independently of the component lifecycle.
- All browser API access (`window.matchMedia`, `document.addEventListener`, `requestAnimationFrame`) must be gated behind `onMounted` for SSR safety. The existing `useParticleSystem` does this correctly (line 437).

**Accessibility (prefers-reduced-motion):**
- For reduced motion, show ships at evenly-spaced static positions along the centerline (same approach as `drawStaticParticles` in `useParticleSystem`, line 385-395). Place ships at `progress = i / count` and resolve their positions once. Do not run the rAF loop.
- When `prefers-reduced-motion` changes dynamically (user toggles system setting), handle the transition: if reduced motion is enabled mid-animation, stop the loop and snap to static positions. If disabled, start the loop. Mirror the existing `motionHandler` pattern (line 454-464).

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Output format | Plain `Ship[]` with x,y coordinates | Rendering-agnostic; canvas, SVG, or WebGL can consume |
| Reactivity strategy | `shallowRef<Ship[]>` with `triggerRef()` | Mutate in-place, trigger once per frame; avoids array allocation and deep proxy overhead |
| Position resolution | Computed each frame from progress | Avoids storing stale positions; centerline is static so lookup is cheap |
| Lane assignment | Random offset at spawn, fixed for lifetime | Simpler than lane-switching; realistic for narrow corridors |
| Spawn throttling | Max 2 ships per frame | Prevents visual burst at doors |
| No strait-specific code | Composable takes `CorridorGeometry` input | When `corridors.json` gains malacca/taiwan entries, simulation works automatically |
| Object pool | Pre-allocated Ship array with `active` flag | Eliminates per-frame GC pressure from create/destroy lifecycle |
| Tangent pre-computation | Perpendicular normals computed once at geometry change | Removes per-frame atan2/sqrt; centerline is static |

## Acceptance Criteria

- [ ] `composables/useShipSimulation.ts` exports `useShipSimulation` composable with reactive ship state
- [ ] ~100 ships flowing bidirectionally through any corridor geometry
- [ ] Ships funnel in narrow sections (lateral offset scales with `localWidth`)
- [ ] Ships scatter in wide sections (same mechanism, wider corridor = more spread)
- [ ] Ships only enter/exit through doors (`progress=0` or `progress=1`), never cross walls
- [ ] Ship count proportional to traffic volume data from `straits.json` historical entries
- [ ] Speed varies by vessel type: containers fastest, tankers slowest
- [ ] Composable accepts any `CorridorGeometry` -- no Hormuz-specific constants
- [ ] `prefers-reduced-motion`: static ship positions (no animation loop)
- [ ] Tab visibility pause: stop rAF when tab is hidden, resume on visibility
- [ ] Frame-rate-independent via delta-time normalization
- [ ] SSR-safe: all browser APIs gated behind `onMounted`

## System-Wide Impact

- **Interaction graph**: `useShipSimulation` is a leaf composable -- it consumes `CorridorGeometry` and produces `Ship[]`. No callbacks, no side effects beyond rAF.
- **Error propagation**: If `geometry` is null, composable is inert (no ships, no loop). No throws.
- **State lifecycle risks**: Ship array is local to the composable instance. Cleanup in `onUnmounted` cancels rAF and clears array. Module-level cache is not needed (ship state is ephemeral).
- **API surface parity**: Follows the same `{ start, stop, isRunning }` pattern as `useParticleSystem`.
- **Integration test scenarios**: (1) Pass Hormuz geometry, verify ships stay within corridor bounds. (2) Pass a synthetic narrow corridor, verify lateral offsets compress. (3) Verify ship count matches target. (4) Verify no ships exist when geometry is null.

### Research Insights

**Architecture Strategist:**
- The leaf-composable classification is accurate. Verify that no future rendering component creates a bidirectional dependency (e.g., passing click events back to the simulation). If interaction is needed later (e.g., click-to-select a ship), use an event emitter pattern or provide a `getShipAt(x, y)` query method on the composable rather than passing callbacks.
- The `{ start, stop, isRunning }` API surface is the project's established composable control pattern. Do not deviate.

**Testing Considerations:**
- The composable can be tested without DOM by mocking `requestAnimationFrame` to run synchronously. Create a test helper that calls the tick function directly with synthetic timestamps.
- Test the object pool: spawn to capacity (POOL_SIZE), verify that additional spawn attempts return null. Despawn one, verify next spawn reuses the slot.
- Test the perpendicular calculation at corridor endpoints (progress=0 and progress=1) where tangent computation may use a one-sided difference instead of a central difference.

## Dependencies & Risks

- **Depends on:** `useCorridor.ts` (BF-99, already merged) and `corridors.json`
- **Risk -- perpendicular calculation at sharp corners:** The centerline may have sharp bends where the perpendicular direction flips. Mitigation: smooth the tangent vector by averaging adjacent segments.
- **Risk -- spawn bursting:** If many ships despawn simultaneously (e.g., after tab resume), spawner could flood the door. Mitigation: spawn throttle of max 2 per frame.
- **Risk -- geometry hot-swap:** If corridor ID changes mid-animation, ship progress values become invalid. Mitigation: watch geometry ref, stop + clear pool + restart on change.
- **Risk -- triggerRef downstream amplification:** Any computed or watchEffect reading `ships.value` will re-run every frame (~60Hz). Downstream consumers must be frame-aware or use throttling. Document this in JSDoc.
- **Risk -- 120Hz+ displays:** Delta-time clamping designed for 60fps may behave differently on high-refresh displays. Test on 120Hz hardware; consider adjusting clamp ceiling.
- **Future:** A rendering component (canvas or SVG) will consume `Ship[]` -- that is a separate ticket.

## Implementation Checklist

### Files to create

- [ ] `composables/useShipSimulation.ts` -- main composable (~200-250 lines)

### Files to modify

- [ ] `types/strait.ts` -- add `Ship` and `VesselType` exports (or export from composable file)

### Files to reference (read-only)

- `composables/useCorridor.ts` -- `CorridorGeometry` interface and derivation
- `composables/useParticleSystem.ts` -- pattern reference for rAF loop, visibility, reduced-motion
- `utils/polyline.ts` -- `resamplePolyline` may be reused for tangent smoothing
- `data/straits/straits.json` -- historical vessel counts for traffic distribution
- `public/styles.css` -- CSS custom properties for vessel type colors (`--color-cargo-container`, `--color-cargo-dry-bulk`, `--color-cargo-tanker`)

## Sources & References

- **Corridor geometry system:** `composables/useCorridor.ts` (BF-99)
- **Particle system pattern:** `composables/useParticleSystem.ts` (BF-78)
- **Traffic data:** `data/straits/straits.json` historical section
- **Corridor data:** `data/straits/corridors.json` (currently Hormuz only)
- **Type definitions:** `types/strait.ts` -- `CorridorGeometry`, `Point2D`, `ParticleType`
- **Vue 3 shallowRef/triggerRef:** [Vue Reactivity Advanced API](https://vuejs.org/api/reactivity-advanced)
- **VueUse useRafFn:** [VueUse useRafFn](https://vueuse.org/core/useRafFn) (reference only; VueUse is not a project dependency)
- **Object Pool pattern:** [Game Programming Patterns - Object Pool](https://gameprogrammingpatterns.com/object-pool.html)
- **rAF delta-time best practices:** [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- **rAF animation loop optimization:** [Supercharge Your Web Animations](https://dev.to/josephciullo/supercharge-your-web-animations-optimize-requestanimationframe-like-a-pro-22i5)
