---
title: Ship Simulation Composable
type: feat
status: active
date: 2026-03-07
---

# feat: Ship Simulation Composable (lifecycle, flow, bidirectional lanes)

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
}
```

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

### Phase 2: Bidirectional Two-Lane Flow

- Direction A ships (door A -> door B): `laneOffset` is negative (left half of corridor)
- Direction B ships (door B -> door A): `laneOffset` is positive (right half of corridor)
- Each ship gets a random `laneOffset` within its lane: direction=1 gets `random(-0.9, -0.1)`, direction=-1 gets `random(0.1, 0.9)`
- The `* localWidth * 0.4` scaling ensures ships automatically funnel in narrow sections and scatter in wide sections -- no special logic needed

### Phase 3: Speed Variation & Vessel Distribution

**Speed by vessel type** (relative to base speed):
- `container`: 1.2x (faster, scheduled services)
- `dryBulk`: 1.0x (mid-range)
- `tanker`: 0.8x (slower, heavy cargo)

Plus per-ship random jitter of +/-15% to prevent lockstep movement.

**Base speed calibration:** Target a full corridor transit in ~8-12 seconds for visual appeal. With `centerlineLength` known, `baseSpeed = 1.0 / (transitSeconds * 60)` progress-units per frame at 60fps. Use delta-time normalization for frame-rate independence.

**Vessel distribution:** Proportional to `trafficData.vessels.{container, dryBulk, tanker}`. When spawning a new ship, use weighted random selection based on these ratios.

**Ship count:** The `targetCount` parameter defaults to ~100 but can be scaled by traffic volume. On mobile (`window.innerWidth < 768`), halve the count. Use `shallowRef` for the ship array to avoid deep reactivity overhead on 100+ objects.

### Phase 4: Lifecycle Guardrails

- Ships spawn at door edges only (`progress = 0.0` or `progress = 1.0`)
- Ships despawn when they exit the opposite door
- No wall-crossing: lateral offset is bounded by `localWidth * 0.4`, which is always inside the corridor polygon since walls are at `+/- localWidth * 0.5`
- Direction assignment: 50/50 split, or configurable via traffic data if directionality data becomes available

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Output format | Plain `Ship[]` with x,y coordinates | Rendering-agnostic; canvas, SVG, or WebGL can consume |
| Reactivity strategy | `shallowRef<Ship[]>` with manual trigger | Avoids deep proxy overhead on 100+ mutable objects per frame |
| Position resolution | Computed each frame from progress | Avoids storing stale positions; centerline is static so lookup is cheap |
| Lane assignment | Random offset at spawn, fixed for lifetime | Simpler than lane-switching; realistic for narrow corridors |
| Spawn throttling | Max 2 ships per frame | Prevents visual burst at doors |
| No strait-specific code | Composable takes `CorridorGeometry` input | When `corridors.json` gains malacca/taiwan entries, simulation works automatically |

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

## Dependencies & Risks

- **Depends on:** `useCorridor.ts` (BF-99, already merged) and `corridors.json`
- **Risk -- perpendicular calculation at sharp corners:** The centerline may have sharp bends where the perpendicular direction flips. Mitigation: smooth the tangent vector by averaging adjacent segments.
- **Risk -- spawn bursting:** If many ships despawn simultaneously (e.g., after tab resume), spawner could flood the door. Mitigation: spawn throttle of max 2 per frame.
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
