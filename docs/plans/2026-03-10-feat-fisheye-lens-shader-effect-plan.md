---
title: "feat: Fisheye lens shader effect on strait circles"
type: feat
status: active
date: 2026-03-10
linear: BF-105
origin: docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md
---

# Fisheye Lens Shader Effect on Strait Circles

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

// --- Vignette (edge darkening, more pronounced than existing rim darkening) ---
float vignette = 1.0 - uVignette * uStrength * r * r;
color.rgb *= max(vignette, 0.0);

// --- Specular highlight (arc/streak simulating light on glass) ---
// Positioned in upper-right quadrant, Gaussian falloff
vec2 specPos = fromCenter - vec2(0.15, 0.2);  // offset from center
float specDist = length(specPos);
float specular = uSpecular * uStrength * exp(-specDist * specDist * 40.0);
// Elongate into an arc by weighting the perpendicular distance
float arcAngle = atan(specPos.y, specPos.x);
float arcShape = exp(-pow(specDist - 0.2, 2.0) * 80.0);
specular = uSpecular * uStrength * arcShape * smoothstep(1.0, 0.7, r);
color.rgb += vec3(specular);
```

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

**Important:** The existing `render()` function already watches `distortion` and `aberration`. Add `strength`, `specular`, and `vignette` to the same watcher so any change triggers a re-render. The `uStrength` uniform must be sent every frame since it animates.

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
function animateIn() {
  const start = performance.now()
  const duration = 600
  function tick(now: number) {
    const t = Math.min((now - start) / duration, 1.0)
    strength.value = easeOutCubic(t)
    if (t < 1.0) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}
```

During the animation, the composable's watcher on `strength` fires `render()` each frame, driving the rAF-based shader updates.

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

### 4. No Changes to StraitMap.vue or StraitData.vue

The `backgroundImage` is already available via `flowConfig` in `StraitCircle.vue` (line 22: `const bgImageSrc = computed(() => flowConfig.value?.backgroundImage ?? null)`). No new prop threading is needed.

## Technical Considerations

### Performance

- **Animated entrance:** The rAF loop runs for only 600ms (~36 frames). After that, no animation loop — just static render on resize.
- **Specular highlight:** Two additional `exp()` calls per fragment. Negligible cost on any GPU.
- **Only one active lens:** At most one circle is selected at a time. The other five circles have no WebGL overhead.
- **Texture already loaded:** Background images are preloaded via `<link rel="preload">` in `StraitMap.vue` (line 10-14). The WebGL texture upload benefits from the browser cache.

### Specular Highlight Tuning

The specular arc position (`vec2(0.15, 0.2)`) and falloff (`* 40.0`, `* 80.0`) are artistic choices. These should be tunable during development:

- Consider adding a `uSpecularPos` uniform (`vec2`) for position flexibility
- Or keep hardcoded and adjust GLSL constants by visual inspection
- The highlight should look like light reflecting off a glass surface — a bright, soft arc in the upper portion of the circle

### Vignette vs Existing Rim Darkening

The existing shader has rim darkening: `color.rgb *= smoothstep(1.0, 0.75, r)`. The new vignette (`1.0 - uVignette * r * r`) is a different curve — more gradual, quadratic falloff. Options:

1. **Replace** rim darkening with the new vignette (simpler, one effect)
2. **Stack** both (deeper edge darkening, more dramatic)
3. **Keep rim darkening for the circle edge, add vignette for overall depth**

Recommendation: **Replace.** The vignette modulated by `uStrength` provides smooth animated entrance; the existing `smoothstep` rim darkening is static. Unifying them under one curve controlled by `uStrength` is cleaner.

### Animation Sync with Zoom

The existing zoom transition in `StraitMap.vue` uses CSS `transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)` for the circle scale-up. The FisheyeLens entrance should use the same 600ms duration. The easing need not match exactly (CSS uses `ease-in-out`, JS can use `ease-out`) because the effects are complementary, not synchronized pixel-for-pixel.

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

## Files Changed

| File | Change |
|------|--------|
| `composables/useFisheyeCanvas.ts` | **MODIFY** — Add `uStrength`, `uSpecular`, `uVignette` uniforms to both V2/V1 shaders; add new function params; add watchers |
| `components/straits/FisheyeLens.vue` | **NEW** — WebGL canvas wrapper with animated entrance logic |
| `components/straits/StraitCircle.vue` | **MODIFY** — Replace `<img>` with `<FisheyeLens>` + fallback; add `prefersReducedMotion` detection |

## Implementation Sequence

1. **Extend shader source** in `useFisheyeCanvas.ts` — add three new uniforms (`uStrength`, `uSpecular`, `uVignette`) to GLSL source, look up locations, set in `render()`, add to watcher
2. **Update composable signature** — add `strength`, `specular`, `vignette` params; keep backward-compatible with defaults
3. **Create `FisheyeLens.vue`** — canvas element, call composable, implement 600ms animated entrance via rAF + ease-out
4. **Modify `StraitCircle.vue`** — conditional rendering: FisheyeLens when selected + WebGL available, `<img>` fallback otherwise; add `prefersReducedMotion` reactive ref
5. **Visual tuning** — adjust specular arc position/falloff, vignette strength, distortion coefficient; iterate with design review
6. **Test** — verify SSG build, reduced motion toggle, rapid strait switching, context loss recovery, HiDPI rendering

## Dependencies & Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Specular highlight looks artificial or distracting | Medium | Tunable via uniform; can be disabled by setting `uSpecular = 0` |
| Animation jank on low-end mobile during 600ms ramp | Low | Only one canvas active; 3 extra uniform sets per frame is negligible |
| Stacking vignette + existing rim darkening over-darkens edges | Low | Replace rim darkening with vignette (see Technical Considerations) |
| rAF loop not cancelled on rapid deselect/reselect | Medium | Track animation frame ID; cancel on `active` change before starting new animation |

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md](../brainstorms/2026-03-04-circle-lens-straits-brainstorm.md) — circle + lens interaction model, hybrid HTML + Canvas approach
- **Predecessor plan (BF-86):** [docs/plans/2026-03-06-feat-fisheye-barrel-distortion-shader-plan.md](./2026-03-06-feat-fisheye-barrel-distortion-shader-plan.md) — barrel distortion, chromatic aberration, context loss handling, SSR safety (all implemented)
- Existing composable: `composables/useFisheyeCanvas.ts`
- Existing component: `components/straits/StraitCircle.vue`
- WebGL specular lighting: [LearnOpenGL - Specular](https://learnopengl.com/Lighting/Basic-Lighting)
- Project memory: BF-77 reverted for grid breakage — this feature avoids grid changes entirely
