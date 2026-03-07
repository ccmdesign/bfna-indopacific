# BF-78: Canvas Particle System in Lens View

**Status:** Plan (Deepened)
**Branch:** feature/BF-78-canvas-particle-system
**Depends on:** BF-77 (circle-to-lens zoom transition) -- already merged
**Deepened on:** 2026-03-07

## Enhancement Summary

**Sections enhanced:** 14
**Research sources:** Vue 3 official docs (Context7), MDN Canvas optimization guide, web.dev HiDPI canvas article, WCAG 2.1 animation accessibility guidelines, ag-Grid canvas rendering analysis, multiple framework-specific best practices resources

### Key Improvements
1. Frame-rate independence elevated from "optional enhancement" to a mandatory v1 requirement -- 120Hz and 144Hz displays are now mainstream and will double/triple particle speed without delta-time normalization
2. Canvas batch rendering strategy formalized with single-Path2D-per-color-group pattern, reducing context state changes from ~170 to 3
3. Race condition risks identified in rapid strait selection toggling -- rAF loop and watcher cleanup must be coordinated with cancellation tokens
4. DPR handling clarified with proper resize-observer-to-canvas-buffer pipeline and max dimension cap (already proven in useFisheyeCanvas.ts)
5. Accessibility requirements expanded beyond `prefers-reduced-motion` to include a pause mechanism for WCAG 2.2.2 compliance

### New Risks Discovered
- Rapid strait toggle can orphan rAF loops if `stop()` and `start()` overlap
- Canvas DPR scaling can produce fractional values on browser zoom, causing sub-pixel rendering artifacts on particle dots
- The `onWatcherCleanup` API (Vue 3.5+) should be used for watch-based cleanup, but Nuxt version must be verified for compatibility
- Glow arcs double the draw call count; should be gated behind a performance check or made opt-in

---

## 1. Architecture Overview

### New Component

**`components/straits/StraitParticleCanvas.vue`** -- a `<canvas>` element that renders the particle animation inside the lens (zoomed-in) view of a selected strait.

### Where It Lives in the DOM

The canvas is placed **inside `.map-inner`** in `StraitMap.vue`, as a sibling of the `<img>` and `StraitData` components. It uses `position: absolute` within the already-`position: relative` `.strait-map` wrapper, so it participates in the existing layout without breaking the master grid contract.

```
.strait-map (position: relative, grid child)
  .map-inner (position: absolute, cover-fit)
    <img.map-bg />
    <StraitData v-for ... />
    <StraitParticleCanvas           <-- NEW
      v-if="selectedStraitId"
      :strait-id="selectedStraitId"
      :year="LATEST_YEAR"
      :inner-size="innerSize"
      :zoom-scale="zoomScale"
      :selected-strait="selectedStrait"
    />
  <StraitDetailPanel ... />
  <ScaleLegend ... />
  <metric-toggle ... />
```

The canvas covers the full `.map-inner` area (same dimensions), positioned absolutely at `inset: 0`. It only renders particles when a strait is selected. It sits above the background image but below the `StraitDetailPanel` (z-index layering: bg image = 0, canvas = 1, panel = 2).

### Grid Safety

This approach is safe because:
- The canvas lives inside `.map-inner`, which is already `position: absolute` within `.strait-map`
- `.strait-map` is the grid child (`grid-row: 1/8; grid-column: 1/-1` via `.layout-2`)
- No changes to `display: contents` on `.straits-infographic` or any grid placement rules
- The canvas is not a grid child; it is a deeply nested absolutely-positioned element

### Research Insights

**Architecture Consistency:**
- This pattern mirrors the existing `useFisheyeCanvas.ts` composable which also places a `<canvas>` inside `.map-inner` with absolute positioning. Maintaining the same architectural pattern keeps the codebase predictable.
- The composable + thin wrapper component split (logic in `useParticleSystem.ts`, DOM in `StraitParticleCanvas.vue`) follows the established pattern from `useFisheyeCanvas` + its parent component.

**Separation of Concerns:**
- Keep particle path data (`strait-paths.ts`) separate from particle rendering logic (`useParticleSystem.ts`) separate from DOM lifecycle (`StraitParticleCanvas.vue`). Each file has a single responsibility.
- The composable should NOT import Vue lifecycle hooks (`onMounted`, `onUnmounted`) directly -- instead, expose `start()` and `stop()` and let the component manage lifecycle. This makes the composable testable in isolation. *However*, the existing `useFisheyeCanvas.ts` does use lifecycle hooks internally. For consistency, follow the same pattern but ensure the rAF loop is independently stoppable.

---

## 2. Particle Data Model

### Particle Interface

```typescript
interface Particle {
  progress: number       // 0..1 along the Bezier path
  speed: number          // base speed per frame (normalized units, ~0.001-0.003)
  direction: 1 | -1      // +1 = forward, -1 = reverse
  type: 'container' | 'dryBulk' | 'tanker'
  color: string          // resolved HSL string
  radius: number         // dot radius in px (2-4px)
}
```

Particles do not store `x, y` persistently -- position is computed each frame from `progress` along the Bezier path.

### Research Insights

**Type Safety:**
- Use a `const` enum or string union for particle types rather than raw strings. A discriminated union type (`ParticleType = 'container' | 'dryBulk' | 'tanker'`) is already implied but should be explicitly exported from a types file.
- Consider using a `satisfies` check on the color mapping object to ensure every `ParticleType` has a color entry at compile time.

**Memory Layout (Performance):**
- For ~85 particles, object-oriented storage is fine. Object pooling is unnecessary at this scale -- GC pauses from 85 small objects are negligible.
- If particle count ever scales beyond ~500, consider a Structure-of-Arrays (SoA) layout with typed arrays (`Float32Array` for progress/speed/radius, `Int8Array` for direction) for better cache locality. Not needed for v1.

**Simplicity Check:**
- The `color` field on each particle is redundant if colors are resolved from `type` at draw time. Since we batch by type anyway (section 11), removing `color` from the interface and looking it up from a `PARTICLE_COLORS` map during the draw loop saves memory and prevents stale color values. **Recommendation:** Remove `color` from `Particle`, add a `PARTICLE_COLORS: Record<ParticleType, string>` constant.

### Color Palette

| Ship Type   | HSL                      | CSS var reference             |
|-------------|--------------------------|-------------------------------|
| Container   | `hsl(218, 60%, 58%)`     | `--color-cargo-container`     |
| Dry Bulk    | `hsl(34, 60%, 50%)`      | amber (new -- not in styles.css yet) |
| Tanker      | `hsl(186, 60%, 50%)`     | cyan (new -- not in styles.css yet)  |

**Note:** The existing `--color-cargo-dry-bulk` is `hsl(34, 60%, 50%)` and `--color-cargo-tanker` is `hsl(348, 60%, 55%)`. The acceptance criteria specify cyan `hsl(186, 60%, 50%)` for dry bulk and amber `hsl(34, 60%, 50%)` for tanker. This is a **deliberate color reassignment** for the particle system vs. the detail panel bar chart. Confirm with design whether this is intentional or if the AC colors should be updated to match existing CSS vars.

**Recommended resolution:** Use the AC colors as specified for particles. Add dedicated particle color constants in the composable, separate from the CSS vars used by the detail panel.

---

## 3. Bezier Path Definitions

Each strait gets a hand-tuned cubic Bezier curve representing the shipping lane. Paths are defined in **normalized coordinates (0-1)** relative to the map image's natural dimensions (2400x1350), then scaled at render time to match the canvas size and zoom level.

### Path Config Structure

```typescript
interface StraitPath {
  /** Control points for a cubic Bezier: [start, cp1, cp2, end] */
  points: [Point, Point, Point, Point]
  /** Optional second lane for more complex straits */
  altPoints?: [Point, Point, Point, Point]
}

interface Point {
  x: number  // 0..1 normalized to map width
  y: number  // 0..1 normalized to map height
}
```

### Per-Strait Path Definitions

These will be stored in a new file: **`data/straits/strait-paths.ts`**

Initial estimates based on strait positions (`posX`, `posY` from straits.json) and geographic orientation. These MUST be visually calibrated against the map image during implementation.

| Strait        | Orientation     | Notes |
|---------------|-----------------|-------|
| Malacca       | NW-SE diagonal  | ~200px corridor at zoom, curves slightly |
| Taiwan        | N-S vertical    | Relatively straight, wide |
| Bab el-Mandeb | NNW-SSE         | Narrow, slight curve |
| Luzon         | NE-SW           | Wide strait between islands |
| Lombok        | N-S vertical    | Very narrow |
| Hormuz        | E-W horizontal  | Curves around the peninsula |

The Bezier control points should produce a path that:
1. Extends well beyond the visible circle/lens clip region (so particles enter and exit smoothly)
2. Follows the general geographic orientation of the strait
3. Has enough curvature to look natural (not a straight line)

### Research Insights

**Path Extension Best Practice:**
- Bezier paths should extend at least 20-30% beyond the clip circle in each direction. This ensures particles are already at full speed when they enter the visible area, avoiding the "spawning out of nowhere" effect.
- The `progress` range 0.0-1.0 should map to the full extended path, with only the ~0.15-0.85 range typically visible within the clip circle.

**Debug Visualization:**
- During implementation, add a debug mode that draws the Bezier path on the canvas as a visible curve (using `ctx.bezierCurveTo`). This makes visual calibration dramatically faster. Gate it behind `import.meta.dev` or a `DEBUG_PATHS` const.

**Multi-Segment Paths (Future):**
- For Hormuz, which curves significantly around the Omani peninsula, a single cubic Bezier may not capture the path well. Consider supporting poly-Bezier (multiple connected cubic segments) in the `StraitPath` interface as `segments?: [Point, Point, Point, Point][]`. Not needed for v1, but the data structure should not preclude it.

---

## 4. Particle Count and Distribution

### Total Budget

~240 particles at 2025 baseline, distributed proportionally to vessel counts.

### Proportional Allocation Formula

```
particlesForStrait = Math.round(240 * (straitVessels / totalVesselsAllStraits))
```

Using 2025 data (`total` vessels):
- Malacca: 85,066 -> ~80 particles
- Taiwan: 86,636 -> ~81 particles (capped -- see below)
- Hormuz: 34,863 -> ~33 particles
- Luzon: 24,091 -> ~22 particles
- Lombok: 13,021 -> ~12 particles
- Bab el-Mandeb: 12,076 -> ~11 particles

**Important:** Only the particles for the **selected** strait are rendered at any time. The 240 total is a reference budget for the proportional formula, not a simultaneous count. The maximum simultaneous particles on screen is ~80-85 (Malacca or Taiwan).

### Type Distribution Per Strait

Particles are allocated by type using the vessel breakdown from `historical[year][straitId].vessels`:

```
containerParticles = Math.round(totalParticles * (vessels.container / vessels.total))
dryBulkParticles   = Math.round(totalParticles * (vessels.dryBulk / vessels.total))
tankerParticles    = totalParticles - containerParticles - dryBulkParticles
```

### Direction

~50% forward, ~50% reverse. Assigned randomly on creation with `Math.random() > 0.5 ? 1 : -1`.

### Research Insights

**Minimum Particle Floor:**
- Bab el-Mandeb gets ~11 particles. With 3 vessel types, some types may get 0-1 particles (e.g., container share is very small for Lombok at 88/13021 = 0.7%). Ensure a minimum of 1 particle per type that has any vessels at all. Use `Math.max(1, Math.round(...))` for types with non-zero vessel counts.

**Rounding Error:**
- The "tanker gets the remainder" approach is good but can produce negative values if `containerParticles + dryBulkParticles > totalParticles` due to rounding. Add a `Math.max(0, ...)` guard on the tanker calculation.

**Data Typing:**
- The `historical` data in `straits.json` is typed as `Record<string, Record<string, unknown>>` in `types/strait.ts`. For this feature, add proper typing for the vessel breakdown:
  ```typescript
  interface StraitHistoricalEntry {
    capacityMt: number
    vessels: { total: number; container: number; dryBulk: number; tanker: number }
    capacityByType: { container: number; dryBulk: number; tanker: number }
  }
  ```
  This eliminates `unknown` casts when accessing vessel data.

---

## 5. Composable: `useParticleSystem`

Extract the particle logic into a composable: **`composables/useParticleSystem.ts`**

### API

```typescript
function useParticleSystem(options: {
  canvasRef: Ref<HTMLCanvasElement | null>
  straitId: Ref<string | null>
  year: Ref<string>
  innerSize: Ref<{ w: number; h: number }>
  zoomScale: Ref<number>
  selectedStrait: Ref<Strait | null>
}): {
  start: () => void
  stop: () => void
  isRunning: Ref<boolean>
}
```

### Internal State

- `particles: Particle[]` -- the live particle array (rebuilt when `straitId` or `year` changes)
- `animationFrameId: number | null` -- rAF handle for cleanup
- `ctx: CanvasRenderingContext2D | null` -- cached canvas context

### Lifecycle

1. **On `straitId` change (watch):** If a strait is selected, call `initParticles()` to build the particle array, then `start()`. If null, call `stop()`.
2. **On `year` change (watch):** Rebuild particles with new counts (smooth transition -- keep existing particles, add/remove to match new count).
3. **On unmount:** Call `stop()` to cancel rAF.

### Research Insights

**Race Condition: Rapid Strait Toggling (CRITICAL):**
- If a user clicks strait A, then immediately clicks strait B (or clicks to deselect and reselect), the watcher fires twice in quick succession. The first `stop()` + `start()` cycle may not complete before the second fires.
- **Mitigation:** Use a cancellation token pattern (as recommended by the Julik frontend races reviewer). Before `start()`, always `stop()` first and verify the previous rAF loop has actually ceased:
  ```typescript
  let cancelled = false

  function stop() {
    cancelled = true
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  function start() {
    stop() // always stop first
    cancelled = false
    initParticles()
    tick() // begins new rAF loop, checks `cancelled` each frame
  }
  ```
- Inside `tick()`, check `if (cancelled) return` before scheduling the next frame.

**Vue 3.5+ Watcher Cleanup:**
- Use `onWatcherCleanup` (Vue 3.5+) or the `onCleanup` third parameter in `watch()` callbacks to cancel the rAF loop when the watched value changes:
  ```typescript
  watch(straitId, (newId, _oldId, onCleanup) => {
    if (newId) { start() }
    else { stop() }
    onCleanup(() => stop())
  })
  ```
- This ensures cleanup runs even if the component is unmounted mid-animation.

**SSR Safety:**
- Follow the pattern from `useFisheyeCanvas.ts`: all browser API access (`requestAnimationFrame`, `window.matchMedia`, canvas context) must be gated behind `onMounted` or guarded with `if (import.meta.server) return`.

**Composable Testing:**
- Because the composable calls `onMounted`/`onUnmounted` internally, it can only be tested within a component context. If unit testing is desired, consider accepting an optional `{ autoLifecycle?: boolean }` parameter that skips lifecycle hook registration, allowing manual `start()`/`stop()` calls in tests.

---

## 6. Rendering Loop (`requestAnimationFrame`)

### Per-Frame Steps

```
function tick(timestamp: DOMHighResTimeStamp) {
  1. Compute deltaTime: dt = (timestamp - lastTimestamp) / 16.667
  2. Clamp dt to prevent spiral-of-death: dt = Math.min(dt, 3)
  3. Store lastTimestamp = timestamp
  4. Clear canvas (full clear)
  5. Compute canvas-to-map coordinate transform (based on innerSize, zoomScale, selectedStrait position)
  6. Set canvas dimensions if container resized (handle DPR)
  7. Apply circular clip
  8. For each particle type group (batch by fillStyle):
     a. Set ctx.fillStyle once for the group
     b. ctx.beginPath()
     c. For each particle in group:
        i.   Advance: particle.progress += particle.speed * particle.direction * dt
        ii.  Wrap: if progress > 1, set to 0; if progress < 0, set to 1
        iii. Evaluate Bezier at particle.progress -> (x, y) in normalized coords
        iv.  Transform (x, y) to canvas pixel coords
        v.   ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU)
     d. ctx.fill()
  9. if (!cancelled) requestAnimationFrame(tick)
}
```

### Research Insights

**Frame-Rate Independence is MANDATORY (not optional):**
- The plan originally marked delta-time normalization as "Optional Enhancement." This must be a v1 requirement. Modern displays run at 90Hz, 120Hz, and 144Hz. Without delta-time normalization, particles on a 144Hz display move 2.4x faster than on a 60Hz display. This is immediately noticeable and looks broken.
- Use `performance.now()` via the rAF timestamp parameter (first argument to the callback).
- Clamp `dt` to a maximum of 3 (equivalent to ~50ms gap / ~20fps). This prevents particles from teleporting after a tab switch or debugger pause.

**Batch Drawing Pattern (Critical Performance):**
- The original plan shows individual `beginPath()` + `arc()` + `fill()` per particle. This causes ~170 canvas state machine transitions per frame.
- Instead, batch all particles of the same `fillStyle` into a single path:
  ```typescript
  for (const [type, color] of Object.entries(PARTICLE_COLORS)) {
    ctx.fillStyle = color
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    for (const p of particles) {
      if (p.type !== type) continue
      const { cx, cy } = toCanvasCoords(evalCubicBezier(p.progress, ...path.points))
      ctx.moveTo(cx + p.radius, cy)
      ctx.arc(cx, cy, p.radius, 0, TAU)
    }
    ctx.fill()
  }
  ```
- This reduces `fillStyle` changes from ~85 to 3 and `fill()` calls from ~85 to 3. The `moveTo` before each `arc` is essential to prevent connecting arcs with lines.

**Skip Offscreen Particles:**
- Before evaluating the Bezier and transforming coordinates, check if the particle's approximate position falls outside the clip circle + a margin. A quick distance-from-center check after coordinate transform (before `arc()`) can skip ~15-30% of particles whose path segment is outside the visible area.

### Bezier Evaluation

Use De Casteljau's algorithm or the direct cubic formula:

```typescript
function evalCubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const u = 1 - t
  return {
    x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
    y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
  }
}
```

### Research Insights (Bezier)

**Pre-compute Powers:**
- The direct formula computes `u*u*u` and `t*t*t` inline. Pre-computing `u2 = u*u`, `u3 = u2*u`, `t2 = t*t`, `t3 = t2*t` saves 4 multiplications per evaluation. At 85 particles * 60fps this is marginal, but it is a zero-cost clarity improvement.

**Inline the Function:**
- For hot-path performance, consider inlining the Bezier evaluation directly in the tick loop rather than calling a function. Modern JS engines will likely inline it anyway, but explicit inlining avoids any function-call overhead uncertainty.

### Coordinate Transform

The canvas needs to map normalized (0-1) path coordinates to canvas pixel space. The transform must account for:
1. The `innerSize` (cover-fit dimensions of the map within its container)
2. The `zoomScale` (how far we are zoomed in)
3. The `selectedStrait.posX/posY` (center of zoom)

```typescript
function toCanvasCoords(normX: number, normY: number): { cx: number; cy: number } {
  const { w, h } = innerSize.value
  const S = zoomScale.value
  const strait = selectedStrait.value!
  // Map normalized to pixel space in the zoomed view
  const mapX = normX * w
  const mapY = normY * h
  // Apply same transform as mapBgTransform
  const tx = w / 2 - (strait.posX / 100) * w * S
  const ty = h / 2 - (strait.posY / 100) * h * S
  return {
    cx: mapX * S + tx,
    cy: mapY * S + ty,
  }
}
```

### Research Insights (Coordinate Transform)

**Cache Transform Components:**
- `tx`, `ty`, `S`, `w`, `h` are constant for the entire frame. Compute them once at the top of `tick()` and pass as parameters or close over locals, rather than reading `.value` properties 85 times per frame. Reactive `.value` access has overhead from Vue's proxy system.

**Verify Alignment with mapBgTransform:**
- The `toCanvasCoords` formula must exactly match the CSS transform applied to `.map-bg` in `StraitMap.vue` (line 111-118). Any discrepancy causes particles to drift relative to the map. Test this by placing a particle at the strait's `posX/posY` normalized coordinates -- it should appear at the exact center of the zoomed view.

---

## 7. Canvas Component: `StraitParticleCanvas.vue`

### Template

```vue
<template>
  <canvas
    ref="canvasRef"
    class="strait-particle-canvas"
    aria-hidden="true"
  />
</template>
```

### Style

```css
.strait-particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;   /* clicks pass through to map/circles */
  z-index: 1;
}
```

### Script

- Receives props from `StraitMap.vue`
- Calls `useParticleSystem(...)` with refs
- Handles canvas DPR scaling on mount and resize:
  ```typescript
  function updateCanvasSize() {
    const dpr = window.devicePixelRatio || 1
    const rect = canvasRef.value!.getBoundingClientRect()
    canvasRef.value!.width = rect.width * dpr
    canvasRef.value!.height = rect.height * dpr
    ctx.scale(dpr, dpr)
  }
  ```

### Research Insights

**DPR Handling -- Follow useFisheyeCanvas Pattern:**
- The existing `useFisheyeCanvas.ts` (lines 333-376) already implements a robust DPR pipeline using `ResizeObserver` with `devicePixelContentBoxSize` fallback. Replicate this exact pattern for consistency.
- Cap canvas buffer dimensions at 2048x2048 (matching `useFisheyeCanvas.ts` line 335) to prevent GPU memory issues on ultra-high-DPI displays.
- **Critical:** After setting `canvas.width` and `canvas.height`, the context's transform is reset. You must re-apply `ctx.scale(dpr, dpr)` every time the canvas is resized, not just on mount.

**Fractional DPR Edge Case:**
- Browser zoom produces fractional DPR values (e.g., 2.223). Use `Math.round()` when computing canvas buffer dimensions to avoid sub-pixel rendering artifacts that make particle dots look fuzzy:
  ```typescript
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  ```

**ResizeObserver Throttling:**
- Debounce resize handling with `requestAnimationFrame` to avoid multiple reflows per frame (exactly as `useFisheyeCanvas.ts` does on line 348-349 with the `resizeRafId` guard).

### Clip to Circle

Particles should only be visible within the lens circle. Apply a circular clip path on the canvas context before drawing:

```typescript
ctx.save()
ctx.beginPath()
const centerX = canvasWidth / 2
const centerY = canvasHeight / 2
const clipRadius = selectedCircleRadiusPx  // from getZoomedRadius
ctx.arc(centerX, centerY, clipRadius, 0, Math.PI * 2)
ctx.clip()
// ... draw particles ...
ctx.restore()
```

### Research Insights (Clipping)

**Canvas Clip vs CSS clip-path:**
- CSS `clip-path: circle()` is GPU-accelerated in Chromium (2025+) and avoids per-frame `save()/restore()` overhead on the canvas context.
- However, canvas-level clipping gives precise control over the clip radius (which is computed from `getZoomedRadius` and changes during zoom transitions), whereas CSS `clip-path` would need to be dynamically updated as an inline style.
- **Recommendation:** Use canvas-level clipping for v1. The `save()/restore()` cost is negligible at one call per frame. CSS `clip-path` would require synchronized style updates that add complexity without meaningful performance gain.

**Soft Edge / Feathered Clip:**
- For a polished look, apply an alpha fade near the clip boundary instead of a hard clip. This can be done by computing each particle's distance from center and multiplying `globalAlpha` by `smoothstep(clipRadius, clipRadius - fadeWidth, distance)`:
  ```typescript
  const dist = Math.hypot(cx - centerX, cy - centerY)
  const fade = Math.min(1, Math.max(0, (clipRadius - dist) / 8))
  ctx.globalAlpha = 0.85 * fade
  ```
- This adds a per-particle distance check but produces a much more natural edge. **Trade-off:** Incompatible with the batch-by-type optimization (since alpha varies per particle). Consider making this a v2 enhancement, or apply it only to particles within 8px of the edge.

---

## 8. Integration with Existing State

### Props Passed from StraitMap.vue

| Prop | Source | Purpose |
|------|--------|---------|
| `straitId` | `selectedStraitId` | Which strait's particles to show |
| `year` | `LATEST_YEAR` | Drives particle count |
| `innerSize` | `innerSize` computed | Map cover-fit dimensions |
| `zoomScale` | `zoomScale` computed | Current zoom level |
| `selectedStrait` | `selectedStrait` computed | Full strait data for positioning |

### Visibility

The canvas component is conditionally rendered with `v-if="selectedStraitId"`. It fades in with a CSS transition (opacity 0->1 over 0.4s, delayed 0.3s to let the zoom transition complete).

### Animation Start/Stop

- **Start:** When the component mounts (strait selected), particles initialize at random `progress` values along the path and the rAF loop begins.
- **Stop:** When the component unmounts (strait deselected), the rAF loop is cancelled via `cancelAnimationFrame`.
- No need for fade-out animation on particles -- the zoom-out transition (0.6s) handles the visual exit.

### Research Insights

**v-if vs v-show:**
- Using `v-if` means the canvas is fully destroyed and recreated on each strait selection. This is correct because:
  1. The canvas context and rAF loop must be reset for each strait
  2. There is no benefit to keeping a stale canvas in the DOM
  3. `v-show` would keep the canvas in the DOM but require manual show/hide logic and rAF lifecycle management
- Confirmed: `v-if` is the right choice.

**Fade-in Timing Coordination:**
- The 0.3s delay + 0.4s fade matches the zoom transition (0.6s cubic-bezier). Test that particles are not visible during the zoom-in animation -- they should only appear after the map has settled. The CSS transition delay handles this, but verify that the rAF loop starting immediately on mount (before the fade delay) does not cause a flash of particles at opacity 1 before the CSS transition kicks in.
- **Safeguard:** Set initial `opacity: 0` in CSS and use a class toggle or Vue transition to animate to `opacity: 1`.

---

## 9. Speed System

### Base Speed

```typescript
const BASE_SPEED = 0.0015  // progress units per frame at 60fps
```

At this rate, a particle traverses the full path in ~667 frames (~11 seconds). This provides a calm, ambient feel.

### Per-Particle Variation

Each particle gets a speed jitter on creation:

```typescript
particle.speed = BASE_SPEED * (0.7 + Math.random() * 0.6)  // range: 0.7x to 1.3x
```

This prevents particles from moving in lockstep and creates an organic, flowing appearance.

### Frame-Rate Independence (MANDATORY for v1)

Pass `deltaTime` from `requestAnimationFrame` timestamps:

```typescript
let lastTimestamp = 0

function tick(timestamp: DOMHighResTimeStamp) {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp
    requestAnimationFrame(tick)
    return // skip first frame to establish baseline
  }
  const dt = Math.min((timestamp - lastTimestamp) / 16.667, 3) // normalize to 60fps, clamp
  lastTimestamp = timestamp

  // Update particles
  for (const p of particles) {
    p.progress += p.speed * p.direction * dt
    // Wrap
    if (p.progress > 1) p.progress -= 1
    if (p.progress < 0) p.progress += 1
  }
  // ... draw ...
}
```

### Research Insights

**Why dt Clamping Matters:**
- When a browser tab is backgrounded and then foregrounded, the first rAF callback may have a `dt` of several seconds. Without clamping, all particles teleport to new positions. Clamping at `dt = 3` (equivalent to ~20fps) prevents this.
- Additionally, some browsers pause rAF entirely for backgrounded tabs and resume with a large gap. The first-frame skip (`lastTimestamp === 0`) handles the initial case.

**Tab Visibility API:**
- Consider pausing the rAF loop entirely when the tab is not visible using `document.addEventListener('visibilitychange', ...)`. This saves CPU/battery for backgrounded tabs. Resume with `lastTimestamp = 0` to reset the delta baseline.

**Speed Perception:**
- At `BASE_SPEED = 0.0015`, ~11 seconds for a full traversal is appropriate for ambient visualization. However, since only ~50-70% of the path is visible within the clip circle, the visible transit time is ~5-7 seconds. Test this visually to ensure it feels neither rushed nor stagnant.

---

## 10. Particle Visual Rendering

### Dot Style

Each particle is drawn as a filled circle with a slight glow:

```typescript
// Core dot
ctx.globalAlpha = 0.85
ctx.fillStyle = particle.color
ctx.beginPath()
ctx.arc(cx, cy, particle.radius, 0, TAU)
ctx.fill()

// Glow (optional, adds ~10% GPU cost)
ctx.globalAlpha = 0.25
ctx.beginPath()
ctx.arc(cx, cy, particle.radius * 2.5, 0, TAU)
ctx.fill()
```

### Dot Size

- Base radius: 3px
- Variation: 2-4px (assigned randomly per particle on creation)

### Research Insights

**Glow Performance Trade-off:**
- The glow doubles draw calls (170 total with glow vs 85 without). With batch rendering (section 6), this becomes 6 `fill()` calls instead of 3 -- still negligible.
- However, the glow requires a second pass per type group with a different `globalAlpha`, adding complexity to the batch loop.
- **Recommendation:** Implement glow as a separate batch pass per type group. Gate behind a `ENABLE_GLOW = true` constant that can be toggled for performance testing:
  ```typescript
  // Pass 1: Core dots
  for (const [type, color] of PARTICLE_COLORS_ENTRIES) {
    ctx.fillStyle = color
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    for (const p of particlesByType[type]) { /* arc calls */ }
    ctx.fill()
  }
  // Pass 2: Glow (optional)
  if (ENABLE_GLOW) {
    for (const [type, color] of PARTICLE_COLORS_ENTRIES) {
      ctx.fillStyle = color
      ctx.globalAlpha = 0.25
      ctx.beginPath()
      for (const p of particlesByType[type]) { /* arc with radius * 2.5 */ }
      ctx.fill()
    }
  }
  ```

**Pre-group Particles by Type:**
- Instead of filtering particles by type inside the draw loop (O(n) per type), maintain three pre-sorted arrays (`containerParticles`, `dryBulkParticles`, `tankerParticles`) that are built once in `initParticles()`. This makes the draw loop a simple iteration with zero conditionals.

---

## 11. Performance Considerations

### Budget

- **Max simultaneous particles:** ~85 (Malacca/Taiwan at 2025)
- **Draw calls per frame:** 85 arcs + 85 glow arcs = 170 `arc()` calls -- well within budget
- **Canvas size:** matches `.map-inner` dimensions (typically ~1920x1080 on desktop)

### Optimizations

1. **Single fill color batch:** Group particles by type, set `fillStyle` once per group, draw all particles of that type, then switch. Reduces state changes from ~170 to ~6.
2. **Skip offscreen particles:** If a particle's canvas coordinates are outside the clip circle + margin, skip the draw call.
3. **No shadow/blur:** Avoid `ctx.shadowBlur` -- use the manual glow arc instead (much cheaper).
4. **DPR handling:** Scale canvas buffer to `devicePixelRatio` but keep coordinate math in CSS pixels.
5. **Reduced motion:** Respect `prefers-reduced-motion`:
   - If `matchMedia('(prefers-reduced-motion: reduce)').matches`, show static dots at fixed positions along the path (no animation loop).

### Research Insights

**Canvas Clearing Strategy:**
- Full `ctx.clearRect(0, 0, w, h)` each frame is the simplest approach and performs well for this particle count. Partial clearing (tracking dirty regions) adds complexity without benefit at <100 particles.

**Object Allocation in Hot Loop:**
- The `evalCubicBezier` function returns a new `{ x, y }` object per call. At 85 calls/frame * 60fps = 5,100 allocations/second. Modern GCs handle this fine, but for zero-allocation, use a reusable output object:
  ```typescript
  const _point = { x: 0, y: 0 }
  function evalCubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
    const u = 1 - t
    _point.x = u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x
    _point.y = u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
    return _point
  }
  ```
  **Caution:** This makes the function non-reentrant. Safe here because it is only called from the single-threaded tick loop.

**Mobile Performance:**
- On mobile devices (where `devicePixelRatio` can be 3x), the canvas buffer is 3x larger. The 2048px cap from `useFisheyeCanvas.ts` is essential. Additionally, consider reducing the particle count by 50% on mobile (check `window.innerWidth < 768` on mount).

### Memory

- Particle array: ~85 objects x ~7 properties = negligible
- No textures, no offscreen canvases needed
- Single canvas context, no WebGL

---

## 12. Accessibility

### Research Insights

**WCAG 2.2.2 - Pause, Stop, Hide (Level A):**
- Any animation that starts automatically and lasts more than 5 seconds must have a mechanism for the user to pause, stop, or hide it. The particle animation runs indefinitely while a strait is selected.
- **Mitigation options:**
  1. The "click to deselect" behavior (clicking the background deselects the strait and stops particles) satisfies this requirement since the user can stop the animation.
  2. Consider adding a subtle pause/play toggle in the detail panel for explicit control.

**prefers-reduced-motion Implementation:**
- Check `matchMedia('(prefers-reduced-motion: reduce)')` on mount.
- When reduced motion is preferred, render particles at fixed `progress` positions (evenly spaced along the path) without starting the rAF loop. This shows the shipping lane density without motion.
- Listen for changes to the media query (user can toggle the OS setting while the page is open):
  ```typescript
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  mql.addEventListener('change', (e) => {
    if (e.matches) { stop(); drawStaticParticles() }
    else { start() }
  })
  ```

**aria-hidden:**
- The canvas is already marked `aria-hidden="true"` since the particle animation is purely decorative. The informational content (vessel counts, strait data) is conveyed through the `StraitDetailPanel` and `StraitData` components.

---

## 13. File Summary

| File | Action | Description |
|------|--------|-------------|
| `components/straits/StraitParticleCanvas.vue` | **Create** | Canvas component, mounts inside `.map-inner` |
| `composables/useParticleSystem.ts` | **Create** | Particle lifecycle, rAF loop, Bezier evaluation |
| `data/straits/strait-paths.ts` | **Create** | Per-strait Bezier control points (hand-tuned) |
| `components/StraitMap.vue` | **Edit** | Add `<StraitParticleCanvas>` inside `.map-inner`, pass props |
| `public/styles.css` | **Edit** | Add particle color CSS vars if needed for consistency |
| `types/strait.ts` | **Edit** | Add `StraitPath`, `Point`, `ParticleType`, and `StraitHistoricalEntry` types |

---

## 14. Implementation Order

1. **`types/strait.ts`** -- Add `Point`, `StraitPath`, `ParticleType`, and `StraitHistoricalEntry` types.
2. **`data/straits/strait-paths.ts`** -- Define Bezier paths with rough estimates, export as a map keyed by strait ID.
3. **`composables/useParticleSystem.ts`** -- Core logic: particle init, Bezier eval, rAF loop, coordinate transform, delta-time normalization, cancellation token, batch rendering. Test with a standalone canvas before integrating.
4. **`components/straits/StraitParticleCanvas.vue`** -- Thin wrapper: canvas element, DPR handling via ResizeObserver (follow useFisheyeCanvas pattern), calls composable.
5. **`components/StraitMap.vue`** -- Wire up: add the canvas component, pass props, verify z-index layering.
6. **Visual calibration** -- Adjust Bezier control points per strait until paths align with the map image. Use debug path visualization.
7. **Accessibility** -- Add `prefers-reduced-motion` support with static particle fallback. Verify WCAG 2.2.2 compliance.
8. **Polish** -- Fade-in timing, glow tuning, mobile particle count reduction, tab visibility pause.

---

## 15. Open Questions

1. **Color mapping discrepancy:** The AC specifies `hsl(186, 60%, 50%)` (cyan) for Dry Bulk and `hsl(34, 60%, 50%)` (amber) for Tanker. The existing CSS vars use amber for dry bulk and red-pink for tanker. Which mapping should particles follow? **Recommendation:** Use AC colors for particles and note the difference is intentional (particles = navigational/ambient, bar chart = analytical).

2. **Clip boundary:** Should particles be clipped to the zoomed circle only, or can they extend slightly beyond it for a softer edge? A feathered edge (alpha fade near the circle boundary) would look more polished but adds per-particle distance checks. **Recommendation:** Hard clip for v1, feathered edge as v2 enhancement (incompatible with batch rendering optimization).

3. **Year slider:** The AC mentions particle count is "proportional to vessel count for selected year," but the current UI only has `LATEST_YEAR` hardcoded. Is a year slider planned for a separate ticket, or should this implementation support dynamic year changes from the start? **Recommendation:** Build the composable to accept a reactive `year` ref so it is ready, but do not build the slider UI in this ticket.

4. **Multiple lanes:** Some straits (e.g., Malacca) have traffic separation schemes with distinct inbound/outbound lanes. Should the Bezier paths model two parallel lanes, or is a single path with bidirectional flow sufficient for v1? **Recommendation:** Single path for v1; the `altPoints` field in the path config is reserved for a future enhancement.

5. **Transition timing:** The zoom transition takes 0.6s. Should particles begin animating immediately when the zoom starts, or wait until the zoom completes? **Recommendation:** Delay particle start by ~0.4s (start during the tail end of the zoom) for a smooth reveal. Implement via CSS `opacity` transition with `transition-delay: 0.3s`.

6. **(NEW) Glow rendering:** Should glow be enabled by default, or gated behind a performance flag? At 85 particles, the cost is minimal, but it doubles the visual complexity of the draw loop. **Recommendation:** Enable by default with a `ENABLE_GLOW` constant for easy toggling during QA.

7. **(NEW) Mobile particle reduction:** Should mobile devices render fewer particles? The canvas buffer is larger (3x DPR) but the screen is smaller. **Recommendation:** Reduce the `TOTAL_BUDGET` from 240 to 120 on viewports under 768px wide.
