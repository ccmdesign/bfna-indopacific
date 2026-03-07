---
title: "feat: Fisheye barrel distortion shader on strait circles"
type: feat
status: active
date: 2026-03-06
linear: BF-86
deepened: 2026-03-06
---

# Fisheye Barrel Distortion Shader on Strait Circles

## Enhancement Summary

**Deepened on:** 2026-03-06
**Sections enhanced:** 8
**Research sources:** WebGL Fundamentals, Khronos WebGL Wiki, MDN WebGL Best Practices, Geeks3D Shader Library, web.dev HiDPI guide, Vue Composables docs, Julik frontend-races patterns, Kieran TypeScript patterns

### Key Improvements
1. Added `webglcontextlost` / `webglcontextrestored` event handling -- critical for robustness in SPAs and tab-heavy browsing
2. Added SSR/SSG safety guard -- the project uses `ssr: true` with static prerendering; bare `window`/`document` access in the composable will crash during build
3. Replaced naive `devicePixelRatio` multiplication with `devicePixelContentBoxSize` from ResizeObserver (Chrome/Edge) plus proper fallback
4. Added texture image race condition handling -- "load handler then set src" pattern and stale-image guard when `imageUrl` changes rapidly
5. Added UV clamping to prevent out-of-bounds texture sampling artifacts at high distortion values

### New Considerations Discovered
- WebGL context loss can happen at any time (GPU shared resource); composable must handle graceful recovery, not just initial failure
- `discard` in GLSL prevents early depth-test optimizations -- should use `alpha = 0.0` with blending instead for better GPU performance
- `prefers-reduced-motion` check is a one-shot snapshot -- should use `matchMedia.addEventListener('change', ...)` to react dynamically
- Nuxt SSG build will execute component `<script setup>` on the server; all browser API access must be gated behind `onMounted` or `import.meta.client`

---

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

### Research Insights: Image Preparation

**Best Practices:**
- Satellite crops should be square (1:1 aspect ratio) since they render inside circles -- non-square images will distort unevenly
- Target resolution: 512x512 or 1024x1024 pixels. WebGL textures perform best at power-of-two dimensions (avoids NPOT restrictions on WebGL1 for mipmapping/wrapping)
- Use `.webp` format for file size; WebGL `texImage2D` decodes any browser-supported format
- Consider providing `@2x` variants or a single high-res image -- the `devicePixelRatio` scaling in the shader canvas will demand more pixels on Retina displays

**Edge Cases:**
- If a satellite crop has prominent text or labels, the barrel distortion will warp them unreadably -- choose imagery with natural/geographic content only
- Very dark satellite images (nighttime) may make rim darkening invisible -- consider adjusting `uRimDarkening` per image or ensuring daytime imagery

---

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

// Circular clip via alpha (avoid discard -- it prevents early-z optimizations)
float circleMask = 1.0 - smoothstep(0.98, 1.0, r);
if (circleMask <= 0.0) {
  gl_FragColor = vec4(0.0);
  return;
}

float distortionAmount = 1.0 + uDistortion * r * r * r;  // cubic barrel
vec2 distortedUV = fromCenter * distortionAmount + 0.5;

// Clamp UVs to prevent out-of-bounds sampling artifacts
distortedUV = clamp(distortedUV, 0.0, 1.0);

// Chromatic aberration -- RGB split at edges
float aberration = uAberration * r * r;
vec2 abR = clamp(distortedUV + vec2(aberration, 0.0), 0.0, 1.0);
vec2 abB = clamp(distortedUV - vec2(aberration, 0.0), 0.0, 1.0);

color.r = texture2D(uMap, abR).r;
color.g = texture2D(uMap, distortedUV).g;
color.b = texture2D(uMap, abB).b;

// Rim darkening -- natural light falloff
color.rgb *= smoothstep(1.0, 0.75, r);

// Apply circular mask via alpha
color.a = circleMask;
```

**Vertex shader:** Standard fullscreen quad passing through UV coordinates.

**Composable return value:**

```ts
{
  webglAvailable: Ref<boolean>  // false if context creation failed
}
```

### Research Insights: Shader Implementation

**Best Practices:**
- **Avoid `discard`:** Using `discard` in the fragment shader disables early depth test optimizations on many GPUs. Instead, use alpha blending (`gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)`) and set `alpha = 0.0` for fragments outside the circle. This is especially important if multiple canvases ever overlap.
- **UV clamping is critical:** At high distortion values, the distorted UV coordinates can go outside `[0.0, 1.0]`, causing either repeated texture sampling (if `REPEAT` wrap mode) or black artifacts. Always `clamp()` the final UV coordinates.
- **Chromatic aberration direction:** Real lens chromatic aberration radiates outward from center. The current `vec2(aberration, 0.0)` shifts only along the X axis. For physically accurate results, shift along the `normalize(fromCenter)` direction:
  ```glsl
  vec2 abDir = normalize(fromCenter) * aberration;
  color.r = texture2D(uMap, distortedUV + abDir).r;
  color.b = texture2D(uMap, distortedUV - abDir).b;
  ```
- **Smoothstep for circle edge:** Rather than a hard `if (r > 1.0)` cutoff, use `smoothstep(0.98, 1.0, r)` for anti-aliased circle edges. This avoids jagged aliasing at the circle boundary.

**Performance Considerations:**
- A single quad with 3 texture lookups per fragment is trivially cheap -- well under 0.1ms per frame on any GPU from 2015+
- Consider using `textureLod(uMap, uv, 0.0)` (WebGL2) to bypass mipmapping overhead since the texture is always sampled at full resolution
- For WebGL1 fallback, set `gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)` to avoid requiring mipmaps

**References:**
- [Geeks3D Shader Library: Fish Eye and Barrel Distortion](https://www.geeks3d.com/20140213/glsl-shader-library-fish-eye-and-dome-and-barrel-distortion-post-processing-filters/)
- [Barrel Distortion - prideout.net](https://prideout.net/barrel-distortion)
- [glsl-barrel-pincushion (GitHub)](https://github.com/ayamflow/glsl-barrel-pincushion)

---

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

### Research Insights: Component Architecture

**Best Practices (TypeScript Reviewer):**
- The `imageUrl` prop should use `string | undefined` (not `string | null`) to match the optional field in the `Strait` interface. Vue's `defineProps` with `imageUrl?: string` correctly types this.
- Avoid using `any` for the WebGL context variable. Type it explicitly as `WebGL2RenderingContext | WebGLRenderingContext | null`.
- The `webglAvailable` ref should be `readonly` from the component's perspective -- the composable owns mutation.

**Best Practices (Simplicity Reviewer):**
- Keep the conditional rendering flat (v-if / v-else-if / v-else) as shown -- avoid nested conditions.
- Do not add a separate "loading" state for the texture. The CSS circle div is already visible underneath; the canvas simply appears on top when ready. No skeleton screen or spinner needed.
- The composable should be the single place that knows about WebGL. The component should never import `gl.*` constants or call WebGL APIs directly.

**Best Practices (Accessibility):**
- The `<canvas>` element must have `aria-hidden="true"` since it is purely decorative (the satellite image conveys no unique semantic information).
- The `<img>` fallback already has `alt=""` and `aria-hidden="true"` -- correct for decorative imagery.
- Keyboard focus remains on the parent `.strait-data` element (role="button"), not on the canvas or image.

---

### 3. Prop Threading Through Component Chain

Pass `imageUrl` from data through:

| Component | Change |
|-----------|--------|
| `StraitMap.vue` | Read `strait.imageUrl` from data, pass to `<StraitData>` |
| `StraitData.vue` | Accept `imageUrl` prop, pass to `<StraitCircle>` |
| `StraitCircle.vue` | Accept `imageUrl` prop, use with `useFisheyeCanvas` |

### Research Insights: Prop Threading

**Best Practices (Architecture Strategist):**
- Three levels of prop threading is acceptable for a leaf-component feature. Do NOT introduce `provide/inject` or a Pinia store for this -- the data is static (from JSON), flows in one direction, and only one component consumes it.
- If more per-strait visual properties emerge later (e.g., `overlayColor`, `zoomLevel`), consider bundling them into a single `visualConfig` prop object rather than adding N individual props.

---

### 4. Canvas Resize Handling

Use `ResizeObserver` inside `useFisheyeCanvas` on the canvas's parent element:

- Update `canvas.width` and `canvas.height` to match CSS pixel dimensions (times `devicePixelRatio`)
- Call `gl.viewport()` after resize
- Re-render the shader

This keeps the canvas sharp during the circle grow animation triggered by selection.

### Research Insights: HiDPI Canvas Sizing

**Best Practices:**
- **Use `devicePixelContentBoxSize` when available** (Chrome 84+, Edge 84+). This gives the true device pixel size without the rounding errors of `clientWidth * devicePixelRatio`. Fall back to `contentBoxSize[0] * devicePixelRatio` for Safari/Firefox.
- **Cap the canvas buffer size** to prevent excessive GPU memory on ultra-high DPI (e.g., 3x Retina). Recommend a max of `2048x2048` for the drawing buffer even if the CSS size times DPR exceeds that.
- **Debounce resize re-renders during animation.** During the circle grow animation, the ResizeObserver may fire many times. Use `requestAnimationFrame` to coalesce resize events into a single re-render per frame.

**Implementation detail:**

```ts
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    let width: number, height: number
    if (entry.devicePixelContentBoxSize?.[0]) {
      // Best: exact device pixels, no rounding error
      width = entry.devicePixelContentBoxSize[0].inlineSize
      height = entry.devicePixelContentBoxSize[0].blockSize
    } else if (entry.contentBoxSize?.[0]) {
      // Fallback: CSS pixels * DPR
      const dpr = window.devicePixelRatio || 1
      width = Math.round(entry.contentBoxSize[0].inlineSize * dpr)
      height = Math.round(entry.contentBoxSize[0].blockSize * dpr)
    } else {
      // Legacy fallback
      const dpr = window.devicePixelRatio || 1
      width = Math.round(entry.contentRect.width * dpr)
      height = Math.round(entry.contentRect.height * dpr)
    }
    // Cap to prevent GPU memory blow-up
    const maxDim = 2048
    canvas.width = Math.min(width, maxDim)
    canvas.height = Math.min(height, maxDim)
    gl.viewport(0, 0, canvas.width, canvas.height)
    render()
  }
})

// Observe with devicePixelContentBox when supported
try {
  ro.observe(canvas, { box: 'device-pixel-content-box' })
} catch {
  ro.observe(canvas)
}
```

**References:**
- [web.dev: Pixel-perfect rendering with devicePixelContentBox](https://web.dev/device-pixel-content-box/)
- [WebGL Fundamentals: Resizing the Canvas](https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html)
- [Khronos: HandlingHighDPI](https://www.khronos.org/webgl/wiki/HandlingHighDPI)

---

### 5. Reduced Motion Fallback

```ts
const prefersReducedMotion = computed(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
```

When active: skip shader, show plain `<img>` with `border-radius: 50%` and `object-fit: cover`.

### Research Insights: Reduced Motion

**Critical improvement:** The current implementation is a one-shot snapshot. If the user toggles reduced motion in system settings while viewing the page, the computed will not update. Use `matchMedia.addEventListener('change', ...)` for reactivity:

```ts
const prefersReducedMotion = ref(false)

onMounted(() => {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  prefersReducedMotion.value = mql.matches
  const handler = (e: MediaQueryListEvent) => {
    prefersReducedMotion.value = e.matches
  }
  mql.addEventListener('change', handler)
  onUnmounted(() => mql.removeEventListener('change', handler))
})
```

**Note:** This pattern is provided by VueUse as `useMediaQuery` if the project ever adds it. For now, inline is fine given the "no new dependencies" constraint.

**SSR Safety:** The `onMounted` guard ensures this code never runs during Nuxt's SSG build pass.

---

### 6. WebGL Unavailable Fallback

If `canvas.getContext('webgl2')` and `canvas.getContext('webgl')` both return `null`:

- Set `webglAvailable` ref to `false`
- Component falls back to plain `<img>`
- No error thrown, no console warning in production

### Research Insights: Context Loss and Recovery

**Critical addition -- the plan was missing `webglcontextlost` / `webglcontextrestored` handling:**

WebGL context can be lost at any time after initial creation. The GPU is a shared resource. Common triggers: user switches tabs with heavy GPU usage, driver update, OS power management. In a single-page application, the user may have the page open for hours.

**Required event listeners:**

```ts
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault()  // Tell browser we'll handle recovery
  // Cancel any pending rAF or renders
  cancelPendingRender()
})

canvas.addEventListener('webglcontextrestored', () => {
  // Re-create all GL resources (program, buffers, textures)
  initShaderProgram()
  if (currentImageUrl) loadTexture(currentImageUrl)
  render()
})
```

**Key rule from Khronos wiki:** You MUST call `e.preventDefault()` on `webglcontextlost` for the browser to attempt restoration. Without it, the context stays permanently lost.

**Edge Cases:**
- All WebGL object handles (programs, shaders, buffers, textures) become invalid after context loss. The composable must re-create everything from scratch in the `contextrestored` handler.
- Consider eagerly losing the context on unmount via `gl.getExtension('WEBGL_lose_context')?.loseContext()` to free GPU resources immediately rather than waiting for GC.

**References:**
- [Khronos: HandlingContextLost](https://khronos.org/webgl/wiki/HandlingContextLost)
- [MDN: webglcontextlost event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event)
- [MDN: WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

---

## Technical Considerations

### Performance

- **Single draw call per circle:** The shader is a single fullscreen quad with a texture lookup -- trivially cheap for any GPU
- **No animation loop needed unless distortion animates:** If distortion is static per frame, render only on image load and resize (no `requestAnimationFrame` loop). If distortion should animate on selection, use `rAF` but throttle to canvas visibility
- **Texture format:** Use `gl.RGBA` / `gl.UNSIGNED_BYTE` -- standard, universally supported
- **Only selected circles need the shader:** Non-selected circles can remain CSS-only (no WebGL overhead for the 5 idle circles)

### Research Insights: Performance

**Best Practices (Performance Oracle):**
- **Texture upload is the most expensive operation**, not rendering. `texImage2D` decodes and uploads the image to VRAM. For 1024x1024 RGBA, this is ~4MB. Do this once on image load, not on every render.
- **Pre-decode images with `createImageBitmap()`** before passing to `texImage2D`. `createImageBitmap` runs off the main thread and avoids jank during texture upload:
  ```ts
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
  bitmap.close()
  ```
  `createImageBitmap` is supported in all modern browsers including Safari 15+.
- **Do not create an rAF loop for a static effect.** Render once on texture load, and again on resize. An idle rAF loop wastes battery on mobile.
- **Measure with `gl.finish()` during development** to verify GPU time. In production, remove `gl.finish()` calls.

---

### Architecture

- The composable is fully self-contained -- no side effects outside its canvas
- `display: contents` on `.straits-infographic` is **not affected** -- `StraitCircle` is deep inside the grid, not a direct grid child
- The `<canvas>` element sits inside `.strait-circle` which is `position: absolute` inside `.strait-data` -- no grid impact

### Research Insights: SSR/SSG Safety (Critical for Nuxt)

**This project uses `ssr: true` with `nitro.preset: 'static'`.** During the SSG build, Nuxt executes component `<script setup>` blocks on the server. Any direct access to `window`, `document`, `navigator`, `canvas`, or WebGL APIs will throw `ReferenceError` during build.

**Mitigation strategy:**

1. **All browser API access in the composable must be inside `onMounted()`** -- this hook only runs client-side.
2. **Use `import.meta.client` guard** for any top-level checks:
   ```ts
   const webglAvailable = ref(false) // safe default for SSR

   if (import.meta.client) {
     // Client-only initialization
   }
   ```
3. **The `v-if="imageUrl && webglAvailable"` template guard works naturally** -- `webglAvailable` defaults to `false`, so the canvas is never rendered on the server. The `<img>` fallback renders in the SSR HTML, providing a static snapshot.
4. **Test with `npx nuxi generate`** to verify the build doesn't crash.

---

### Browser Support

- WebGL2: Chrome 56+, Firefox 51+, Safari 15+, Edge 79+
- WebGL1 fallback: covers Safari 14 and older browsers
- No WebGL at all: plain `<img>` fallback (graceful degradation)

### Research Insights: WebGL1 vs WebGL2 Shader Differences

**If falling back to WebGL1, the shader source must be adjusted:**
- WebGL2 uses `#version 300 es`, `in`/`out` instead of `attribute`/`varying`, and `texture()` instead of `texture2D()`
- Maintain two shader source strings or use a preprocessor define:
  ```ts
  const isWebGL2 = gl instanceof WebGL2RenderingContext
  const fragSource = isWebGL2 ? fragSourceV2 : fragSourceV1
  ```
- WebGL1 requires `gl.getExtension('OES_standard_derivatives')` if you use `dFdx`/`dFdy` (not needed for this shader)
- For NPOT (non-power-of-two) textures on WebGL1: must set `TEXTURE_WRAP_S/T` to `CLAMP_TO_EDGE` and `TEXTURE_MIN_FILTER` to `LINEAR` or `NEAREST` (no mipmapping)

---

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

### Research Insights: Race Conditions and Timing (Frontend Races Review)

**Texture loading race condition:**
When `imageUrl` changes (user clicks a different strait), a new `Image()` load begins. If the user clicks again before the first image finishes loading, the `onload` callback from the stale image could upload the wrong texture.

**Mitigation -- stale image guard:**
```ts
let currentLoadId = 0

watch(imageUrl, (newUrl) => {
  if (!newUrl || !gl) return
  const loadId = ++currentLoadId
  const img = new Image()
  img.onload = () => {
    if (loadId !== currentLoadId) return  // Stale load -- discard
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    render()
  }
  img.src = newUrl
})
```

**ResizeObserver + rAF coalescing:**
During the circle grow animation, ResizeObserver may fire on every frame. Coalesce renders with a single `requestAnimationFrame`:
```ts
let resizeRafId: number | null = null
const ro = new ResizeObserver(() => {
  if (resizeRafId !== null) return
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null
    syncCanvasSize()
    render()
  })
})
```

**Unmount during async operations:**
If the component unmounts while an image is loading, the `onload` callback must be a no-op. The `currentLoadId` pattern above handles this naturally -- set `currentLoadId` to a sentinel value in `onUnmounted`.

---

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

### Research Insights: Additional Acceptance Criteria

- [ ] `npx nuxi generate` completes without errors (SSR/SSG safety)
- [ ] `webglcontextlost` event is handled -- shader recovers after context restoration
- [ ] Rapidly switching between straits does not upload stale textures
- [ ] Canvas renders sharp on HiDPI/Retina displays (no blurriness)
- [ ] `prefers-reduced-motion` toggle at runtime (not just page load) switches rendering mode
- [ ] Circle edges are anti-aliased (smoothstep, not hard clip)

---

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

### Research Insights: Additional Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| SSG build crash from browser API access | High if not guarded | All WebGL code inside `onMounted`; `webglAvailable` defaults to `false` |
| WebGL context loss during long page sessions | Medium -- GPU is shared | Handle `webglcontextlost`/`webglcontextrestored` events; `preventDefault()` on lost |
| Stale texture from rapid strait switching | Medium | Monotonic `loadId` counter; discard stale `onload` callbacks |
| Safari missing `devicePixelContentBoxSize` | Certain (as of 2025) | Fallback to `contentBoxSize * devicePixelRatio`; accept minor rounding on Safari |
| Non-power-of-two textures on WebGL1 fallback | Low -- only affects old Safari 14 | Set `CLAMP_TO_EDGE` wrap mode and `LINEAR` min filter on all textures |
| `prefers-reduced-motion` change at runtime not detected | Medium | Use `matchMedia.addEventListener('change', ...)` instead of one-shot check |

---

## Implementation Sequence

1. **Add `imageUrl` to type and data** -- `types/strait.ts`, `data/straits/straits.json` (can use placeholder image initially)
2. **Build `composables/useFisheyeCanvas.ts`** -- shader compilation, texture loading, render loop, cleanup
3. **Modify `StraitCircle.vue`** -- canvas/img/div conditional rendering, wire composable
4. **Thread prop** -- `StraitMap.vue` -> `StraitData.vue` -> `StraitCircle.vue`
5. **Add ResizeObserver** -- canvas dimension sync
6. **Add fallbacks** -- reduced motion check, WebGL availability check
7. **Visual tuning** -- adjust `uDistortion` and `uAberration` values for editorial approval

### Research Insights: Implementation Notes

**Step 2 internal order (composable):**
1. Define shader source strings (vertex + fragment, WebGL2 + WebGL1 variants)
2. `onMounted`: create context, compile shaders, link program, setup fullscreen quad VAO/VBO
3. Add `webglcontextlost` / `webglcontextrestored` listeners
4. Add `ResizeObserver` with `devicePixelContentBoxSize` support
5. Add `watch(imageUrl, ...)` with stale-load guard and `createImageBitmap` for off-thread decoding
6. Add `render()` function (bind texture, set uniforms, `drawArrays`)
7. `onUnmounted`: disconnect ResizeObserver, remove event listeners, delete GL resources, eagerly lose context

**Step 6 internal order (reduced motion):**
1. Create reactive `prefersReducedMotion` ref with `matchMedia` listener (not one-shot)
2. Gate within `onMounted` for SSR safety

**Testing during development:**
- Use `WEBGL_lose_context` extension to simulate context loss: `gl.getExtension('WEBGL_lose_context').loseContext()`
- Test with Chrome DevTools "Emulate CSS media feature prefers-reduced-motion"
- Test `npx nuxi generate` after each step to catch SSR regressions early

---

## Sources & References

- WebGL2 Fundamentals: https://webgl2fundamentals.org/
- Barrel distortion algorithm: Brown-Conrady model (cubic radial distortion)
- Related project memory: BF-77 (Circle-to-Lens Transition) was reverted -- this feature is the shader-only subset that does NOT change layout or grid behavior
- [Khronos: HandlingContextLost](https://khronos.org/webgl/wiki/HandlingContextLost)
- [MDN: WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [web.dev: Pixel-perfect rendering with devicePixelContentBox](https://web.dev/device-pixel-content-box/)
- [Geeks3D: Fish Eye and Barrel Distortion GLSL Filters](https://www.geeks3d.com/20140213/glsl-shader-library-fish-eye-and-dome-and-barrel-distortion-post-processing-filters/)
- [Barrel Distortion - prideout.net](https://prideout.net/barrel-distortion)
- [WebGL Fundamentals: Resizing the Canvas](https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html)
- [MDN: Using textures in WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL)
- [Vue.js: Composables](https://vuejs.org/guide/reusability/composables)
