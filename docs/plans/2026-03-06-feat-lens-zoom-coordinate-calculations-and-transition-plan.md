---
title: "feat: Lens zoom coordinate calculations and map-to-lens transition"
type: feat
status: active
date: 2026-03-06
linear: BF-85
origin: docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md
spec: _process/3d-lens-distortion-zoom-spec.md
deepened: 2026-03-06
---

# Lens Zoom: Coordinate Calculations and Map-to-Lens Transition

## Enhancement Summary

**Deepened on:** 2026-03-06
**Sections enhanced:** 7 (Phases 1-7)
**Research sources:** TresJS v5 docs, Three.js ShaderMaterial docs, GSAP Vue 3 cleanup patterns, WebGL lens/UV clamping techniques, WCAG 2.1 dialog accessibility, Vue 3 Teleport focus-trap patterns

### Key Improvements
1. Updated UV coordinate table to match actual `straits.json` data (posX/posY values had drifted from plan)
2. Added GSAP `gsap.context()` cleanup pattern to prevent memory leaks on unmount
3. Identified TresJS v5 `useTexture` migration (moved to `@tresjs/cientos`) and reactive state API changes
4. Added concrete focus-trap implementation guidance with `focusableSelector` and tab-wrapping
5. Discovered GLSL shader needs `smoothstep` anti-aliasing at circle edge to avoid jagged discard boundary

### New Considerations Discovered
- TresJS v5 changed `useLoader` to return reactive `{ state, isLoading }` instead of a Promise -- plan code must be updated
- The `@tresjs/nuxt` module supports GLSL imports via `vite-plugin-glsl` -- shaders should be extracted to `.glsl` files
- Uniform objects must NOT be recreated on every reactive update; mutate `.value` properties in-place to avoid GPU re-compilation
- The plan's UV table was based on old posX/posY values; actual data places straits differently (e.g., Malacca at 55/62, not 60.1/56.8)
- Missing reference files: `_process/3d-lens-distortion-zoom-spec.md` and `docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md` do not exist in the BF-85 worktree

---

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

#### Research Insights

**TresJS v5 Breaking Changes:**
- `useTexture` has been removed from `@tresjs/core` and moved to `@tresjs/cientos`. If using `useTexture`, add `@tresjs/cientos` as a dependency. Alternatively, use `useLoader(TextureLoader, url)` from core which remains available.
- `useLoader` now returns reactive state `{ state, isLoading, error }` instead of a raw Promise. Code must destructure accordingly.
- Event naming changed: `@render` replaces `@after-render`, `@before-loop` replaces `@before-render`.

**GLSL Shader File Support:**
- `@tresjs/nuxt` bundles `vite-plugin-glsl` which allows importing `.glsl`, `.vert`, `.frag` files as strings. Enable in nuxt config if not auto-enabled. This is preferable to inline template strings for syntax highlighting and editor support.

**Bundle Size Consideration:**
- `three` adds ~150KB gzipped. Since TresCanvas only mounts when the lens is open (`v-if`), the Three.js chunk can be code-split via dynamic import. Verify that Nuxt's automatic code-splitting handles this correctly with `@tresjs/nuxt`.

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

**Verification against actual strait data (from `data/straits/straits.json`):**

| Strait | posX | posY | uCenter.x | uCenter.y |
|--------|------|------|-----------|-----------|
| Malacca | 55 | 62 | 0.550 | 0.380 |
| Taiwan | 68 | 38 | 0.680 | 0.620 |
| Bab el-Mandeb | 20 | 55 | 0.200 | 0.450 |
| Luzon | 72 | 48 | 0.720 | 0.520 |
| Lombok | 60 | 72 | 0.600 | 0.280 |
| Hormuz | 25 | 42 | 0.250 | 0.580 |

**Edge clamping concern:** At 4x zoom, the visible UV window is `1/4 = 0.25` wide (0.125 on each side of center). Bab el-Mandeb (uCenter.x = 0.200) means the left edge of the zoomed view would be at `0.200 - 0.125 = 0.075` -- within bounds. Hormuz (uCenter.x = 0.250) would be at `0.250 - 0.125 = 0.125` -- also within bounds. The shader must use `clamp(uv, 0.0, 1.0)` and the Three.js texture must use `ClampToEdgeWrapping` (the default).

#### Research Insights

**UV Coordinate Edge Cases:**
- `ClampToEdgeWrapping` is the Three.js default for `wrapS`/`wrapT`, so no explicit setting is needed unless it has been changed elsewhere. However, explicitly setting it provides defense-in-depth.
- For edge straits, consider adding a subtle vignette or darkening near the clamp boundary so users perceive a natural edge rather than a hard color repeat. This can be done in the fragment shader with a `smoothstep` falloff based on UV distance from the [0,1] range.

**Aspect Ratio Correction:**
- The satellite image (`map-indo-pacific-2x.webp`) has a natural aspect ratio of 2400x1350 (16:9). The lens circle is square (90vh x 90vh). The shader's UV mapping must account for this mismatch -- the quad fills the circular viewport, but the texture aspect ratio means the zoom window is not square in texture space. The zoom factor should be applied uniformly in both axes to avoid stretching, meaning the zoomed window will be rectangular in texture coordinates even though the viewport is circular. This is correct behavior (geographic proportions preserved).

**Testing Strategy:**
- Create a visual regression check for all 6 straits: capture the lens view for each and verify the geographic center is correct. This can be done manually by comparing against the satellite image at known coordinates.

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

#### Research Insights

**Vue Component Data Flow Best Practices:**
- The `selectedStrait` ref correctly follows "props down, events up" pattern. The parent owns the state and passes it as a prop.
- Consider using `shallowRef` instead of `ref` for `selectedStrait` since the strait object is a plain data record that does not need deep reactivity. This avoids unnecessary deep proxy wrapping of the entire strait data object.
- The existing `defineEmits` on `StraitsInfographic.vue` currently re-emits `select-strait` upward. When adding `selectedStrait` state, the re-emit should be removed (the component now consumes the event internally). The plan already accounts for this.

**Race Condition Prevention:**
- If a user clicks a different strait while the close animation is playing, the new `selectedStrait` value will trigger `v-if` to unmount/remount `StraitLensZoom`. The close animation's `onComplete` callback will call `emit('close')` on a now-unmounted component instance. This is harmless in Vue (emitting on an unmounted component is a no-op), but the GSAP timeline should be killed in `onUnmounted` to prevent the orphaned callback. The Phase 6 cleanup handles this.

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

#### Research Insights

**Critical: Do NOT recreate uniform objects reactively.**
The `computed` wrapper shown above will create new uniform objects on every dependency change, which forces Three.js to recompile the shader program on the GPU. Instead, create the uniforms object once and mutate the `.value` properties:

```ts
// CORRECT: Create once, mutate values
const uniforms = {
  uMap: { value: null },       // set after texture loads
  uCenter: { value: new Vector2() },
  uZoom: { value: 4.0 },
}

// When strait changes, update in place:
watch(() => props.strait, (strait) => {
  const uv = straitToUV(strait.posX, strait.posY)
  uniforms.uCenter.value.set(uv.x, uv.y)
}, { immediate: true })
```

**TresJS v5 Texture Loading Pattern:**
```ts
import { TextureLoader, ClampToEdgeWrapping } from 'three'
import { useLoader } from '@tresjs/core'

const { state: texture, isLoading } = useLoader(TextureLoader, '/assets/map-indo-pacific-2x.webp')

// Set wrapping after load
watch(texture, (tex) => {
  if (tex) {
    tex.wrapS = ClampToEdgeWrapping
    tex.wrapT = ClampToEdgeWrapping
    uniforms.uMap.value = tex
  }
})
```

**Anti-aliased Circle Edge:**
The hard `if (dist > 1.0) discard;` produces jagged edges on the circle boundary. Use `smoothstep` for anti-aliasing:

```glsl
float alpha = 1.0 - smoothstep(0.99, 1.0, dist);
gl_FragColor = vec4(texture2D(uMap, uv).rgb, alpha);
```
This requires setting `transparent: true` on the ShaderMaterial.

**GLSL File Extraction:**
Since `@tresjs/nuxt` supports GLSL imports via `vite-plugin-glsl`, consider extracting shaders to separate files (`shaders/lens-zoom.vert`, `shaders/lens-zoom.frag`) for better editor support (syntax highlighting, linting). This is optional but recommended for maintainability as the shader grows more complex in future tickets.

**Orthographic Camera Setup:**
The `TresOrthographicCamera` with `:position="[0, 0, 1]"` needs explicit frustum bounds for a full-screen quad. Set `:left="-1"`, `:right="1"`, `:top="1"`, `:bottom="-1"`, `:near="0"`, `:far="2"` to ensure the 2x2 plane geometry fills the viewport exactly.

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

#### Research Insights

**Viewport Unit Edge Cases:**
- `90vh` on mobile Safari does not account for the address bar. Consider using `90dvh` (dynamic viewport height) with a fallback: `height: 90vh; height: 90dvh;`. Since this is a desktop-first infographic, `vh` is acceptable but `dvh` is more robust.
- On very wide viewports (ultrawide monitors), `90vh` may exceed the viewport width. Add `max-width: 90vw` as a safeguard: `width: min(90vh, 90vw); height: min(90vh, 90vw);`.

**Close Button Styling:**
- The close button should have minimum touch target of 44x44px (WCAG 2.5.8).
- Use the project's existing `--color-text-muted` and `--color-card-bg` tokens for consistency.
- Add `font-size: 2rem; line-height: 1; background: rgba(0,0,0,0.5); border: none; color: white; width: 3rem; height: 3rem; border-radius: 50%; cursor: pointer;` for a clear, accessible close affordance.

**Body Scroll Lock:**
- When the lens overlay is open, the body should not scroll (relevant on pages with scrollable layouts like `layout-home`). Add `document.body.style.overflow = 'hidden'` on mount, restore on unmount. This prevents background scrolling while the modal is active.

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

#### Research Insights

**GSAP Cleanup with `gsap.context()` (Critical for Memory Safety):**
The plan must use `gsap.context()` to ensure all GSAP timelines and tweens are properly killed on component unmount. Without this, orphaned timelines can cause memory leaks and ghost callbacks:

```ts
let ctx: gsap.Context

onMounted(() => {
  ctx = gsap.context(() => {
    // All GSAP animations created inside this callback
    // are automatically tracked and cleaned up
    const tl = gsap.timeline()
    tl.fromTo(backdropRef.value, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.inOut' })
    tl.fromTo(lensCircleRef.value, { scale: 0 }, { scale: 1, duration: 0.5, ease: 'power2.out' }, 0)
  })
})

onUnmounted(() => {
  ctx?.revert()  // Kills ALL animations, reverts inline styles
})
```

**Close Animation Race Condition:**
If the component is unmounted (e.g., user clicks a different strait) while the close animation is running, `ctx.revert()` in `onUnmounted` will kill the in-flight timeline cleanly. The `onComplete` callback will never fire, but that is correct because the parent already set `selectedStrait = null` (or to a new value), which caused the unmount.

**Reduced Motion Pattern:**
```ts
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// In open animation:
if (prefersReducedMotion) {
  gsap.set(backdropRef.value, { opacity: 1 })
  gsap.set(lensCircleRef.value, { scale: 1 })
} else {
  // ... timeline animation
}
```

**Animation Origin:**
The `scale: 0` to `scale: 1` animation defaults to scaling from the element's center, which is correct for a centered lens circle. However, explicitly set `transformOrigin: '50% 50%'` on the `.lens-circle` element to be defensive against CSS that might change this.

### Phase 7: Keyboard and Focus Management

- Trap focus inside `.lens-overlay` while open
- Close on Escape key
- Return focus to the clicked circle on close
- `aria-modal="true"` on the overlay
- `role="dialog"` with `aria-label="Zoomed view of [strait name]"`

#### Research Insights

**Focus Trap Implementation (Concrete Pattern):**
A focus trap must cycle Tab/Shift+Tab within the modal. For this component, there are only two focusable elements: the close button and potentially the TresCanvas. In practice, the close button is the only interactive element.

```ts
const overlayRef = ref<HTMLElement>()

function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return

  const focusable = overlayRef.value?.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (!focusable?.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
```

**Focus Return Strategy:**
The `StraitMap.vue` circles use SVG `<g>` elements with `tabindex="0"`. Store a reference to `document.activeElement` before the lens opens, then restore focus on close:

```ts
let previouslyFocusedElement: HTMLElement | null = null

onMounted(() => {
  previouslyFocusedElement = document.activeElement as HTMLElement
  // ... open animation, then focus the close button
  nextTick(() => {
    closeButtonRef.value?.focus()
  })
})

// In close handler:
function close() {
  // ... close animation onComplete:
  previouslyFocusedElement?.focus()
  emit('close')
}
```

**ARIA Attributes:**
```html
<div
  ref="overlayRef"
  class="lens-overlay"
  role="dialog"
  aria-modal="true"
  :aria-label="`Zoomed view of ${strait.name}`"
  tabindex="-1"
  @keydown.esc="close"
  @keydown="trapFocus"
>
```
Setting `tabindex="-1"` on the dialog container allows it to receive programmatic focus without being in the tab order.

**Screen Reader Announcement:**
When the lens opens, screen readers should announce the dialog. Setting focus to the close button (which has `aria-label="Close zoom"`) provides an immediate orientation point. Alternatively, focus the dialog itself and let `aria-label` announce "Zoomed view of Strait of Malacca".

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

### Research Insights: System-Wide

**Code Splitting:**
- Because `StraitLensZoom` is conditionally rendered with `v-if`, Nuxt should automatically code-split the Three.js dependency into a separate chunk that only loads when the lens is first opened. Verify this by checking the build output for a separate chunk containing `three`. If Nuxt does not split it automatically (because `@tresjs/nuxt` is a module, not a lazy component), consider using `defineAsyncComponent` for `StraitLensZoom`:
```ts
const StraitLensZoom = defineAsyncComponent(() => import('~/components/StraitLensZoom.vue'))
```

**WebGL Context Limits:**
- Browsers limit the number of simultaneous WebGL contexts (typically 8-16). Since the TresCanvas mounts/unmounts with `v-if`, this is not a concern for this feature. However, if future tickets add multiple simultaneous canvases, this could become an issue.

**Static Site Generation:**
- `nuxt generate` must succeed with `@tresjs/nuxt`. The module handles SSR by wrapping TresCanvas in `<ClientOnly>`. Verify that the generated HTML contains the placeholder/fallback content and that the canvas initializes correctly on client hydration.

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
- [ ] Circle edge in shader is anti-aliased (no jagged boundary)
- [ ] GSAP context is properly cleaned up on component unmount (no console warnings)
- [ ] Body scroll is locked while lens overlay is open

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| TresJS SSR hydration issues | `@tresjs/nuxt` handles client-only rendering; `v-if` ensures TresCanvas only mounts when needed |
| Grid breakage (BF-77 repeat) | `<Teleport to="body">` + `position: fixed` -- lens is entirely outside the grid DOM |
| Texture not loading in shader | Fallback: show a CSS `background-image` with `transform: scale(4)` if WebGL unavailable |
| Three.js bundle size (~150KB gz) | Acceptable for a WebGL feature; tree-shaking via `@tresjs/nuxt` keeps it minimal; code-split with `defineAsyncComponent` if needed |
| Uniform object recreation causes GPU recompilation | Create uniforms once, mutate `.value` in-place via `watch` |
| TresJS v5 API changes vs plan code | Use reactive `{ state, isLoading }` return from `useLoader`, not Promise-based pattern |
| Missing reference files in worktree | `_process/3d-lens-distortion-zoom-spec.md` and brainstorm doc do not exist in BF-85 worktree; may need to copy from main repo or remove references |
| GSAP memory leak on rapid open/close | Use `gsap.context()` with `ctx.revert()` in `onUnmounted` |
| Circle edge jaggies | Use `smoothstep` anti-aliasing in fragment shader instead of hard `discard` |
| Ultrawide monitors: lens exceeds viewport width | Use `min(90vh, 90vw)` for lens dimensions |

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
- **TresJS v5 announcement:** [tresjs.org/blog/tresjs-v5](https://tresjs.org/blog/tresjs-v5) -- breaking changes and migration guide
- **TresJS TresCanvas docs:** [docs.tresjs.org/api/components/tres-canvas](https://docs.tresjs.org/api/components/tres-canvas/)
- **GSAP Framework Integration:** [gsap.com/resources/frameworks](https://gsap.com/resources/frameworks/) -- Vue cleanup patterns with `gsap.context()`
- **Vue Focus Trap Pattern:** [telerik.com/blogs/how-to-trap-focus-modal-vue-3](https://www.telerik.com/blogs/how-to-trap-focus-modal-vue-3)
- **WebGL Lens Effect with SDFs:** [tympanus.net/codrops/2024/06/12/shape-lens-blur-effect-with-sdfs-and-webgl](https://tympanus.net/codrops/2024/06/12/shape-lens-blur-effect-with-sdfs-and-webgl/)
- **Three.js ShaderMaterial docs:** [threejs.org/docs/pages/ShaderMaterial.html](https://threejs.org/docs/pages/ShaderMaterial.html)
