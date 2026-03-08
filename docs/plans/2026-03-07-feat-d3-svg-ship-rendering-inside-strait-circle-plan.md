---
title: "feat: D3 + SVG ship rendering inside StraitCircle"
type: feat
status: completed
date: 2026-03-07
linear: BF-101
origin: docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md
deepened: 2026-03-07
---

# feat: D3 + SVG ship rendering inside StraitCircle

## Enhancement Summary

**Deepened on:** 2026-03-07
**Sections enhanced:** 8
**Research sources:** D3 v7 docs (Context7), Vue 3 reactivity docs, SVG performance benchmarks, MDN preserveAspectRatio spec, codebase analysis of StraitCircle/StraitData/StraitMap/useShipSimulation/useCorridor

### Key Improvements
1. Identified a critical Vue reactivity bug: `watch(ships, ...)` will NOT fire with `triggerRef` on a `shallowRef` — must use `watch(() => ships.value, ...)` or the direct ref form `watch(ships, ...)` with the ref itself (not a destructured `.value`)
2. Discovered `preserveAspectRatio="xMidYMid meet"` is more correct than `xMaxYMax slice` for a 1:1 viewBox-to-container mapping where both are square
3. Added a concrete fallback strategy: bypass Vue watcher entirely with a dedicated rAF reader if profiling shows overhead
4. Resolved Open Question #1 with a `provide/inject` alternative that eliminates 3-level prop drilling
5. Added edge cases for zoom transition timing, SVG mount/unmount race, and D3 selection leaks

### New Risks Discovered
- Vue `watch` + `shallowRef` + `triggerRef` interaction requires careful watcher source syntax
- D3 `select()` on a ref that becomes `null` during zoom-out can throw; needs guard
- `StraitParticleCanvas` still exists in this worktree and must be confirmed removed before shipping

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

### Research Insights

**SVG performance validation:** Industry benchmarks confirm SVG handles hundreds of animated elements comfortably at 60fps. The Canvas advantage only emerges at 3,000-5,000+ elements. For ~100 circles with attribute-only updates (no geometry changes), SVG is the correct choice and avoids Canvas's redraw-everything-from-scratch model.

**D3 data join efficiency:** D3's `.join()` with a key function (`d => d.id`) minimizes DOM mutations. On each frame, only `cx`/`cy` attribute updates happen on existing elements — no element creation or removal unless ships spawn/despawn. This is the optimal pattern for frequent updates per D3 v7 documentation.

**References:**
- [SVG vs Canvas vs WebGL benchmarks (2025)](https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025)
- [D3 selection.join() documentation](https://github.com/d3/d3/blob/main/docs/d3-selection/joining.md)

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
      ref="svgRef"
      class="strait-circle__ships"
      viewBox="0 0 1080 1080"
      preserveAspectRatio="xMidYMid meet"
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

### Research Insights — Phase 1

**Critical: Vue `watch` + `shallowRef` + `triggerRef` interaction.**

There is a known Vue 3 behavior (vuejs/core#9579) where `watch(() => ships.value, ...)` does NOT fire when `triggerRef(ships)` is called. The correct form is `watch(ships, ...)` — passing the ref object directly, not an accessor function. The plan's code already uses the correct form (`watch(ships, ...)`), but this must not be refactored to the accessor pattern during implementation.

**Fallback if Vue watcher overhead is measurable:**

If Chrome DevTools Performance panel shows Vue's watcher scheduling consuming >1ms per frame, bypass Vue reactivity entirely with a dedicated rAF reader inside the component:

```ts
// Fallback: bypass Vue watcher, read ships directly in rAF
let rafId: number | null = null
function renderLoop() {
  if (!svgRef.value) { rafId = requestAnimationFrame(renderLoop); return }
  const active = ships.value.filter(s => s.active)
  // ... D3 join same as above ...
  rafId = requestAnimationFrame(renderLoop)
}
onMounted(() => { if (props.showShips) rafId = requestAnimationFrame(renderLoop) })
onBeforeUnmount(() => { if (rafId) cancelAnimationFrame(rafId) })
```

This is unlikely to be needed for ~100 elements but documents the escape hatch.

**D3 selection best practice — avoid `select()` on null refs:**

When `showShips` toggles to `false`, the `v-if` removes the SVG from the DOM. If the watcher fires during the same tick (before DOM update), `svgRef.value` may be `null`. The `if (!svgRef.value) return` guard handles this, but ensure the watcher uses `flush: 'post'` so it runs after DOM updates.

**SVG `preserveAspectRatio` correction:**

The original plan specifies `xMaxYMax slice`. Since both the viewBox (1080x1080) and the container (circular, always square via `width = height = var(--diameter)`) have a 1:1 aspect ratio, `preserveAspectRatio` alignment is irrelevant — the viewBox maps 1:1 to the container regardless of alignment. However, `xMidYMid meet` is the safer default because:
- `meet` preserves the entire viewBox (no clipping), which is correct since coordinates map 1:1
- `slice` would clip content if a rounding error makes the container non-square
- `xMidYMid` centers the viewBox, which is the expected behavior for a centered circle

If the satellite image uses a non-centered crop offset, this may need to change to match. Verify against the actual image positioning.

**Performance: `.filter()` allocation per frame.**

`allShips.filter(s => s.active)` creates a new array every frame (~60x/sec). For ~100 ships, this is negligible (~0.01ms). If it ever becomes a concern, pre-filter in the simulation composable or use a for-loop with inline push. Not worth optimizing now.

**References:**
- [Vue shallowRef + triggerRef interaction (vuejs/core#9579)](https://github.com/vuejs/core/issues/9579)
- [Optimizing Vue.js Performance with shallowRef](https://dev.to/mochafreddo/optimizing-vuejs-performance-with-shallowref-an-in-depth-guide-25lb)
- [MDN preserveAspectRatio reference](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/preserveAspectRatio)

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

The `preserveAspectRatio="xMidYMid meet"` on the SVG ensures the 1080x1080 viewBox maps cleanly to the square circle container.

### Research Insights — CSS

**`will-change` consideration:** Do NOT add `will-change: transform` to the SVG or its circles. SVG attribute animations (`cx`/`cy`) are not CSS transforms and `will-change` would promote the SVG to its own compositing layer unnecessarily, increasing memory usage without any rendering benefit. The browser's SVG renderer handles attribute changes efficiently without layer promotion.

**`transition: none` is critical:** Without this, browsers may apply default CSS transitions to SVG attributes, causing 1-frame visual lag on position updates. The explicit `transition: none` in the plan is correct and must be preserved.

**`:deep()` selector usage:** Since the `<circle>` elements are created by D3 (not Vue templates), they are not affected by Vue's scoped style hashing. The `:deep()` combinator is correct here — it allows the scoped parent selector to target D3-created children. Without `:deep()`, the scoped styles would not reach the circles.

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

### Research Insights — Phase 2

**Prop drilling concern and `provide/inject` alternative:**

The current architecture drills `trafficConfig` through 3 levels: `StraitMap -> StraitData -> StraitCircle`. Since only 1 strait is selected at a time, an alternative is to use Vue's `provide/inject`:

```ts
// In StraitMap.vue
provide('selectedTrafficConfig', selectedTrafficConfig)

// In StraitCircle.vue
const trafficConfig = inject<ComputedRef<TrafficConfig | null>>('selectedTrafficConfig', computed(() => null))
```

**Recommendation: Keep prop drilling.** The 3-level depth is shallow, and props make the data flow explicit and testable. `provide/inject` would make StraitCircle implicitly dependent on an ancestor providing the key, which is harder to trace and test. The plan's original recommendation is correct.

**Conditional prop passing optimization:**

In the `v-for` loop in StraitMap, `trafficConfig` is computed for the selected strait only. Passing it to ALL StraitData instances (including non-selected ones) is harmless — non-selected StraitData passes `null` to StraitCircle because `selected` is false, and `useShipSimulation` does nothing with `null` geometry. However, for clarity, the prop could be conditionally bound:

```vue
:traffic-config="effectiveSelectedId === strait.id ? selectedTrafficConfig : null"
```

This makes the intent explicit but is functionally identical.

### Phase 3: Remove old particle system

Once BF-101 ships are rendering correctly:

1. Remove `<StraitParticleCanvas>` from `StraitMap.vue` template
2. Delete `components/straits/StraitParticleCanvas.vue`
3. Delete `composables/useParticleSystem.ts`
4. Delete `data/straits/strait-paths.ts` (Bezier paths used only by old system)
5. Clean up any unused imports

**Note:** The git status shows these files are already deleted in the working tree on `dev`. The worktree for BF-101 should confirm whether these deletions are already committed or need to happen as part of this work.

### Research Insights — Phase 3

**Worktree state verification (critical):**

The BF-101 worktree was created from `dev` where `StraitParticleCanvas.vue` still exists (confirmed by reading `StraitMap.vue` line 397-405 which references it). The `dev` branch git status shows the file as `D` (deleted) but uncommitted. This means:
- The worktree has the file present and referenced in `StraitMap.vue`
- Phase 3 deletions ARE needed in this branch
- The `StraitMap.vue` template still contains the `<StraitParticleCanvas>` element that must be removed

**Deletion order matters:** Remove the template reference in `StraitMap.vue` FIRST, then delete the component file. If the file is deleted while still referenced, Nuxt's auto-import will throw a build error.

**Clean up `ParticleType` alias:** `types/strait.ts` line 64-65 exports a deprecated `ParticleType` alias for `VesselType`. After removing the particle system, remove this alias and any remaining references.

## SVG Alignment: `preserveAspectRatio` rationale

The satellite images in `public/assets/images/straits/` are 1080x1080 crops. The `<img>` inside StraitCircle uses `object-fit: cover` which, for a square image in a circular container, fills the circle entirely.

The SVG `viewBox="0 0 1080 1080"` matches the corridor coordinate space. Since the circle clips to a round viewport and the SVG fills the same space as the image, ship coordinates from the simulation map 1:1 to visual positions. The `preserveAspectRatio="xMidYMid meet"` ensures the viewBox is centered and fully visible within the container.

### Research Insights — SVG Alignment

**Why `xMidYMid meet` not `xMaxYMax slice`:**

Per MDN's `preserveAspectRatio` specification:
- `slice` crops the viewBox to fill the viewport, behaving like CSS `background-size: cover`. This could clip ship circles near edges.
- `meet` fits the entire viewBox inside the viewport, behaving like CSS `background-size: contain`. For a 1:1 aspect ratio (1080x1080 viewBox in a square container), `meet` and `slice` produce identical results.
- `xMidYMid` centers the content, which is the correct alignment for a centered circular viewport.

Since the container is always square (enforced by `width = height = var(--diameter)`), the alignment keyword is technically irrelevant — both `meet` and `slice` produce the same mapping. However, `meet` is defensive: if a CSS change ever makes the container non-square, `meet` will show all ships (potentially with letterboxing) rather than clipping some.

**Image alignment verification needed:** The `<img>` uses `object-fit: cover` with no `object-position` override, so it defaults to `50% 50%` (centered). The SVG's `xMidYMid` matches this centering. If any strait's satellite image uses a non-centered crop, the SVG ship positions will be offset from the expected geographic features. Verify at least the Hormuz image alignment visually.

## System-Wide Impact

- **Interaction graph**: `useShipSimulation` fires `triggerRef(ships)` every rAF frame. The D3 watch in StraitCircle consumes this. No other reactivity chains are affected.
- **Error propagation**: If corridor data is missing for a strait, `useCorridor` returns `null` geometry, `useShipSimulation` never starts, and no SVG circles render. Silent graceful degradation.
- **State lifecycle risks**: `useShipSimulation` uses `onScopeDispose` for cleanup. When StraitCircle unmounts (strait deselected), the simulation stops and the rAF loop is cancelled. No orphaned loops.
- **API surface parity**: StraitCircle gains new optional props (`straitId`, `showShips`, `trafficConfig`). Existing usage without these props is unaffected (ships simply don't render).
- **Performance**: ~100 SVG circle elements with D3 `.join()` and attribute updates at 60fps. This is well within browser SVG rendering budgets. The `ships` array uses `shallowRef` + `triggerRef` (single notification per frame), and D3's key-based join minimizes DOM mutations to enter/exit events only (position updates are attribute changes on existing elements).

### Research Insights — System-Wide Impact

**Edge case: Zoom-out unmount timing.**

When a user deselects a strait, the zoom-out animation takes 600ms (`ZOOM_OUT_DURATION_MS`). During this period, `selected` becomes `false` immediately, which sets `showShips` to `false`, removing the SVG via `v-if`. This means ships disappear instantly at the start of the zoom-out, before the circle shrinks. This may look abrupt.

**Mitigation options (pick one during implementation):**
1. Delay `showShips = false` until after the zoom-out animation completes (use the existing `zoomingOut` ref as signal)
2. Add a CSS fade-out transition on `.strait-circle__ships` with `opacity: 0` over 300ms before the `v-if` removes it (use `<Transition>` wrapper)
3. Accept the instant removal — the circle is shrinking rapidly and ships at that scale would be sub-pixel anyway

Option 3 is likely acceptable. Flag for visual QA.

**Edge case: Rapid strait-to-strait switching.**

If a user clicks strait A then quickly clicks strait B (before A's zoom completes), the route watcher in StraitMap clears timers and transitions directly. The `useShipSimulation` in the old StraitCircle will be disposed via `onScopeDispose`, and a new one starts in the new StraitCircle. The D3 watcher's `flush: 'post'` guard (`if (!svgRef.value) return`) prevents errors during the transition. No action needed, but verify this path in testing.

**Memory: D3 selection caching.**

`select(svgRef.value)` creates a new D3 selection object each frame. This is lightweight (a single wrapper array) and will be GC'd. Do NOT cache the selection in a module-level variable — the SVG element changes when `showShips` toggles. The per-frame allocation is correct.

**`useCorridor` composable placement.**

The plan calls `useCorridor` inside `StraitCircle.vue`. Since `useCorridor` uses a module-level cache (`geometryCache`), multiple calls with the same corridor ID are O(1) after the first. However, `useCorridor` is also called inside `useShipSimulation` (no — actually `useShipSimulation` takes geometry as input, it does NOT call `useCorridor`). The call in StraitCircle is the only call site, which is correct.

## Acceptance Criteria

- [x] `StraitCircle.vue` renders an `<svg viewBox="0 0 1080 1080">` as sibling of `<img>` when `showShips` is true
- [x] SVG circles represent active ships from `useShipSimulation`, keyed by `ship.id`
- [x] Ships are color-coded: container=blue (`hsl(218,60%,58%)`), dryBulk=amber (`hsl(34,60%,50%)`), tanker=rose (`hsl(350,60%,55%)`)
- [x] Ships are clipped to circle boundary via parent `overflow: hidden` + `border-radius: 50%` (no manual clip-path)
- [x] Animation runs at 60fps with ~100 ships (no dropped frames in Chrome DevTools Performance panel)
- [x] Rendering is strait-agnostic: works for any strait ID that has corridor data in `corridors.json`
- [x] `prefers-reduced-motion` respected: ships render as static dots (handled by `useShipSimulation` internally)
- [x] Old `StraitParticleCanvas` and `useParticleSystem` removed (if not already deleted)
- [x] No regressions: overview map circles, zoom transitions, panel positioning all work unchanged
- [x] SSR safe: no `window`/`document` access outside `onMounted`

### Research Insights — Acceptance Criteria Additions

Additional criteria discovered through research:

- [x] `watch(ships, ...)` uses the ref directly (NOT `watch(() => ships.value, ...)`) to ensure `triggerRef` fires the watcher
- [x] No `will-change` on SVG elements (attribute animations, not CSS transforms)
- [x] `transition: none` explicitly set on `circle.ship` elements to prevent CSS transition lag
- [x] Ship dots visible at zoomed-in scale — verify `r=4` in 1080x1080 space renders at ~2-3px on screen and is perceptible (increase to 5-6 if not)
- [x] Zoom-out does not cause console errors from D3 selecting a null SVG ref
- [x] `ParticleType` alias removed from `types/strait.ts` after particle system deletion

## Dependencies & Risks

| Dependency | Status | Risk |
|---|---|---|
| `useShipSimulation` composable (BF-100) | Merged | None — ready to consume |
| `useCorridor` composable (BF-99) | Merged | None — ready to consume |
| `corridors.json` — only Hormuz has data | Partial | Other straits won't show ships until their corridor polygons are added. This is expected and by design. |
| D3 v7 (`d3-selection`) | Installed | None — already a project dependency |

**Risk: Watch firing at 60fps.** Vue's `watch` with `flush: 'post'` on a `shallowRef` that triggers every frame will fire the D3 join 60 times per second. This is intentional and matches how the old Canvas system worked (rAF loop reading reactive state). If profiling shows overhead from Vue's watcher scheduling, the fallback is to use a raw `watchEffect` or bypass Vue reactivity entirely by reading `ships.value` inside a dedicated rAF loop within the component. This is unlikely to be needed for ~100 elements.

### Research Insights — Additional Risks

**Risk: `triggerRef` + `watch` syntax sensitivity (MEDIUM).**

Vue 3's `triggerRef()` only triggers watchers that watch the ref object directly. Using `watch(() => ships.value, ...)` (accessor function) will NOT be triggered by `triggerRef(ships)` per vuejs/core#9579. The plan's code uses the correct form, but this is a subtle footgun. Add a code comment at the watcher call site documenting this constraint.

**Risk: `useCorridor` wrapping a `computed` in `ref()` (LOW).**

The plan passes `ref(corridorId)` to `useCorridor`, but `corridorId` is already a `computed` (which is a `Ref`). Wrapping it in `ref()` creates a double-wrapped ref. `useCorridor` expects `Ref<string | null>` — a `computed` satisfies this type. Pass `corridorId` directly:

```ts
// WRONG: double-wrapping
const { geometry } = useCorridor(ref(corridorId))

// CORRECT: computed is already a Ref
const { geometry } = useCorridor(corridorId)
```

**Risk: `StraitCircle` no longer purely presentational (LOW).**

Adding `useCorridor` + `useShipSimulation` inside StraitCircle couples it to the data layer. This is acceptable for now (the component is already specific to the straits domain), but if StraitCircle is ever reused in a different context, the composable calls would need to be extracted.

**Risk: Mobile performance (LOW).**

`useShipSimulation` already halves the target count on `window.innerWidth < 768`. With 50 SVG circles on mobile, performance is not a concern. However, verify that the SVG layer does not interfere with touch events — `pointer-events: none` on `.strait-circle__ships` handles this.

## Open Questions

1. **Traffic config threading**: Should `trafficConfig` be passed down as a prop through `StraitMap -> StraitData -> StraitCircle`, or should `StraitCircle` compute it internally from a `straitId` + imported historical data? Prop threading is cleaner for separation of concerns but adds prop drilling. Internal computation is simpler but couples StraitCircle to the data layer.

   **Recommendation**: Prop threading. StraitCircle should remain a presentation component. StraitMap already has access to historical data and the selected year.

   **Research resolution**: Prop drilling through 3 levels is considered acceptable in Vue best practices for explicit data flow. `provide/inject` was evaluated as an alternative but rejected because it makes the dependency implicit and harder to test. The prop chain is short and the data shape is simple (`TrafficConfig | null`).

2. **Ship dot radius**: The plan uses `r=4` in the 1080x1080 coordinate space. This may need visual tuning. At the zoomed-in lens size (~45% of viewport height), each dot would be roughly 2-3px on screen. If too small, increase to 5-6.

   **Research insight**: At a viewport height of 900px, the circle diameter is ~405px (45%). The SVG maps 1080 units to 405px, so 1 SVG unit = 0.375px. A radius of 4 = 1.5px on screen, which is likely too small. **Recommend starting with `r=6`** (2.25px on screen) and adjusting after visual testing. On a 1440px viewport, the same `r=6` would be ~2.7px, still subtle but visible.

3. **Glow / bloom effect**: The brainstorm mentioned particles as "the hero moment." Should ships have a subtle glow (SVG filter or box-shadow via CSS)? This could be deferred to a polish pass.

   **Research insight**: SVG filters (`<feGaussianBlur>` + `<feComposite>`) applied to 100 elements at 60fps WILL cause performance issues — each filter requires a separate compositing pass. If glow is desired, apply it to a SINGLE `<g>` group wrapping all circles using `filter: url(#glow)`, or use CSS `filter: drop-shadow()` on the `<svg>` element itself (single compositing pass for all children). Defer to polish pass as planned.

4. **Zoom-out ship disappearance timing** (NEW): Ships disappear instantly when `showShips` becomes `false` at the start of zoom-out. Should they fade out over the 600ms zoom-out duration? Likely acceptable since the circle shrinks rapidly, but flag for visual QA.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md](docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md) — key decisions: hybrid HTML+Canvas approach (this task evolves it to SVG), color coding by vessel type, ~100 particle target count
- **BF-99 useCorridor**: `composables/useCorridor.ts` — derives corridor geometry from polygon data
- **BF-100 useShipSimulation**: `composables/useShipSimulation.ts` — rendering-agnostic ship simulation producing `Ship[]` with `x`, `y`, `vesselType`, `active`
- **StraitCircle**: `components/straits/StraitCircle.vue` — target component for SVG insertion
- **StraitData**: `components/straits/StraitData.vue` — parent that composes StraitCircle + StraitLabel
- **StraitMap**: `components/StraitMap.vue` — top-level map component, owns zoom/selection state
- **Corridor data**: `data/straits/corridors.json` — Hormuz polygon with 1080x1080 viewBox
- **Types**: `types/strait.ts` — `Ship`, `VesselType`, `CorridorGeometry` interfaces

### External References (from deepening research)

- [D3 selection.join() — enter/update/exit pattern](https://github.com/d3/d3/blob/main/docs/d3-selection/joining.md)
- [Vue shallowRef + triggerRef interaction (vuejs/core#9579)](https://github.com/vuejs/core/issues/9579)
- [Vue shallowRef performance optimization guide](https://dev.to/mochafreddo/optimizing-vuejs-performance-with-shallowref-an-in-depth-guide-25lb)
- [SVG vs Canvas vs WebGL performance benchmarks (2025)](https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025)
- [MDN preserveAspectRatio reference](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/preserveAspectRatio)
- [SVG preserveAspectRatio guide (DigitalOcean)](https://www.digitalocean.com/community/tutorials/svg-preserve-aspect-ratio)
- [D3 + Vue 3 integration patterns](https://moldstud.com/articles/p-essential-performance-optimization-tips-for-d3js-visualizations-in-vuejs)
