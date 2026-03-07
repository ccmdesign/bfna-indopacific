# BF-78: Canvas Particle System in Lens View

**Status:** Plan
**Branch:** feature/BF-78-canvas-particle-system
**Depends on:** BF-77 (circle-to-lens zoom transition) -- already merged

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

---

## 6. Rendering Loop (`requestAnimationFrame`)

### Per-Frame Steps

```
function tick() {
  1. Clear canvas (full clear)
  2. Compute canvas-to-map coordinate transform (based on innerSize, zoomScale, selectedStrait position)
  3. Set canvas dimensions if container resized (handle DPR)
  4. For each particle:
     a. Advance: particle.progress += particle.speed * particle.direction
     b. Wrap: if progress > 1, set to 0; if progress < 0, set to 1
     c. Evaluate Bezier at particle.progress -> (x, y) in normalized coords
     d. Transform (x, y) to canvas pixel coords
     e. Draw: ctx.beginPath(); ctx.arc(x, y, particle.radius, 0, TAU); ctx.fill()
  5. requestAnimationFrame(tick)
}
```

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

Alternatively, use CSS `clip-path: circle()` on the canvas element, but canvas-level clipping gives more control and avoids layout recalculations.

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

### Frame-Rate Independence (Optional Enhancement)

For v1, assume 60fps. If needed later, pass `deltaTime` from `requestAnimationFrame` timestamps:

```typescript
const dt = (timestamp - lastTimestamp) / 16.667  // normalize to 60fps
particle.progress += particle.speed * particle.direction * dt
```

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

### Memory

- Particle array: ~85 objects x ~7 properties = negligible
- No textures, no offscreen canvases needed
- Single canvas context, no WebGL

---

## 12. File Summary

| File | Action | Description |
|------|--------|-------------|
| `components/straits/StraitParticleCanvas.vue` | **Create** | Canvas component, mounts inside `.map-inner` |
| `composables/useParticleSystem.ts` | **Create** | Particle lifecycle, rAF loop, Bezier evaluation |
| `data/straits/strait-paths.ts` | **Create** | Per-strait Bezier control points (hand-tuned) |
| `components/StraitMap.vue` | **Edit** | Add `<StraitParticleCanvas>` inside `.map-inner`, pass props |
| `public/styles.css` | **Edit** | Add particle color CSS vars if needed for consistency |
| `types/strait.ts` | **Edit** | (Optional) Add `StraitPath` type if co-located with strait types |

---

## 13. Implementation Order

1. **`data/straits/strait-paths.ts`** -- Define Bezier paths with rough estimates, export as a map keyed by strait ID.
2. **`composables/useParticleSystem.ts`** -- Core logic: particle init, Bezier eval, rAF loop, coordinate transform. Test with a standalone canvas before integrating.
3. **`components/straits/StraitParticleCanvas.vue`** -- Thin wrapper: canvas element, DPR handling, calls composable.
4. **`components/StraitMap.vue`** -- Wire up: add the canvas component, pass props, verify z-index layering.
5. **Visual calibration** -- Adjust Bezier control points per strait until paths align with the map image.
6. **Polish** -- Fade-in timing, reduced-motion support, glow tuning.

---

## 14. Open Questions

1. **Color mapping discrepancy:** The AC specifies `hsl(186, 60%, 50%)` (cyan) for Dry Bulk and `hsl(34, 60%, 50%)` (amber) for Tanker. The existing CSS vars use amber for dry bulk and red-pink for tanker. Which mapping should particles follow? **Recommendation:** Use AC colors for particles and note the difference is intentional (particles = navigational/ambient, bar chart = analytical).

2. **Clip boundary:** Should particles be clipped to the zoomed circle only, or can they extend slightly beyond it for a softer edge? A feathered edge (alpha fade near the circle boundary) would look more polished but adds per-particle distance checks.

3. **Year slider:** The AC mentions particle count is "proportional to vessel count for selected year," but the current UI only has `LATEST_YEAR` hardcoded. Is a year slider planned for a separate ticket, or should this implementation support dynamic year changes from the start? **Recommendation:** Build the composable to accept a reactive `year` ref so it is ready, but do not build the slider UI in this ticket.

4. **Multiple lanes:** Some straits (e.g., Malacca) have traffic separation schemes with distinct inbound/outbound lanes. Should the Bezier paths model two parallel lanes, or is a single path with bidirectional flow sufficient for v1? **Recommendation:** Single path for v1; the `altPoints` field in the path config is reserved for a future enhancement.

5. **Transition timing:** The zoom transition takes 0.6s. Should particles begin animating immediately when the zoom starts, or wait until the zoom completes? **Recommendation:** Delay particle start by ~0.4s (start during the tail end of the zoom) for a smooth reveal.
