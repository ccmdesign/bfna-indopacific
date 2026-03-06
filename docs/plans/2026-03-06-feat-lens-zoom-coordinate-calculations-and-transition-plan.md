---
title: "feat: Lens zoom coordinate calculations and map-to-lens transition"
type: feat
status: active
date: 2026-03-06
linear: BF-85
origin: docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md
spec: _process/3d-lens-distortion-zoom-spec.md
---

# Lens Zoom: Coordinate Calculations and Map-to-Lens Transition

## Overview

Implement the mechanical zoom piece of the lens feature for the straits infographic. When a user clicks a strait circle on the overview map, a circular lens overlay appears at viewport center showing a 4x flat-zoomed view of the satellite image centered on that strait. No barrel distortion or WebGL effects in this ticket -- just the geometry, state wiring, and GSAP-animated transition.

This is the foundation that later tickets (distortion shader, particles inside lens, info panel) will build upon.

## Problem Statement / Motivation

The straits overview map currently has clickable circles that emit `select-strait` events, but nothing consumes them. Users need a way to "zoom into" a selected strait to see geographic detail. The previous attempt (BF-77) was reverted because it broke the master grid by changing `StraitsInfographic.vue` from `display: contents` to `position: relative`. This implementation must avoid that mistake entirely by using `<Teleport to="body">` to render the lens outside the grid.

## Proposed Solution

Create a new `StraitLensZoom.vue` component that:

1. Receives the selected strait object as a prop
2. Uses `<Teleport to="body">` to render a fixed-position overlay outside the master grid
3. Displays a 90vh circular lens with a 4x-zoomed satellite image centered on the strait's UV coordinates
4. Animates open/close with GSAP (scale + backdrop fade)
5. Supports close via backdrop click, close button, and Escape key

### Component Architecture

```
StraitsInfographic.vue              (display: contents -- UNCHANGED)
|-- StraitMap.vue                   (existing SVG+IMG -- emits select-strait)
`-- StraitLensZoom.vue              (NEW -- Teleport to body, position:fixed)
    |-- .lens-backdrop              (position:fixed, inset:0, rgba(0,0,0,0.7))
    |-- .lens-circle                (90vh x 90vh, centered, border-radius:50%, overflow:hidden)
    |   `-- <TresCanvas>
    |       `-- Full-screen quad with ShaderMaterial (flat zoom, no distortion)
    `-- .lens-close-button          (top-right corner)
```

## Technical Approach

### Phase 1: Dependencies and TresJS Setup

**Install packages:**

```bash
npm install three @tresjs/nuxt
```

**Configure Nuxt module** in `nuxt.config.ts`:

```ts
modules: ['nuxt-gtag', '@tresjs/nuxt'],
```

The `@tresjs/nuxt` module handles:
- Auto-importing `TresCanvas` and all `Tres*` components
- Client-only rendering (TresCanvas is automatically wrapped in `<ClientOnly>`)
- Three.js compiler configuration

**Key finding from docs:** Use `@tresjs/nuxt` (not `@tresjs/core` directly) for Nuxt projects. It provides automatic imports and handles SSR/SSG correctly by rendering TresCanvas client-only.

### Phase 2: Coordinate Calculation

Convert strait `posX`/`posY` percentages to normalized UV center for the shader:

```ts
// composables/useLensCoordinates.ts
export function straitToUV(posX: number, posY: number): { x: number; y: number } {
  return {
    x: posX / 100,
    y: 1.0 - posY / 100  // flip Y for GL convention
  }
}
```

**Verification against strait data:**

| Strait | posX | posY | uCenter.x | uCenter.y |
|--------|------|------|-----------|-----------|
| Malacca | 60.1 | 56.8 | 0.601 | 0.432 |
| Taiwan | 73.2 | 26.0 | 0.732 | 0.740 |
| Bab el-Mandeb | 15.4 | 41.4 | 0.154 | 0.586 |
| Luzon | 74.1 | 30.5 | 0.741 | 0.695 |
| Lombok | 69.8 | 69.7 | 0.698 | 0.303 |
| Hormuz | 25.1 | 23.2 | 0.251 | 0.768 |

**Edge clamping concern:** Hormuz (uCenter 0.251, 0.768) and Bab el-Mandeb (0.154, 0.586) are near the left edge. At 4x zoom, the visible UV window is `1/4 = 0.25` wide, so Hormuz center at 0.251 means the left edge of the zoomed view would be at `0.251 - 0.125 = 0.126` -- within bounds. Bab el-Mandeb at 0.154 would be `0.154 - 0.125 = 0.029` -- very close to edge but still within bounds. The shader must use `clamp(uv, 0.0, 1.0)` and the Three.js texture must use `ClampToEdgeWrapping` (the default).

### Phase 3: State Wiring

**`StraitsInfographic.vue`** -- add `selectedStrait` ref, stop re-emitting:

```vue
<script setup>
import StraitMap from '~/components/StraitMap.vue'
import StraitLensZoom from '~/components/StraitLensZoom.vue'
import straitsData from '~/data/straits/straits.json'

const selectedStrait = ref(null)

function onSelectStrait(id) {
  const strait = straitsData.straits.find(s => s.id === id)
  selectedStrait.value = strait ?? null
}

function onCloseLens() {
  selectedStrait.value = null
}
</script>

<template>
  <div class="straits-infographic">
    <StraitMap class="strait-map" @select-strait="onSelectStrait" />
    <StraitLensZoom
      v-if="selectedStrait"
      :strait="selectedStrait"
      @close="onCloseLens"
    />
  </div>
</template>
```

**Critical constraint preserved:** `.straits-infographic` stays `display: contents`. `StraitLensZoom` uses `<Teleport to="body">` so it does not participate in the grid at all.

### Phase 4: StraitLensZoom.vue Component

**Template structure:**

```vue
<template>
  <Teleport to="body">
    <div class="lens-overlay" @keydown.esc="close">
      <!-- Dark backdrop -->
      <div
        ref="backdropRef"
        class="lens-backdrop"
        @click="close"
      />
      <!-- Lens circle -->
      <div ref="lensCircleRef" class="lens-circle">
        <TresCanvas>
          <!-- Full-screen quad with flat zoom shader -->
          <TresOrthographicCamera :position="[0, 0, 1]" />
          <TresMesh>
            <TresPlaneGeometry :args="[2, 2]" />
            <TresShaderMaterial
              :vertex-shader="vertexShader"
              :fragment-shader="fragmentShader"
              :uniforms="uniforms"
            />
          </TresMesh>
        </TresCanvas>
      </div>
      <!-- Close button -->
      <button class="lens-close-button" aria-label="Close zoom" @click="close">
        &times;
      </button>
    </div>
  </Teleport>
</template>
```

**Shader -- flat zoom only (no barrel distortion):**

```glsl
// vertex
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// fragment
uniform sampler2D uMap;
uniform vec2 uCenter;
uniform float uZoom;

varying vec2 vUv;

void main() {
  vec2 fromCenter = vUv - 0.5;
  float dist = length(fromCenter) * 2.0;

  // Discard fragments outside the circle
  if (dist > 1.0) discard;

  // Map local coords to texture UV space, centered on strait
  vec2 uv = fromCenter / uZoom + uCenter;

  // Clamp to prevent sampling outside texture
  uv = clamp(uv, 0.0, 1.0);

  gl_FragColor = texture2D(uMap, uv);
}
```

**Uniforms setup (reactive):**

```ts
const uniforms = computed(() => ({
  uMap: { value: texture },
  uCenter: { value: new Vector2(uv.x, uv.y) },
  uZoom: { value: 4.0 },
}))
```

**Texture loading:** Use `useLoader(TextureLoader, '/assets/map-indo-pacific-2x.webp')` from `@tresjs/core`. Set `texture.wrapS = texture.wrapT = ClampToEdgeWrapping` after load.

### Phase 5: CSS Styling

```css
.lens-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lens-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
}

.lens-circle {
  position: relative;
  width: 90vh;
  height: 90vh;
  border-radius: 50%;
  overflow: hidden;
  z-index: 1;
}

.lens-close-button {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 2;
  /* styling: white, large, no background */
}
```

### Phase 6: GSAP Open/Close Animation

**Open sequence (on mount):**

```ts
const tl = gsap.timeline()
tl.fromTo(backdropRef.value, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.inOut' })
tl.fromTo(lensCircleRef.value, { scale: 0 }, { scale: 1, duration: 0.5, ease: 'power2.out' }, 0)
```

**Close sequence (before emit):**

```ts
const tl = gsap.timeline({ onComplete: () => emit('close') })
tl.to(lensCircleRef.value, { scale: 0, duration: 0.4, ease: 'power2.in' })
tl.to(backdropRef.value, { opacity: 0, duration: 0.4 }, 0)
```

**Reduced motion:** Check `window.matchMedia('(prefers-reduced-motion: reduce)')`. If true, skip animation -- instant show/hide.

### Phase 7: Keyboard and Focus Management

- Trap focus inside `.lens-overlay` while open
- Close on Escape key
- Return focus to the clicked circle on close
- `aria-modal="true"` on the overlay
- `role="dialog"` with `aria-label="Zoomed view of [strait name]"`

## Files to Create

| File | Purpose |
|------|---------|
| `components/StraitLensZoom.vue` | Lens overlay with TresCanvas, shader, GSAP animation |
| `composables/useLensCoordinates.ts` | `straitToUV()` helper for coordinate conversion |

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `three` and `@tresjs/nuxt` dependencies |
| `nuxt.config.ts` | Add `@tresjs/nuxt` to modules array |
| `components/infographics/StraitsInfographic.vue` | Add `selectedStrait` ref, import and render `StraitLensZoom`, handle `select-strait` and `close` events |

## Files NOT to Modify

| File | Why |
|------|-----|
| `components/StraitMap.vue` | Already emits `select-strait` correctly |
| `public/styles.css` | Lens styles are scoped to `StraitLensZoom.vue`; no grid changes needed |
| `pages/infographics/straits.vue` | No changes needed at page level |

## System-Wide Impact

- **Grid safety:** `StraitLensZoom` uses `<Teleport to="body">` and `position: fixed`. It is invisible to the master grid. No grid rules are changed.
- **Bundle size:** `three` adds ~150KB gzipped. `@tresjs/nuxt` adds ~15KB. This is the first WebGL dependency in the project.
- **SSR/SSG:** `@tresjs/nuxt` handles client-only rendering automatically. No hydration mismatch risk.
- **Performance:** Single full-screen quad with one texture sample per fragment. Minimal GPU load. The TresCanvas only mounts when the lens is open (`v-if`).

## Acceptance Criteria

- [ ] Clicking a strait circle opens the lens overlay with a 4x-zoomed view centered on that strait
- [ ] The zoomed image correctly centers on each of the 6 straits (verify all 6)
- [ ] Lens circle is 90vh x 90vh, perfectly circular, centered in viewport
- [ ] Dark backdrop at ~70% opacity covers the rest of the viewport
- [ ] GSAP animation: lens scales from 0 to 1, backdrop fades in (~500ms)
- [ ] Close via: (a) backdrop click, (b) close button, (c) Escape key
- [ ] Close animation: lens scales to 0, backdrop fades out (~400ms)
- [ ] Edge straits (Hormuz, Bab el-Mandeb) do not show black/empty areas beyond the texture
- [ ] `display: contents` on `.straits-infographic` is unchanged
- [ ] No grid layout breakage -- the map renders identically when lens is closed
- [ ] `prefers-reduced-motion` skips animations
- [ ] Focus returns to the clicked circle element after closing the lens
- [ ] Build succeeds (`nuxt generate`) with no SSR errors

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| TresJS SSR hydration issues | `@tresjs/nuxt` handles client-only rendering; `v-if` ensures TresCanvas only mounts when needed |
| Grid breakage (BF-77 repeat) | `<Teleport to="body">` + `position: fixed` -- lens is entirely outside the grid DOM |
| Texture not loading in shader | Fallback: show a CSS `background-image` with `transform: scale(4)` if WebGL unavailable |
| Three.js bundle size (~150KB gz) | Acceptable for a WebGL feature; tree-shaking via `@tresjs/nuxt` keeps it minimal |

## Out of Scope

- Barrel distortion / lens warp shader (separate ticket)
- Chromatic aberration and rim darkening effects
- Particle flow animation inside the lens
- Info panel overlay on the lens
- Year slider / metric toggle while zoomed
- Mobile card-stack alternative
- SVG circle overlay on the zoomed view

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md](../brainstorms/2026-03-04-circle-lens-straits-brainstorm.md) -- established the circle-to-lens interaction model, Teleport-based architecture, and GSAP animation approach
- **Full spec:** [_process/3d-lens-distortion-zoom-spec.md](../../_process/3d-lens-distortion-zoom-spec.md) -- shader code, animation timeline, component tree, data flow
- **BF-77 revert:** Previous implementation broke the grid; this plan avoids that by keeping the lens entirely outside the DOM via Teleport
- **TresJS docs:** `@tresjs/nuxt` module for Nuxt integration; `useLoader` for texture loading; declarative `TresShaderMaterial` for custom shaders
