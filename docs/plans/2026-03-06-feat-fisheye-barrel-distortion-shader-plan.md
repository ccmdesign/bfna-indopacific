---
title: "feat: Fisheye barrel distortion shader on strait circles"
type: feat
status: active
date: 2026-03-06
linear: BF-86
---

# Fisheye Barrel Distortion Shader on Strait Circles

## Overview

Add a fisheye/barrel distortion WebGL shader effect to the strait circle satellite images. When a circle is selected and zooms in (existing zoom unchanged), the satellite image inside renders through a barrel distortion fragment shader instead of a plain `<img>`. The effect creates a magnifying-glass look with strong warping at edges and a sharp center.

**Key constraint:** The existing zoom mechanics in `StraitMap.vue` (CSS `transform: scale()` + position transitions) are **not changed**. This feature layers a visual effect on top.

**No new dependencies.** Raw WebGL API only -- no Three.js, no TresJS.

## Problem Statement / Motivation

The strait circles currently render as styled `<div>` elements with CSS borders and translucent backgrounds (`StraitCircle.vue`). They lack the editorial "glass lens" feel described in the design direction. A barrel distortion shader applied to per-strait satellite imagery will give each circle a physically convincing magnifying-glass appearance -- warped at the rim, sharp at the center, with chromatic aberration and natural light falloff.

## Prerequisite: Per-Strait Satellite Images

**Current state:** The `Strait` type (`types/strait.ts`) has no `imageUrl` field, and no per-strait satellite images exist in the project. The only map image is the global `public/assets/map-indo-pacific-2x.webp`.

**What needs to happen before this feature works end-to-end:**

1. Add an `imageUrl?: string` field to the `Strait` interface in `types/strait.ts`
2. Export or source 6 satellite image crops (one per strait) and place them in `public/assets/straits/` (e.g., `malacca.webp`, `taiwan.webp`, etc.)
3. Add the `imageUrl` values to `data/straits/straits.json`
4. Pass `imageUrl` through the component chain: `StraitMap.vue` -> `StraitData.vue` -> `StraitCircle.vue`

**Decision for implementer:** This prerequisite can be done as part of this feature or as a separate preceding task. The composable and shader work can be developed and tested with a single placeholder image before all 6 are ready.

## Proposed Solution

### 1. Create `composables/useFisheyeCanvas.ts`

A Vue composable that manages a raw WebGL context on a `<canvas>` element.

**Inputs:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `canvasRef` | `Ref<HTMLCanvasElement \| null>` | Target canvas element |
| `imageUrl` | `Ref<string \| undefined>` | Strait satellite image URL |
| `distortion` | `Ref<number>` | Barrel distortion strength (default 0.5-0.8) |

**Lifecycle:**

1. On mount: create WebGL2 context (fallback to WebGL1)
2. Compile vertex + fragment shaders (fullscreen quad -- two triangles)
3. When `imageUrl` changes: load image as WebGL texture
4. On each frame (or on resize): render quad with barrel distortion shader
5. On unmount: destroy GL resources (program, buffers, textures, context)

**Fragment shader uniforms:**

| Uniform | Type | Purpose |
|---------|------|---------|
| `uMap` | `sampler2D` | Satellite image texture |
| `uDistortion` | `float` | Barrel distortion coefficient (~0.5-0.8) |
| `uAberration` | `float` | Chromatic aberration strength at edges |

**Fragment shader logic (GLSL):**

```glsl
vec2 fromCenter = vUv - 0.5;
float r = length(fromCenter) * 2.0;
if (r > 1.0) discard;                              // circular clip
float distortionAmount = 1.0 + uDistortion * r * r * r;  // cubic barrel
vec2 distortedUV = fromCenter * distortionAmount + 0.5;

// Chromatic aberration -- RGB split at edges
float aberration = uAberration * r * r;
color.r = texture2D(uMap, distortedUV + vec2(aberration, 0.0)).r;
color.g = texture2D(uMap, distortedUV).g;
color.b = texture2D(uMap, distortedUV - vec2(aberration, 0.0)).b;

// Rim darkening -- natural light falloff
color.rgb *= smoothstep(1.0, 0.75, r);
```

**Vertex shader:** Standard fullscreen quad passing through UV coordinates.

**Composable return value:**

```ts
{
  webglAvailable: Ref<boolean>  // false if context creation failed
}
```

### 2. Modify `components/straits/StraitCircle.vue`

**Current state:** A `<div>` with CSS borders/background. No image element.

**Changes:**

- Add `imageUrl?: string` prop
- When `imageUrl` is provided AND WebGL is available AND reduced motion is not preferred:
  - Render a `<canvas ref="fisheyeCanvas">` instead of (or layered over) the styled div
  - Wire up `useFisheyeCanvas(fisheyeCanvas, computed(() => props.imageUrl), distortion)`
  - The canvas inherits the circle's diameter via CSS (`width: var(--diameter); height: var(--diameter)`)
- When `imageUrl` is NOT provided: keep existing styled div (backward compatible)
- When WebGL unavailable: fall back to `<img>` with `border-radius: 50%`
- When `prefers-reduced-motion`: fall back to `<img>` with `border-radius: 50%`

**Template structure:**

```vue
<template>
  <div class="strait-circle" :style="..." :class="...">
    <!-- Fisheye shader canvas (when WebGL available, image provided, motion OK) -->
    <canvas
      v-if="imageUrl && webglAvailable && !prefersReducedMotion"
      ref="fisheyeCanvas"
      class="strait-circle__canvas"
    />
    <!-- Fallback: plain image (when WebGL unavailable or reduced motion) -->
    <img
      v-else-if="imageUrl"
      :src="imageUrl"
      class="strait-circle__img"
      alt=""
      aria-hidden="true"
    />
    <!-- No image: keep existing CSS-only circle (current behavior) -->
  </div>
</template>
```

### 3. Prop Threading Through Component Chain

Pass `imageUrl` from data through:

| Component | Change |
|-----------|--------|
| `StraitMap.vue` | Read `strait.imageUrl` from data, pass to `<StraitData>` |
| `StraitData.vue` | Accept `imageUrl` prop, pass to `<StraitCircle>` |
| `StraitCircle.vue` | Accept `imageUrl` prop, use with `useFisheyeCanvas` |

### 4. Canvas Resize Handling

Use `ResizeObserver` inside `useFisheyeCanvas` on the canvas's parent element:

- Update `canvas.width` and `canvas.height` to match CSS pixel dimensions (times `devicePixelRatio`)
- Call `gl.viewport()` after resize
- Re-render the shader

This keeps the canvas sharp during the circle grow animation triggered by selection.

### 5. Reduced Motion Fallback

```ts
const prefersReducedMotion = computed(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
```

When active: skip shader, show plain `<img>` with `border-radius: 50%` and `object-fit: cover`.

### 6. WebGL Unavailable Fallback

If `canvas.getContext('webgl2')` and `canvas.getContext('webgl')` both return `null`:

- Set `webglAvailable` ref to `false`
- Component falls back to plain `<img>`
- No error thrown, no console warning in production

## Technical Considerations

### Performance

- **Single draw call per circle:** The shader is a single fullscreen quad with a texture lookup -- trivially cheap for any GPU
- **No animation loop needed unless distortion animates:** If distortion is static per frame, render only on image load and resize (no `requestAnimationFrame` loop). If distortion should animate on selection, use `rAF` but throttle to canvas visibility
- **Texture format:** Use `gl.RGBA` / `gl.UNSIGNED_BYTE` -- standard, universally supported
- **Only selected circles need the shader:** Non-selected circles can remain CSS-only (no WebGL overhead for the 5 idle circles)

### Architecture

- The composable is fully self-contained -- no side effects outside its canvas
- `display: contents` on `.straits-infographic` is **not affected** -- `StraitCircle` is deep inside the grid, not a direct grid child
- The `<canvas>` element sits inside `.strait-circle` which is `position: absolute` inside `.strait-data` -- no grid impact

### Browser Support

- WebGL2: Chrome 56+, Firefox 51+, Safari 15+, Edge 79+
- WebGL1 fallback: covers Safari 14 and older browsers
- No WebGL at all: plain `<img>` fallback (graceful degradation)

## System-Wide Impact

- **Interaction graph:** `StraitCircle` is a leaf component. The shader composable creates no events, emits nothing, and touches no shared state. Selection state flows from `StraitMap` -> `StraitData` -> `StraitCircle` as today.
- **Error propagation:** WebGL context failure is caught at creation time and sets a boolean ref. No exceptions propagate.
- **State lifecycle risks:** GL resources (program, buffers, textures) must be cleaned up on unmount. The composable's `onUnmounted` hook handles this. Risk: if the component is rapidly mounted/unmounted (e.g., during HMR), stale contexts could leak. Mitigation: guard cleanup with null checks.
- **API surface parity:** No other components use WebGL. This is the first WebGL surface in the project.
- **Integration test scenarios:**
  1. Select a strait with an imageUrl -> canvas renders with barrel distortion
  2. Select a strait without an imageUrl -> CSS circle unchanged
  3. Toggle `prefers-reduced-motion` -> canvas swaps to `<img>`
  4. Resize browser during circle zoom animation -> canvas stays sharp
  5. Rapidly click between straits -> GL context doesn't leak

## Acceptance Criteria

- [ ] Selected circle image renders through barrel distortion shader with visible edge warping
- [ ] Distortion is noticeably exaggerated -- "looking through a glass lens" feel
- [ ] Chromatic aberration visible at the circle rim (RGB split)
- [ ] Rim darkening creates natural light falloff at edges
- [ ] No new npm dependencies (raw WebGL only)
- [ ] Existing zoom behavior (CSS `transform: scale()` in `StraitMap`) completely unchanged
- [ ] Graceful fallback to plain `<img>` when WebGL unavailable
- [ ] Graceful fallback to plain `<img>` when `prefers-reduced-motion` is active
- [ ] Canvas resizes correctly during the circle grow animation
- [ ] No performance regression -- shader runs at 60fps
- [ ] GL resources cleaned up on component unmount (no WebGL context leaks)
- [ ] Circles without `imageUrl` continue to render as CSS-only (backward compatible)

## Files Changed

| File | Change |
|------|--------|
| `composables/useFisheyeCanvas.ts` | **NEW** -- WebGL composable with barrel distortion shader |
| `components/straits/StraitCircle.vue` | Add `imageUrl` prop, conditional `<canvas>` vs `<img>` vs CSS-only |
| `components/straits/StraitData.vue` | Thread `imageUrl` prop to `StraitCircle` |
| `components/StraitMap.vue` | Pass `strait.imageUrl` to `StraitData` |
| `types/strait.ts` | Add optional `imageUrl` field to `Strait` interface |
| `data/straits/straits.json` | Add `imageUrl` values (once satellite crops exist) |

## Dependencies & Risks

### Prerequisites (blocking)

- Per-strait satellite image crops must exist in `public/assets/straits/` before the full effect is visible. The shader code itself can be developed and tested with a single test image.

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| WebGL context limit (browsers cap at ~8-16 active contexts) | Medium -- 6 circles could each create a context | Only create context for the selected circle; CSS-only for unselected |
| Canvas flicker during mount/unmount transitions | Low | Overlay canvas on the existing div; fade in with CSS opacity transition |
| Satellite image CORS issues | Low -- images served from same origin | Images in `public/assets/` are same-origin by default |
| HMR during dev causes GL context leak | Low | Defensive cleanup in `onUnmounted` with null guards |

## Implementation Sequence

1. **Add `imageUrl` to type and data** -- `types/strait.ts`, `data/straits/straits.json` (can use placeholder image initially)
2. **Build `composables/useFisheyeCanvas.ts`** -- shader compilation, texture loading, render loop, cleanup
3. **Modify `StraitCircle.vue`** -- canvas/img/div conditional rendering, wire composable
4. **Thread prop** -- `StraitMap.vue` -> `StraitData.vue` -> `StraitCircle.vue`
5. **Add ResizeObserver** -- canvas dimension sync
6. **Add fallbacks** -- reduced motion check, WebGL availability check
7. **Visual tuning** -- adjust `uDistortion` and `uAberration` values for editorial approval

## Sources & References

- WebGL2 Fundamentals: https://webgl2fundamentals.org/
- Barrel distortion algorithm: Brown-Conrady model (cubic radial distortion)
- Related project memory: BF-77 (Circle-to-Lens Transition) was reverted -- this feature is the shader-only subset that does NOT change layout or grid behavior
