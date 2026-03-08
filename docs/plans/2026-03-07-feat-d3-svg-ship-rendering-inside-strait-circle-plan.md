---
title: "feat: D3 + SVG ship rendering inside StraitCircle"
type: feat
status: active
date: 2026-03-07
linear: BF-101
origin: docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md
---

# feat: D3 + SVG ship rendering inside StraitCircle

## Overview

Replace the existing `StraitParticleCanvas` (Canvas 2D particle system) with an SVG-based ship rendering layer inside `StraitCircle.vue`. Ships are rendered as SVG circles driven by D3 data joins, consuming ship state from the existing `useShipSimulation` composable (BF-100). The SVG layer sits as a sibling to the `<img>` inside StraitCircle and is naturally clipped by the circle's `overflow: hidden` + `border-radius: 50%`.

This is a rendering-only change. The simulation composable already produces `Ship[]` with `x`, `y`, `vesselType`, and `active` fields in corridor-local coordinates (1080x1080 viewBox). This task wires those positions into SVG circles with color coding by vessel type.

## Problem Statement / Motivation

The current `StraitParticleCanvas` uses Canvas 2D and the older `useParticleSystem` composable (Bezier-based paths). BF-99 and BF-100 introduced a polygon-based corridor geometry system and a new `useShipSimulation` composable that produces frame-by-frame ship positions. This task connects the new simulation to a visual rendering layer inside the lens circle.

SVG was chosen over Canvas for this layer because:
- D3 data joins provide declarative ship-to-element binding (enter/update/exit)
- SVG circles inherit the parent's `overflow: hidden` + `border-radius: 50%` clipping for free
- No manual clip-path or arc math needed
- Easier to style, inspect, and debug in dev tools
- ~100 SVG circles is well within browser performance budgets

## Proposed Solution

### Architecture

```
StraitMap.vue
  └─ StraitData.vue (v-for each strait)
       └─ StraitCircle.vue
            ├─ <img> (satellite crop, existing)
            └─ <svg viewBox="0 0 1080 1080"> (NEW — ship layer)
                 └─ <circle> per active ship (D3 data join)
```

The SVG element uses `viewBox="0 0 1080 1080"` matching the corridor coordinate system in `corridors.json`. This means ship `x`/`y` values from `useShipSimulation` map directly to SVG coordinates with zero transformation.

### Color Palette (vessel types)

| Vessel Type | Color | CSS Variable |
|---|---|---|
| `container` | `hsl(218, 60%, 58%)` — blue | `--ship-color-container` |
| `dryBulk` | `hsl(34, 60%, 50%)` — amber | `--ship-color-dry-bulk` |
| `tanker` | `hsl(350, 60%, 55%)` — rose | `--ship-color-tanker` |

Note: The brainstorm used cyan for dry bulk, but the Linear ticket specifies amber. Rose is used for tanker instead of cyan to improve visual distinction from the blue container color.

### Data Flow

```
useCorridor(straitId)          → geometry (Ref<CorridorGeometry>)
useShipSimulation({ geometry }) → ships (ShallowRef<Ship[]>)
                                    │
                                    ▼ (triggerRef ~60fps)
                            D3 data join in StraitCircle
                                    │
                                    ▼
                            SVG <circle> elements
```

## Technical Approach

### Phase 1: Wire simulation into StraitCircle

**Files to modify:**

#### `components/straits/StraitCircle.vue`

1. Add new props:
   - `straitId: string | null` — the corridor ID for this circle (only non-null when selected)
   - `showShips: boolean` — whether to render the ship SVG layer (true when selected/zoomed)

2. Add `<svg>` element as sibling of `<img>`:

```vue
<!-- components/straits/StraitCircle.vue -->
<template>
  <div class="strait-circle" ...>
    <img v-if="imageUrl" ... />
    <svg
      v-if="showShips"
      class="strait-circle__ships"
      viewBox="0 0 1080 1080"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
    >
      <!-- D3 manages children -->
    </svg>
  </div>
</template>
```

3. Inside `<script setup>`, call `useCorridor` and `useShipSimulation`:

```ts
import { ref, computed, watch, onMounted } from 'vue'
import { select } from 'd3-selection'
import { useCorridor } from '~/composables/useCorridor'
import { useShipSimulation } from '~/composables/useShipSimulation'
import type { Ship, VesselType } from '~/types/strait'

// ...existing props + new props...

const corridorId = computed(() => props.showShips ? props.straitId : null)
const { geometry } = useCorridor(ref(corridorId))

// Traffic config from historical data (passed as prop or derived)
const trafficConfig = computed(() => {
  // Will need traffic data — see open question below
  return props.trafficConfig ?? null
})

const { ships } = useShipSimulation({ geometry, trafficConfig })
```

4. D3 data join in a `watch` on `ships`:

```ts
const svgRef = ref<SVGSVGElement | null>(null)

const SHIP_COLORS: Record<VesselType, string> = {
  container: 'hsl(218, 60%, 58%)',
  dryBulk: 'hsl(34, 60%, 50%)',
  tanker: 'hsl(350, 60%, 55%)',
}

const SHIP_RADIUS = 4

watch(ships, (allShips) => {
  if (!svgRef.value) return
  const svg = select(svgRef.value)
  const active = allShips.filter(s => s.active)

  svg.selectAll<SVGCircleElement, Ship>('circle.ship')
    .data(active, d => d.id)
    .join(
      enter => enter.append('circle')
        .attr('class', 'ship')
        .attr('r', SHIP_RADIUS)
        .attr('fill', d => SHIP_COLORS[d.vesselType])
        .attr('cx', d => d.x)
        .attr('cy', d => d.y),
      update => update
        .attr('cx', d => d.x)
        .attr('cy', d => d.y),
    )
}, { flush: 'post' })
```

Key implementation notes:
- `flush: 'post'` ensures the SVG element exists in the DOM before D3 tries to select it.
- The `ships` ShallowRef is triggered every frame by the simulation's rAF loop via `triggerRef`. This watch runs at ~60fps. D3's `.join()` with a key function (`d.id`) efficiently handles enter/update/exit.
- `.filter(s => s.active)` is necessary because the simulation uses an object pool pattern where inactive ships remain in the array.

#### `components/straits/StraitCircle.vue` — CSS additions

```css
.strait-circle__ships {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1; /* above the image */
}

.strait-circle__ships :deep(circle.ship) {
  opacity: 0.85;
  transition: none; /* no CSS transitions — D3 handles position updates */
}
```

The `preserveAspectRatio="xMaxYMax slice"` on the SVG ensures the 1080x1080 viewBox aligns bottom-right, matching the satellite image crop positioning inside the circle.

### Phase 2: Thread props through StraitData

**Files to modify:**

#### `components/straits/StraitData.vue`

Add pass-through props to StraitCircle:

```vue
<StraitCircle
  :radius="radius"
  :color="color"
  :active="active"
  :image-url="selected ? `/assets/images/straits/${id}.jpg` : undefined"
  :strait-id="selected ? id : null"
  :show-ships="selected"
  :traffic-config="selected ? trafficConfig : null"
/>
```

This requires StraitData to receive `trafficConfig` as a prop from StraitMap.

#### `components/StraitMap.vue`

Compute traffic config from historical data for the selected strait and pass it down:

```ts
const selectedTrafficConfig = computed(() => {
  const s = selectedStrait.value
  if (!s) return null
  const yearData = historical[LATEST_YEAR]?.[s.id]
  if (!yearData) return null
  return {
    vessels: yearData.vessels,
    targetCount: 100,
  }
})
```

Pass to StraitData: `:traffic-config="selectedTrafficConfig"` (only on the selected strait, or conditionally).

### Phase 3: Remove old particle system

Once BF-101 ships are rendering correctly:

1. Remove `<StraitParticleCanvas>` from `StraitMap.vue` template
2. Delete `components/straits/StraitParticleCanvas.vue`
3. Delete `composables/useParticleSystem.ts`
4. Delete `data/straits/strait-paths.ts` (Bezier paths used only by old system)
5. Clean up any unused imports

**Note:** The git status shows these files are already deleted in the working tree on `dev`. The worktree for BF-101 should confirm whether these deletions are already committed or need to happen as part of this work.

## SVG Alignment: `preserveAspectRatio` rationale

The satellite images in `public/assets/images/straits/` are 1080x1080 crops. The `<img>` inside StraitCircle uses `object-fit: cover` which, for a square image in a circular container, fills the circle entirely.

The SVG `viewBox="0 0 1080 1080"` matches the corridor coordinate space. Since the circle clips to a round viewport and the SVG fills the same space as the image, ship coordinates from the simulation map 1:1 to visual positions. The `preserveAspectRatio="xMaxYMax slice"` ensures alignment if the container aspect ratio differs from 1:1 (defensive — in practice the circle is always square).

## System-Wide Impact

- **Interaction graph**: `useShipSimulation` fires `triggerRef(ships)` every rAF frame. The D3 watch in StraitCircle consumes this. No other reactivity chains are affected.
- **Error propagation**: If corridor data is missing for a strait, `useCorridor` returns `null` geometry, `useShipSimulation` never starts, and no SVG circles render. Silent graceful degradation.
- **State lifecycle risks**: `useShipSimulation` uses `onScopeDispose` for cleanup. When StraitCircle unmounts (strait deselected), the simulation stops and the rAF loop is cancelled. No orphaned loops.
- **API surface parity**: StraitCircle gains new optional props (`straitId`, `showShips`, `trafficConfig`). Existing usage without these props is unaffected (ships simply don't render).
- **Performance**: ~100 SVG circle elements with D3 `.join()` and attribute updates at 60fps. This is well within browser SVG rendering budgets. The `ships` array uses `shallowRef` + `triggerRef` (single notification per frame), and D3's key-based join minimizes DOM mutations to enter/exit events only (position updates are attribute changes on existing elements).

## Acceptance Criteria

- [ ] `StraitCircle.vue` renders an `<svg viewBox="0 0 1080 1080">` as sibling of `<img>` when `showShips` is true
- [ ] SVG circles represent active ships from `useShipSimulation`, keyed by `ship.id`
- [ ] Ships are color-coded: container=blue (`hsl(218,60%,58%)`), dryBulk=amber (`hsl(34,60%,50%)`), tanker=rose (`hsl(350,60%,55%)`)
- [ ] Ships are clipped to circle boundary via parent `overflow: hidden` + `border-radius: 50%` (no manual clip-path)
- [ ] Animation runs at 60fps with ~100 ships (no dropped frames in Chrome DevTools Performance panel)
- [ ] Rendering is strait-agnostic: works for any strait ID that has corridor data in `corridors.json`
- [ ] `prefers-reduced-motion` respected: ships render as static dots (handled by `useShipSimulation` internally)
- [ ] Old `StraitParticleCanvas` and `useParticleSystem` removed (if not already deleted)
- [ ] No regressions: overview map circles, zoom transitions, panel positioning all work unchanged
- [ ] SSR safe: no `window`/`document` access outside `onMounted`

## Dependencies & Risks

| Dependency | Status | Risk |
|---|---|---|
| `useShipSimulation` composable (BF-100) | Merged | None — ready to consume |
| `useCorridor` composable (BF-99) | Merged | None — ready to consume |
| `corridors.json` — only Hormuz has data | Partial | Other straits won't show ships until their corridor polygons are added. This is expected and by design. |
| D3 v7 (`d3-selection`) | Installed | None — already a project dependency |

**Risk: Watch firing at 60fps.** Vue's `watch` with `flush: 'post'` on a `shallowRef` that triggers every frame will fire the D3 join 60 times per second. This is intentional and matches how the old Canvas system worked (rAF loop reading reactive state). If profiling shows overhead from Vue's watcher scheduling, the fallback is to use a raw `watchEffect` or bypass Vue reactivity entirely by reading `ships.value` inside a dedicated rAF loop within the component. This is unlikely to be needed for ~100 elements.

## Open Questions

1. **Traffic config threading**: Should `trafficConfig` be passed down as a prop through `StraitMap -> StraitData -> StraitCircle`, or should `StraitCircle` compute it internally from a `straitId` + imported historical data? Prop threading is cleaner for separation of concerns but adds prop drilling. Internal computation is simpler but couples StraitCircle to the data layer.

   **Recommendation**: Prop threading. StraitCircle should remain a presentation component. StraitMap already has access to historical data and the selected year.

2. **Ship dot radius**: The plan uses `r=4` in the 1080x1080 coordinate space. This may need visual tuning. At the zoomed-in lens size (~45% of viewport height), each dot would be roughly 2-3px on screen. If too small, increase to 5-6.

3. **Glow / bloom effect**: The brainstorm mentioned particles as "the hero moment." Should ships have a subtle glow (SVG filter or box-shadow via CSS)? This could be deferred to a polish pass.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md](docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md) — key decisions: hybrid HTML+Canvas approach (this task evolves it to SVG), color coding by vessel type, ~100 particle target count
- **BF-99 useCorridor**: `composables/useCorridor.ts` — derives corridor geometry from polygon data
- **BF-100 useShipSimulation**: `composables/useShipSimulation.ts` — rendering-agnostic ship simulation producing `Ship[]` with `x`, `y`, `vesselType`, `active`
- **StraitCircle**: `components/straits/StraitCircle.vue` — target component for SVG insertion
- **StraitData**: `components/straits/StraitData.vue` — parent that composes StraitCircle + StraitLabel
- **StraitMap**: `components/StraitMap.vue` — top-level map component, owns zoom/selection state
- **Corridor data**: `data/straits/corridors.json` — Hormuz polygon with 1080x1080 viewBox
- **Types**: `types/strait.ts` — `Ship`, `VesselType`, `CorridorGeometry` interfaces
