---
title: "feat: Fisheye lens shader effect on strait circles"
type: feat
status: active
date: 2026-03-10
linear: BF-105
origin: docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md
deepened: 2026-03-10
---

# Fisheye Lens Shader Effect on Strait Circles

## Enhancement Summary

**Deepened on:** 2026-03-10
**Sections enhanced:** 7
**Research sources:** WebGL Fundamentals, MDN WebGL Best Practices, Vue 3 Docs, Context7, motion design principles (Emil Kowalski, Jakub Krehel), frontend race condition analysis, architecture review, performance analysis

### Key Improvements
1. **rAF race condition prevention** — Added cancellation token pattern and state machine for animation lifecycle to prevent ghost animations on rapid select/deselect
2. **Shader precision safety** — Added `GL_FRAGMENT_PRECISION_HIGH` guard for specular `pow()` on mediump-only devices (older mobile GPUs)
3. **Single render pass** — All effects (distortion, aberration, vignette, specular) merged into one fragment shader pass, avoiding multi-pass overhead
4. **Vue 3.5+ `onWatcherCleanup`** — Use modern watcher cleanup for the strength animation rAF loop instead of manual bookkeeping
5. **Dead specular code removal** — Identified unused `specDist`/`specular` computation before the arc recalculation; plan now calls for the clean version only

### New Considerations Discovered
- `mediump` float precision on some mobile GPUs can cause specular `pow()` overflow — needs `#ifdef GL_FRAGMENT_PRECISION_HIGH` guard
- The `animateIn()` function in the original plan has no cancellation — rapid select/deselect creates overlapping rAF loops that fight over `strength.value`
- The `<img>` in StraitCircle currently has a CSS `scale: 1.5 → 1` entrance transition; FisheyeLens must replicate or replace this zoom-in feel, or the visual transition will feel different from the fallback
- Canvas `width`/`height` must use `Math.round()` to avoid moire artifacts from non-integer `devicePixelRatio` values (common on Windows UI scaling)

---

## Overview

Enhance the existing barrel distortion shader (`composables/useFisheyeCanvas.ts`) with three new visual effects — specular highlight, vignette, and animated entrance — then integrate it into `StraitCircle.vue` via a new `FisheyeLens.vue` wrapper component. The lens replaces the plain `<img>` when a strait is selected, creating the illusion of looking through a convex glass lens. Particles render as a DOM layer on top, unaffected by distortion.

**Builds on:** BF-86 (completed) — the barrel distortion composable with chromatic aberration and rim darkening already exists and is tested.

**Key constraint:** No layout or grid changes. The lens lives entirely inside `StraitCircle`, which is `overflow: hidden; border-radius: 50%`. The master grid's `display: contents` on `.straits-infographic` is never touched (see brainstorm: `docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md`).

## Problem Statement / Motivation

The current selected-circle state shows a plain `<img>` of the satellite crop with particle animation layered on top. While functional, it lacks the editorial "looking through glass" feel from the design direction. Adding specular highlight, vignette, and an animated strength ramp transforms the flat image into a physically convincing lens that forms in sync with the existing zoom transition.

## Proposed Solution

### 1. Extend `composables/useFisheyeCanvas.ts` — Three New Shader Uniforms

Add three new uniforms to both the WebGL2 and WebGL1 fragment shaders:

| Uniform | Type | Default | Purpose |
|---------|------|---------|---------|
| `uStrength` | `float` | `1.0` | Master effect strength (0 = no distortion, 1 = full). Controls the animated entrance. |
| `uSpecular` | `float` | `0.6` | Intensity of the specular highlight arc |
| `uVignette` | `float` | `0.8` | Strength of edge darkening |

**Shader additions (fragment, after existing barrel + chromatic aberration):**

```glsl
// --- Apply uStrength to modulate all effects ---
// Barrel distortion: scale distortion coefficient by uStrength
float distortionAmount = 1.0 + (uDistortion * uStrength) * r * r * r;

// Chromatic aberration: scale by uStrength
float aberration = (uAberration * uStrength) * r * r;

// --- Vignette (edge darkening, replaces existing rim darkening) ---
float vignette = 1.0 - uVignette * uStrength * r * r;
color.rgb *= max(vignette, 0.0);

// --- Specular highlight (arc/streak simulating light on glass) ---
// Positioned in upper-right quadrant, arc-shaped Gaussian falloff
vec2 specPos = fromCenter - vec2(0.15, 0.2);
float specDist = length(specPos);
float arcShape = exp(-pow(specDist - 0.2, 2.0) * 80.0);
float specular = uSpecular * uStrength * arcShape * smoothstep(1.0, 0.7, r);
color.rgb += vec3(specular);
```

#### Research Insights: Shader

**Best Practices (from WebGL Fundamentals & MDN):**
- Merge all post-processing effects into a single fragment shader pass. The plan already does this correctly — distortion, aberration, vignette, and specular are all computed in one pass with no intermediate framebuffers.
- The `exp()` and `pow()` calls for specular are cheap per-fragment operations on GPUs; two `exp()` calls add negligible cost compared to the texture sampling that already dominates.
- Avoid branching (`if`/`else`) in fragment shaders where possible. The plan's specular uses `smoothstep` for soft masking instead of an `if` check — this is correct and GPU-friendly.

**Precision Safety (from WebGL Fundamentals precision-issues):**
- On devices that only support `mediump` float in fragment shaders, `pow()` can overflow with large exponents. The plan uses `pow(specDist - 0.2, 2.0) * 80.0` which is safe (small exponent), but the specular `pow()` pattern should be validated. Add a precision guard:

```glsl
// At top of fragment shader:
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
```

This is already partially addressed by the existing `precision mediump float;` declaration, but the `#ifdef` pattern is safer and a recommended WebGL best practice for shaders that do specular-like `pow()` math.

**Dead Code in Original Plan:**
The original GLSL snippet computes `specular` twice — first as a Gaussian blob, then reassigns it as an arc shape. The first computation (`uSpecular * uStrength * exp(-specDist * specDist * 40.0)`) is dead code. Also, `arcAngle` from `atan(specPos.y, specPos.x)` is computed but never used. The cleaned version above removes both.

**Edge Case — uStrength at 0.0:**
When `uStrength = 0.0`, the distortion formula becomes `1.0 + 0 = 1.0` (identity), aberration becomes `0.0`, vignette becomes `1.0` (no darkening), and specular becomes `0.0`. This means at strength 0 the shader outputs the undistorted texture — which is correct for the animation start state but means the canvas is still rendering. Consider hiding the canvas element entirely (via CSS `opacity: 0` or `v-show`) at strength 0 to avoid an unnecessary texture draw.

**Composable interface change:**

```ts
export function useFisheyeCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  imageUrl: Ref<string | undefined>,
  distortion: Ref<number>,
  aberration: Ref<number>,
  strength: Ref<number>,      // NEW
  specular?: Ref<number>,     // NEW (optional, defaults to 0.6)
  vignette?: Ref<number>,     // NEW (optional, defaults to 0.8)
)
```

#### Research Insights: Composable Signature

**Best Practices (from Vue composables patterns):**
- Consider using an options object instead of positional parameters. The composable already has 7 parameters, which hurts readability at the call site. An options pattern would be cleaner:

```ts
export function useFisheyeCanvas(options: {
  canvasRef: Ref<HTMLCanvasElement | null>
  imageUrl: Ref<string | undefined>
  distortion: Ref<number>
  aberration: Ref<number>
  strength: Ref<number>
  specular?: Ref<number>
  vignette?: Ref<number>
})
```

However, this is a breaking change to an existing composable. **Recommendation: Keep positional params for this PR to avoid touching existing call sites, but add a TODO comment for future refactor to options object.**

**Important:** The existing `render()` function already watches `distortion` and `aberration`. Add `strength`, `specular`, and `vignette` to the same watcher so any change triggers a re-render. The `uStrength` uniform must be sent every frame since it animates.

#### Research Insights: Watcher Performance During Animation

**Performance Consideration:**
During the 600ms animation, `strength.value` changes ~36 times. Each change fires the watcher, which calls `render()`. This is correct behavior — but the watcher fires asynchronously by default (Vue batches watcher callbacks via `nextTick`). For animation-driven rendering, this introduces a 1-frame lag.

**Recommendation:** Use `{ flush: 'sync' }` on the watcher for `strength` during animation, OR bypass the watcher entirely during animation by calling `render()` directly inside the rAF `tick()` function. The second approach is simpler and avoids watcher overhead:

```ts
// Inside FisheyeLens.vue's animateIn():
function tick(now: number) {
  const t = Math.min((now - start) / duration, 1.0)
  strength.value = easeOutCubic(t)
  render()  // Call render directly, don't wait for watcher
  if (t < 1.0) requestAnimationFrame(tick)
}
```

This requires `render()` to be exposed from the composable's return value. Add `render` to the composable's return object.

### 2. Create `components/straits/FisheyeLens.vue`

A new component that wraps the WebGL canvas and manages the animated entrance.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `imageUrl` | `string` | Strait satellite image URL (from `flowConfig.backgroundImage`) |
| `active` | `boolean` | Whether the lens is active (triggers animation) |

**Behavior:**

1. Creates a `<canvas>` element sized to fill the circle (`position: absolute; inset: 0`)
2. Calls `useFisheyeCanvas` with reactive refs for all uniforms
3. When `active` becomes `true`: animates `strength` from `0.0` to `1.0` over 600ms using `requestAnimationFrame` with an ease-out curve. This syncs with the existing CSS zoom transition duration (`ZOOM_OUT_DURATION_MS = 600` in `StraitMap.vue`).
4. When `active` becomes `false`: immediately sets `strength` to `0.0` (or could reverse-animate if desired)
5. Exposes `webglAvailable` from the composable so `StraitCircle` can fall back to `<img>`

**Animation approach — rAF loop with easing, not CSS:**

```ts
let animFrameId: number | null = null

function cancelAnimation() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
}

function animateIn() {
  cancelAnimation()  // Cancel any in-flight animation first
  const start = performance.now()
  const duration = 600
  function tick(now: number) {
    const t = Math.min((now - start) / duration, 1.0)
    strength.value = easeOutCubic(t)
    if (t < 1.0) {
      animFrameId = requestAnimationFrame(tick)
    } else {
      animFrameId = null
    }
  }
  animFrameId = requestAnimationFrame(tick)
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}
```

During the animation, the composable's watcher on `strength` fires `render()` each frame, driving the rAF-based shader updates.

#### Research Insights: Animation Race Conditions

**Critical Finding (from frontend races review):**
The original plan's `animateIn()` function has no cancellation mechanism. If a user rapidly selects and deselects straits, overlapping rAF loops will compete over `strength.value`, causing visual jitter:

1. User selects strait A → `animateIn()` starts, rAF loop running
2. User deselects at frame 10 → `strength` set to 0
3. But rAF loop from step 1 is still running → next tick sets `strength` back to `easeOutCubic(0.3)`
4. Visual: lens flickers between 0 and 0.3

**Solution (added above):** Track `animFrameId` and call `cancelAnimationFrame` before starting any new animation or on deactivation. Clean up on unmount via `onUnmounted`.

**Vue 3.5+ cleanup pattern:**
```ts
watch(() => props.active, (isActive) => {
  if (isActive) {
    animateIn()
    onWatcherCleanup(() => cancelAnimation())
  } else {
    cancelAnimation()
    strength.value = 0
  }
})
```

The `onWatcherCleanup` ensures the rAF loop is cancelled when the watcher re-fires (e.g., rapid toggle), preventing the ghost-loop race condition.

**Additional cleanup on unmount:**
```ts
onUnmounted(() => {
  cancelAnimation()
})
```

#### Research Insights: Motion Design

**Easing Choice (from Jakub Krehel / Emil Kowalski principles):**
- The 600ms ease-out-cubic is appropriate for this editorial/data visualization context. This is not a high-frequency productivity interaction — it is a deliberate selection that triggers once per user action.
- Jakub's production polish perspective: The lens "materializing" is an enter animation. It should be notable but not distracting. Ease-out-cubic gives fast attack, gentle settle — correct choice.
- Consider adding a subtle exit animation (200ms ease-in) instead of instantly snapping `strength` to 0 on deselect. This follows Jakub's principle that "exits should exist but be subtler than enters." A 200ms reverse animation would feel more polished than a hard cut.

**Reduced Motion:**
The plan correctly falls back to a static `<img>` when `prefers-reduced-motion: reduce` is active. This is mandatory per WCAG 2.3 — no exceptions.

**Template:**

```vue
<template>
  <canvas
    ref="canvasRef"
    class="fisheye-lens"
    aria-hidden="true"
  />
</template>

<style scoped>
.fisheye-lens {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
```

### 3. Modify `components/straits/StraitCircle.vue`

**Current structure:**
```
StraitCircle
├── <img> (satellite background, visible when selected)
└── StraitParticles (canvas, visible when selected)
```

**New structure:**
```
StraitCircle
├── FisheyeLens (WebGL canvas, visible when selected AND webgl available)
├── <img> (fallback: visible when selected AND webgl NOT available)
└── StraitParticles (DOM layer, always renders on top)
```

**Changes to StraitCircle.vue:**

1. Import `FisheyeLens` component
2. Replace the `<img>` with conditional rendering:
   - `v-if="selected && bgImageSrc && !prefersReducedMotion"` → `<FisheyeLens>`
   - `v-else-if="selected && bgImageSrc"` → `<img>` (reduced motion / WebGL fallback)
3. Add reactive `prefersReducedMotion` using `matchMedia` listener (SSR-safe, dynamic)
4. Handle the `webglAvailable` ref from FisheyeLens to fall back gracefully:
   - FisheyeLens emits or exposes `webglAvailable`; if `false`, StraitCircle swaps to `<img>`

**Reduced motion detection (reactive, SSR-safe):**

```ts
const prefersReducedMotion = ref(false)
onMounted(() => {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  prefersReducedMotion.value = mql.matches
  const handler = (e: MediaQueryListEvent) => { prefersReducedMotion.value = e.matches }
  mql.addEventListener('change', handler)
  onUnmounted(() => mql.removeEventListener('change', handler))
})
```

#### Research Insights: Component Architecture

**Fallback Strategy Sequencing:**
The current plan uses `v-if` / `v-else-if` for FisheyeLens vs `<img>`. However, `webglAvailable` is only known after FisheyeLens mounts and attempts GL context creation. This creates a flash-of-nothing: FisheyeLens mounts → GL fails → `webglAvailable` becomes `false` → Vue re-renders to `<img>`.

**Recommendation:** Render both FisheyeLens and `<img>` simultaneously during the first frame, with the `<img>` hidden via CSS (not `v-if`). Once `webglAvailable` is confirmed `true`, hide the `<img>` via CSS. If `false`, hide the canvas. This prevents a visible flash:

```vue
<FisheyeLens
  v-if="selected && bgImageSrc && !prefersReducedMotion"
  :image-url="bgImageSrc"
  :active="selected"
  @webgl-status="onWebGLStatus"
/>
<img
  v-if="bgImageSrc"
  :src="bgImageSrc"
  class="strait-bg-image"
  :class="{
    'strait-bg-image--visible': selected && (!webglReady || prefersReducedMotion),
    'strait-bg-image--hidden': webglReady && !prefersReducedMotion,
  }"
/>
```

This way the `<img>` is always present as a safety net, with CSS controlling visibility. The FisheyeLens canvas renders on top when WebGL works.

**Existing `<img>` CSS transition concern:**
The current `<img>` has `scale: 1.5` → `scale: 1` with a 600ms CSS transition on selection. When FisheyeLens replaces it, this zoom-in feel disappears. The shader's `uStrength` animation provides a different kind of entrance (distortion ramping). Verify during visual tuning that the combined effect (CSS circle scale-up from StraitMap + shader strength ramp) feels as good as the old CSS image scale-down.

#### Research Insights: Accessibility

**WCAG Compliance:**
- `aria-hidden="true"` on the canvas is correct — it is a decorative enhancement.
- The `<img>` fallback should retain `alt=""` and `aria-hidden="true"` since the satellite image is decorative (the data is communicated via panels and labels).
- The reactive `prefersReducedMotion` listener is correct and WCAG 2.3 compliant. It responds to live OS-level changes, not just page-load state.

**Keyboard Navigation:**
No changes needed. The strait circles are activated via click events on `StraitData`, which already handles keyboard interactions. The FisheyeLens is purely visual and uses `pointer-events: none`.

### 4. No Changes to StraitMap.vue or StraitData.vue

The `backgroundImage` is already available via `flowConfig` in `StraitCircle.vue` (line 22: `const bgImageSrc = computed(() => flowConfig.value?.backgroundImage ?? null)`). No new prop threading is needed.

## Technical Considerations

### Performance

- **Animated entrance:** The rAF loop runs for only 600ms (~36 frames). After that, no animation loop — just static render on resize.
- **Specular highlight:** Two additional `exp()` calls per fragment. Negligible cost on any GPU.
- **Only one active lens:** At most one circle is selected at a time. The other five circles have no WebGL overhead.
- **Texture already loaded:** Background images are preloaded via `<link rel="preload">` in `StraitMap.vue` (line 10-14). The WebGL texture upload benefits from the browser cache.

#### Research Insights: Performance

**Single Render Pass (from WebGL Fundamentals):**
The plan correctly merges all effects into one fragment shader pass. Multi-pass post-processing (render to texture, then process) is unnecessary here and would add framebuffer overhead. The current approach — one fullscreen quad, one texture sample (with chromatic aberration = 3 samples), plus arithmetic — is optimal.

**GPU Memory:**
Each WebGL canvas allocates a drawing buffer. At HiDPI 2x on a 500px circle, that is a 1000x1000 RGBA buffer = ~4MB. This is well within budget for a single canvas. The plan correctly caps at 2048px max dimension.

**Canvas Resize During Animation:**
The circle grows from its base radius to 45% of viewport height during the zoom transition. The ResizeObserver fires during this growth, causing `syncCanvasSize` → `render()` calls while the rAF animation is also calling `render()`. This is harmless (double renders in the same frame are no-ops after the first `gl.drawArrays`), but could be micro-optimized by skipping the ResizeObserver render during active animation since the rAF loop already renders.

**Moire Artifacts (from WebGL Fundamentals resizing guide):**
The existing `syncCanvasSize` uses `Math.min(width, maxDim)` but does NOT round to integers. Non-integer `devicePixelRatio` (common on Windows with 125% or 150% scaling) produces fractional pixel values. Canvas `width`/`height` truncate to integers, which can create moire artifacts. **Fix:** Use `Math.round()` before the `Math.min()`:

```ts
canvas.width = Math.min(Math.round(width), maxDim)
canvas.height = Math.min(Math.round(height), maxDim)
```

The existing code already uses `Math.round` in the ResizeObserver callback for the `contentBoxSize` path, but the `devicePixelContentBoxSize` path passes values through without rounding — those values should already be integers (device pixels), but adding `Math.round` defensively costs nothing.

### Specular Highlight Tuning

The specular arc position (`vec2(0.15, 0.2)`) and falloff (`* 80.0`) are artistic choices. These should be tunable during development:

- Consider adding a `uSpecularPos` uniform (`vec2`) for position flexibility
- Or keep hardcoded and adjust GLSL constants by visual inspection
- The highlight should look like light reflecting off a glass surface — a bright, soft arc in the upper portion of the circle

#### Research Insights: Specular Realism

**Phong vs Fake Specular (from WebGL Fundamentals lighting):**
Traditional 3D specular uses a half-vector between light and view direction with a shininess exponent. The plan's approach is a 2D screen-space fake — a Gaussian arc at a fixed position. This is the correct choice for a 2D post-processing effect. Real Phong specular requires normals and light vectors, which do not exist in this 2D pipeline.

**Clamp to avoid over-bright (from MDN WebGL best practices):**
The `color.rgb += vec3(specular)` addition can push RGB values above 1.0. While WebGL clamps output to [0,1], the intermediate `color.rgb` used for vignette multiplication could produce unexpected results if the specular is applied before the vignette. **The plan applies vignette before specular, which is correct** — the highlight sits "on top" of the darkened edges, as real glass reflections do.

### Vignette vs Existing Rim Darkening

The existing shader has rim darkening: `color.rgb *= smoothstep(1.0, 0.75, r)`. The new vignette (`1.0 - uVignette * r * r`) is a different curve — more gradual, quadratic falloff. Options:

1. **Replace** rim darkening with the new vignette (simpler, one effect)
2. **Stack** both (deeper edge darkening, more dramatic)
3. **Keep rim darkening for the circle edge, add vignette for overall depth**

Recommendation: **Replace.** The vignette modulated by `uStrength` provides smooth animated entrance; the existing `smoothstep` rim darkening is static. Unifying them under one curve controlled by `uStrength` is cleaner.

### Animation Sync with Zoom

The existing zoom transition in `StraitMap.vue` uses CSS `transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)` for the circle scale-up. The FisheyeLens entrance should use the same 600ms duration. The easing need not match exactly (CSS uses `ease-in-out`, JS can use `ease-out`) because the effects are complementary, not synchronized pixel-for-pixel.

#### Research Insights: Animation Timing

**Easing Mismatch Consideration (from motion design principles):**
The CSS zoom uses `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard easing — fast out, slow in) while the JS animation uses ease-out-cubic. These curves have different shapes:
- CSS: starts slow (0.4 initial velocity), accelerates, then decelerates sharply
- JS ease-out-cubic: starts fast, decelerates smoothly

During the first ~200ms, the CSS zoom is still accelerating while the shader effects are already at ~50% strength. This means the lens distortion "appears" before the circle has fully zoomed — which actually enhances the illusion (the glass forms as the circle grows). This is likely a happy accident but worth noting for visual tuning.

**Exit Animation Timing:**
If implementing a reverse animation on deselect (recommended above), use a shorter duration (200–300ms) with ease-in. Per Jakub Krehel: exits should be faster and subtler than enters. The CSS zoom-out is also 600ms, so a 300ms shader reverse completes well before the circle shrinks away.

### SSR/SSG Safety

- `FisheyeLens.vue` uses `<canvas>` which renders as an empty element during SSR — safe
- The composable gates all browser APIs behind `onMounted` — already SSR-safe from BF-86
- `prefersReducedMotion` detection is in `onMounted` — safe
- No new `import.meta.client` guards needed beyond what BF-86 established

### Browser Support

Unchanged from BF-86:
- WebGL2: Chrome 56+, Firefox 51+, Safari 15+, Edge 79+
- WebGL1 fallback: Safari 14 and older
- No WebGL: plain `<img>` fallback

#### Research Insights: Browser Edge Cases

**Safari WebGL1 and `textureLod`:**
The V1 fallback shader uses `texture2D` (correct). The V2 shader uses `textureLod` (also correct for WebGL2). No issues here.

**iOS Safari Memory Pressure:**
iOS Safari aggressively reclaims WebGL contexts under memory pressure (e.g., many tabs open). The existing `webglcontextlost` / `webglcontextrestored` handlers in the composable cover this. Verify that `onContextRestored` correctly re-applies all three new uniforms (strength, specular, vignette) after re-creating the shader program.

**Firefox on Linux:**
Some Linux Firefox builds use software WebGL (ANGLE). Performance is lower but functional. The 600ms animation with one canvas is well within software rendering capability.

## Acceptance Criteria

- [ ] Selected circle renders with barrel distortion + specular highlight + vignette
- [ ] The lens "forms" with an animated entrance: distortion, chromatic aberration, vignette, and specular all ramp from 0 to target over ~600ms
- [ ] Specular highlight appears as a bright arc/streak in the upper portion of the circle, simulating light on glass
- [ ] Vignette darkens edges to reinforce curvature/depth
- [ ] Particles float above the lens (DOM layer on top, not distorted)
- [ ] Graceful fallback to plain `<img>` when WebGL unavailable
- [ ] Graceful fallback to plain `<img>` when `prefers-reduced-motion` is active (reactive, not just page load)
- [ ] No layout changes — the lens is entirely inside `StraitCircle` (`overflow: hidden; border-radius: 50%`)
- [ ] `display: contents` on `.straits-infographic` is never modified
- [ ] No new npm dependencies
- [ ] Existing zoom behavior unchanged
- [ ] Canvas resizes correctly during circle grow animation
- [ ] GL resources cleaned up on unmount
- [ ] `npx nuxi generate` completes without errors
- [ ] Rapid select/deselect does not produce animation glitches (rAF cancellation works)
- [ ] No flash-of-nothing when WebGL is unavailable (fallback `<img>` visible immediately)
- [ ] Canvas pixel dimensions use integer rounding (no moire artifacts on non-integer DPR)

## Files Changed

| File | Change |
|------|--------|
| `composables/useFisheyeCanvas.ts` | **MODIFY** — Add `uStrength`, `uSpecular`, `uVignette` uniforms to both V2/V1 shaders; add new function params; add watchers; expose `render()` in return value |
| `components/straits/FisheyeLens.vue` | **NEW** — WebGL canvas wrapper with animated entrance logic, rAF cancellation, `onWatcherCleanup` |
| `components/straits/StraitCircle.vue` | **MODIFY** — Replace `<img>` with `<FisheyeLens>` + fallback; add `prefersReducedMotion` detection; handle `webglAvailable` for graceful degradation |

## Implementation Sequence

1. **Extend shader source** in `useFisheyeCanvas.ts` — add three new uniforms (`uStrength`, `uSpecular`, `uVignette`) to GLSL source, look up locations, set in `render()`, add to watcher. Add `#ifdef GL_FRAGMENT_PRECISION_HIGH` guard. Replace existing rim darkening with vignette.
2. **Update composable signature** — add `strength`, `specular`, `vignette` params; keep backward-compatible with defaults. Expose `render()` in return value for direct-call optimization during animation.
3. **Create `FisheyeLens.vue`** — canvas element, call composable, implement 600ms animated entrance via rAF + ease-out with proper cancellation via `animFrameId` tracking and `onWatcherCleanup`.
4. **Modify `StraitCircle.vue`** — conditional rendering: FisheyeLens when selected + WebGL available, `<img>` fallback otherwise; add `prefersReducedMotion` reactive ref. Use CSS-driven visibility for `<img>` to avoid flash-of-nothing.
5. **Fix canvas rounding** — ensure `syncCanvasSize` uses `Math.round()` on all code paths to prevent moire artifacts.
6. **Visual tuning** — adjust specular arc position/falloff, vignette strength, distortion coefficient; iterate with design review. Verify the CSS zoom + shader strength ramp feels cohesive.
7. **Test** — verify SSG build, reduced motion toggle, rapid strait switching (rAF cancellation), context loss recovery (all uniforms restored), HiDPI rendering, Safari WebGL1 fallback, non-integer DPR rendering.

## Dependencies & Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Specular highlight looks artificial or distracting | Medium | Tunable via uniform; can be disabled by setting `uSpecular = 0` |
| Animation jank on low-end mobile during 600ms ramp | Low | Only one canvas active; 3 extra uniform sets per frame is negligible |
| Stacking vignette + existing rim darkening over-darkens edges | Low | Replace rim darkening with vignette (see Technical Considerations) |
| rAF loop not cancelled on rapid deselect/reselect | Medium | Track `animFrameId`; cancel via `cancelAnimationFrame` on `active` change; use `onWatcherCleanup` for automatic cleanup |
| Flash-of-nothing when WebGL unavailable | Low | Keep `<img>` always rendered, control visibility via CSS class; FisheyeLens renders on top when GL works |
| `pow()` overflow on mediump-only mobile GPUs | Low | Add `#ifdef GL_FRAGMENT_PRECISION_HIGH` guard; specular exponent is small (2.0) so risk is minimal |
| Canvas moire artifacts on Windows 125%/150% scaling | Low | Use `Math.round()` on all canvas dimension calculations |
| Context loss does not restore new uniforms | Low | Verify `onContextRestored` path re-creates shader program which re-looks-up all uniform locations including the three new ones |

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md](../brainstorms/2026-03-04-circle-lens-straits-brainstorm.md) — circle + lens interaction model, hybrid HTML + Canvas approach
- **Predecessor plan (BF-86):** [docs/plans/2026-03-06-feat-fisheye-barrel-distortion-shader-plan.md](./2026-03-06-feat-fisheye-barrel-distortion-shader-plan.md) — barrel distortion, chromatic aberration, context loss handling, SSR safety (all implemented)
- Existing composable: `composables/useFisheyeCanvas.ts`
- Existing component: `components/straits/StraitCircle.vue`
- WebGL specular lighting: [LearnOpenGL - Specular](https://learnopengl.com/Lighting/Basic-Lighting)
- Project memory: BF-77 reverted for grid breakage — this feature avoids grid changes entirely
- [WebGL Best Practices — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [WebGL Fundamentals — Precision Issues](https://webglfundamentals.org/webgl/lessons/webgl-precision-issues.html)
- [WebGL Fundamentals — Resizing the Canvas](https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html)
- [Vue 3.5+ onWatcherCleanup](https://github.com/vuejs/docs/blob/main/src/guide/essentials/watchers.md)
- [Filmic Effects in WebGL — Matt DesLauriers](https://medium.com/@mattdesl/filmic-effects-for-webgl-9dab4bc899dc)
