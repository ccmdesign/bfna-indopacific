---
title: "feat: GSAP circle-to-lens transition"
type: feat
status: active
date: 2026-03-06
deepened: 2026-03-06
origin: docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md
linear: BF-77
---

# feat: GSAP circle-to-lens transition

## Enhancement Summary

**Deepened on:** 2026-03-06
**Sections enhanced:** 9
**Research sources used:** GSAP official docs (Context7), Nuxt 4 docs (Context7), GSAP community forums, WAI-ARIA APG, Vue 3 accessibility guides, motion design principles (Emil Kowalski / Jakub Krehel), web search (2025-2026)

### Key Improvements
1. Replaced custom `useReducedMotion` with GSAP's built-in `gsap.matchMedia()` for proper automatic cleanup and dynamic toggling
2. Added concrete focus-trap implementation strategy using `useFocusTrap` from VueUse instead of manual Tab-key handling
3. Identified critical `getBoundingClientRect` reliability risk on SVG elements during GSAP transforms and added mitigation (cache rects before animation, use `svgOrigin`)
4. Added `<Teleport to="body">` for StraitLens to prevent stacking context and z-index issues in embed layouts
5. Specified `gsap.context()` for animation scoping and cleanup, replacing raw `timeline.kill()`

### New Considerations Discovered
- SVG `getBoundingClientRect()` returns values in screen coordinates, which drift when parent containers use `object-fit: cover` with `preserveAspectRatio="slice"` -- rect calculations must account for the SVG-to-viewport mapping
- `v-if` + GSAP `fromTo` race: the lens DOM node does not exist when `open()` fires; `nextTick` alone is insufficient in Nuxt SSR hydration edge cases -- `watch` with `flush: 'post'` is required
- The embed layout's `::before` / `::after` pseudo-elements use `mix-blend-mode: color` and `z-index: 10`, which will visually interfere with the lens overlay unless the lens is teleported to `<body>` or given `z-index: 100`

---

## Overview

Implement the animated transition between the Overview State (proportional circles on the satellite map) and the Lens State (zoomed-in view of a single strait). Clicking a circle triggers a GSAP timeline that fades out sibling circles, scales the selected circle to fill the viewport, and cross-fades into a lens view containing a `<canvas>` placeholder and an info panel skeleton. The reverse transition returns to the overview. This is the **Transition Animation** described in the brainstorm (see brainstorm: `docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md` -- "Transition Animation" and "Lens State" sections).

## Problem Statement / Motivation

The overview map (BF-76) is complete: six SVG circles render on a satellite image, each emitting a `select-strait` event on click. However, nothing currently consumes that event. The brainstorm establishes the circle-to-lens transition as the core interaction -- clicking a circle should create a focused, immersive view of the selected strait (see brainstorm: "Why This Approach"). Without this transition, the infographic is a static map with no drill-down capability.

## Proposed Solution

Build a GSAP-powered transition system with three new artifacts:

1. **`composables/useStraitTransition.ts`** -- Encapsulates the GSAP timeline construction, forward/reverse playback, and cleanup. Keeps animation logic out of components.
2. **`components/StraitLens.vue`** -- The lens view: a full-viewport overlay with a `<canvas>` element (placeholder for future particle system, BF-78), a zoomed satellite background crop, an info panel skeleton, and a close button.
3. **Modifications to `components/infographics/StraitsInfographic.vue`** -- Becomes the state coordinator: holds `selectedStrait` ref, renders both `StraitMap` and `StraitLens`, and wires the transition composable.

## Technical Approach

### Architecture

```
pages/infographics/straits.vue              (unchanged)
pages/embed/straits.vue                     (unchanged)
components/infographics/StraitsInfographic.vue  <- MODIFY: state coordinator
components/StraitMap.vue                     <- MODIFY: expose circle refs, add data-strait-id
components/StraitLens.vue                    <- NEW: lens view shell
composables/useStraitTransition.ts           <- NEW: GSAP timeline composable
types/strait.ts                              <- MINOR: add StraitTransitionState type
```

### State Management

`StraitsInfographic.vue` manages a reactive `selectedStrait` ref:

```ts
// components/infographics/StraitsInfographic.vue
const selectedStrait = ref<Strait | null>(null)
const isTransitioning = ref(false)

function onSelectStrait(id: string) {
  if (isTransitioning.value) return // prevent double-click during animation
  const strait = straits.find(s => s.id === id) ?? null
  selectedStrait.value = strait
}

function onCloseLens() {
  selectedStrait.value = null
}
```

The transition composable watches `selectedStrait` and drives the GSAP timeline accordingly.

### Transition Composable: `useStraitTransition.ts`

**Responsibilities:**
- Build a `gsap.timeline()` for the forward transition (overview -> lens)
- Provide a `reverse()` method for the backward transition (lens -> overview)
- Accept DOM ref targets for: circle groups, selected circle, lens container, map background
- Handle `prefers-reduced-motion` via `gsap.matchMedia()` (not a custom composable)
- Clean up timeline on component unmount via `gsap.context()` and `onUnmounted`

**GSAP Timeline Sequence (forward, ~0.7s total):**

| Step | Target | Property | From | To | Duration | Offset |
|------|--------|----------|------|----|----------|--------|
| 1 | Non-selected circle groups | opacity | 1 | 0 | 0.25s | 0 |
| 1 | Non-selected labels | opacity | 1 | 0 | 0.25s | 0 |
| 2 | Selected circle | scale, x, y | current | fill viewport | 0.4s | 0.15s |
| 2 | Selected circle | opacity | 1 | 0 | 0.15s | 0.4s |
| 3 | Lens container | opacity | 0 | 1 | 0.3s | 0.35s |
| 3 | Lens container | scale | 0.95 | 1 | 0.3s | 0.35s |

**Ease:** `power2.out` (GSAP's equivalent of ease-out, smooth deceleration)

**Reverse:** `timeline.reverse()` -- GSAP natively reverses the entire sequence.

### Research Insights: Transition Composable

**Best Practices (GSAP Official Docs + Community):**

- **Use `gsap.context()` for cleanup** instead of manually calling `timeline.kill()`. A GSAP context automatically reverts all animations and ScrollTriggers created within it when `ctx.revert()` is called. This is the recommended pattern for framework integrations:
  ```ts
  const ctx = gsap.context(() => {
    // all timelines created here are auto-tracked
    timeline = gsap.timeline({ ... })
  }, scopeElement) // optional scope for selector strings

  onUnmounted(() => ctx.revert())
  ```

- **Use `gsap.matchMedia()` for reduced motion** instead of a custom `useReducedMotion` composable. GSAP's `matchMedia` automatically reverts animations when conditions change (e.g., user toggles reduced motion in system settings mid-session), which a manual `ref`-based approach does not handle:
  ```ts
  const mm = gsap.matchMedia()

  mm.add({
    isMotionOk: '(prefers-reduced-motion: no-preference)',
    isReduced: '(prefers-reduced-motion: reduce)',
  }, (context) => {
    const { isReduced } = context.conditions!
    if (isReduced) {
      // instant opacity swap, no motion
    } else {
      // full GSAP timeline
    }
    return () => { /* cleanup on condition change */ }
  })
  ```

- **Cache `getBoundingClientRect()` values before starting the timeline.** GSAP transforms modify the element's position, so calling `getBoundingClientRect()` mid-animation returns transformed (incorrect) values. Capture all geometry in the `open()` function before any `gsap.to()` calls.

**Performance Considerations:**

- Animate only `transform` and `opacity` properties -- these are GPU-composited and do not trigger layout or paint. The plan's timeline already follows this rule.
- Set `will-change: transform, opacity` on `.strait-circle-group` and `.lens-backdrop` elements via CSS to hint the browser to promote them to compositor layers. Remove after animation completes to free GPU memory.
- For the selected circle scale-up, use GSAP's `svgOrigin` property instead of CSS `transformOrigin` on SVG elements. CSS `transform-origin` on SVG `<g>` elements is inconsistent across browsers; `svgOrigin` uses SVG-global coordinates and is reliable:
  ```ts
  timeline.to(selected, {
    svgOrigin: `${cx} ${cy}`, // SVG canvas coordinates, not screen pixels
    scale: scaleFactor,
    duration: 0.4,
  }, 0.15)
  ```

**Edge Cases:**

- **`getBoundingClientRect()` on SVG with `preserveAspectRatio="slice"`:** The SVG overlay uses `xMidYMid slice`, which means the SVG viewBox is clipped. `getBoundingClientRect()` returns screen coordinates that include the clipped/offset area. The scale calculation must use the SVG's own coordinate system (viewBox units) rather than screen pixels. Convert using `svg.getScreenCTM()`:
  ```ts
  const svg = targets.circleOverlay.value
  const ctm = svg?.getScreenCTM()
  if (ctm) {
    // Convert viewBox coords to screen coords using the CTM
    const point = svg.createSVGPoint()
    point.x = circleData.cx // viewBox coordinates
    point.y = circleData.cy
    const screenPoint = point.matrixTransform(ctm)
  }
  ```

- **Resize during animation:** If the user resizes the browser during the transition, cached `getBoundingClientRect` values become stale. Add a `ResizeObserver` that calls `timeline.kill()` and resets state if a resize occurs during `isAnimating`.

- **GSAP + Nuxt SSR:** GSAP internally references `window` and `document`. In Nuxt, wrap all GSAP usage inside `onMounted()` or guard with `import.meta.client`. The composable should not call `gsap.timeline()` or `gsap.matchMedia()` at the top level -- only inside lifecycle hooks or functions called after mount.

**Composable Sketch (revised):**

```ts
// composables/useStraitTransition.ts
import { gsap } from 'gsap'
import type { Ref } from 'vue'

interface TransitionTargets {
  mapContainer: Ref<HTMLElement | null>
  circleOverlay: Ref<SVGSVGElement | null>
  lensContainer: Ref<HTMLElement | null>
  selectedStraitId: Ref<string | null>
}

export function useStraitTransition(targets: TransitionTargets) {
  let ctx: gsap.Context | null = null
  let timeline: gsap.core.Timeline | null = null
  let mm: gsap.MatchMedia | null = null
  const isAnimating = ref(false)

  // Store the element that triggered the open for focus restoration
  const triggerElement = ref<Element | null>(null)

  function open(straitId: string, straitData: { cx: number; cy: number }) {
    if (isAnimating.value || !import.meta.client) return

    triggerElement.value = document.activeElement

    const circleGroups = targets.circleOverlay.value
      ?.querySelectorAll('.strait-circle-group')
    if (!circleGroups) return

    const selected = targets.circleOverlay.value
      ?.querySelector(`[data-strait-id="${straitId}"]`)
    const others = Array.from(circleGroups)
      .filter(g => g.getAttribute('data-strait-id') !== straitId)

    // Cache geometry BEFORE any GSAP transforms
    const viewportRect = targets.mapContainer.value?.getBoundingClientRect()
    const circleRect = (selected as Element)?.getBoundingClientRect()

    ctx = gsap.context(() => {
      mm = gsap.matchMedia()

      mm.add({
        isMotionOk: '(prefers-reduced-motion: no-preference)',
        isReduced: '(prefers-reduced-motion: reduce)',
      }, (context) => {
        const { isReduced } = context.conditions!

        if (isReduced) {
          gsap.set(others, { opacity: 0 })
          gsap.set(selected, { opacity: 0 })
          gsap.set(targets.lensContainer.value, { opacity: 1, scale: 1 })
          return
        }

        isAnimating.value = true
        timeline = gsap.timeline({
          defaults: { ease: 'power2.out' },
          onComplete: () => { isAnimating.value = false },
          onReverseComplete: () => {
            isAnimating.value = false
            // Restore focus to the circle that was clicked
            ;(triggerElement.value as HTMLElement)?.focus()
          },
        })

        // Step 1: Fade out non-selected circles
        timeline.to(others, { opacity: 0, duration: 0.25 }, 0)

        // Step 2: Scale + translate selected circle to viewport center
        if (viewportRect && circleRect) {
          const scaleX = viewportRect.width / circleRect.width
          const scaleY = viewportRect.height / circleRect.height
          const scaleFactor = Math.max(scaleX, scaleY)
          const dx = viewportRect.width / 2 - (circleRect.left - viewportRect.left + circleRect.width / 2)
          const dy = viewportRect.height / 2 - (circleRect.top - viewportRect.top + circleRect.height / 2)

          timeline.to(selected, {
            x: dx,
            y: dy,
            scale: scaleFactor,
            duration: 0.4,
            svgOrigin: `${straitData.cx} ${straitData.cy}`,
          }, 0.15)
        }

        // Step 2b: Fade out selected circle as lens fades in
        timeline.to(selected, { opacity: 0, duration: 0.15 }, 0.4)

        // Step 3: Cross-fade lens into view
        timeline.fromTo(
          targets.lensContainer.value,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.3 },
          0.35
        )
      })
    })
  }

  function close() {
    if (!import.meta.client) return

    // Check if reduced motion -- instant revert
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      gsap.set(targets.lensContainer.value, { opacity: 0 })
      targets.circleOverlay.value
        ?.querySelectorAll('.strait-circle-group')
        .forEach(el => gsap.set(el, { opacity: 1, scale: 1, x: 0, y: 0 }))
      ;(triggerElement.value as HTMLElement)?.focus()
      return
    }

    if (timeline) {
      isAnimating.value = true
      timeline.reverse()
    }
  }

  onUnmounted(() => {
    ctx?.revert() // kills all timelines, matchMedia, scrollTriggers in this context
  })

  return { open, close, isAnimating, triggerElement }
}
```

**Key design decision:** The composable operates on raw DOM refs via `querySelectorAll` rather than requiring each circle to be individually ref'd. This avoids coupling the composable to StraitMap's internal template structure -- it only needs the SVG root and a `data-strait-id` attribute on each circle group.

### StraitMap.vue Modifications

Minimal changes needed:

1. **Add `data-strait-id` attribute** to each circle `<g>` group for selector targeting:
   ```html
   <g ... :data-strait-id="strait.id">
   ```

2. **Expose the SVG element** via `defineExpose` or a template ref that the parent can access:
   ```ts
   const circleOverlay = ref<SVGSVGElement | null>(null)
   defineExpose({ circleOverlay })
   ```
   Alternatively, the parent can use a template ref on `<StraitMap ref="straitMapRef">` and access the SVG via `straitMapRef.value?.$el.querySelector('.circle-overlay')`.

3. **No other changes.** The existing `@click` -> `emit('select-strait', id)` event chain remains the trigger mechanism.

### Research Insights: StraitMap.vue

**Edge Cases:**

- **SVG `<g>` elements and `transform-origin`:** The existing circle groups are `<g>` elements containing `<circle>` and `<text>` children. GSAP's `transformOrigin: 'center center'` does not work reliably on SVG `<g>` elements across all browsers. Use `svgOrigin` with the circle's viewBox coordinates (`cx`, `cy`) instead. This requires passing the strait's `cx`/`cy` values from `mappedStraits` to the transition composable.

- **`defineExpose` in `<script setup>`:** In Vue 3.5+, `defineExpose` works correctly with `<script setup>`. The parent can access exposed properties via `straitMapRef.value?.circleOverlay`. However, the SVG element can also be accessed via `straitMapRef.value?.$el?.querySelector('.circle-overlay')` without `defineExpose`, since `StraitMap` has a single root element.

### StraitLens.vue Component

A new component rendering the lens view shell. The particle system (canvas animation) is out of scope for BF-77 -- the `<canvas>` is a placeholder.

```vue
<!-- components/StraitLens.vue (structure) -->
<script setup lang="ts">
import type { Strait } from '~/types/strait'

const props = defineProps<{
  strait: Strait
}>()

const emit = defineEmits<{
  close: []
}>()

const closeButtonRef = ref<HTMLButtonElement | null>(null)

// Close on Escape key
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

// Focus management: move focus to close button on mount
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  nextTick(() => {
    closeButtonRef.value?.focus()
  })
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

// Close when clicking the backdrop (outside content)
function onBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('lens-backdrop')) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="lens-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="`${strait.name} detail view`"
      @click="onBackdropClick"
    >
      <!-- Zoomed satellite background crop -->
      <div class="lens-bg" :style="lensBackgroundStyle" />

      <!-- Canvas placeholder for particle system (BF-78) -->
      <canvas class="lens-canvas" />

      <!-- Info panel skeleton -->
      <aside class="lens-info-panel">
        <h2>{{ strait.name }}</h2>
        <p class="lens-share-label">{{ strait.globalShareLabel }}</p>
        <p class="lens-description">{{ strait.description }}</p>

        <div v-if="strait.keyFacts.length" class="lens-facts">
          <h3>Key Facts</h3>
          <ul>
            <li v-for="fact in strait.keyFacts" :key="fact">{{ fact }}</li>
          </ul>
        </div>

        <div v-if="strait.threats.length" class="lens-threats">
          <h3>Threats</h3>
          <ul>
            <li v-for="threat in strait.threats" :key="threat">{{ threat }}</li>
          </ul>
        </div>
      </aside>

      <!-- Close button -->
      <button
        ref="closeButtonRef"
        class="lens-close-btn"
        aria-label="Close detail view"
        @click="emit('close')"
      >
        &times;
      </button>
    </div>
  </Teleport>
</template>
```

### Research Insights: StraitLens.vue

**Best Practices (WAI-ARIA APG, Vue 3 Accessibility Guides):**

- **Use `<Teleport to="body">`** to render the dialog at the document root. This prevents stacking context issues (the embed layout's `::before`/`::after` pseudo-elements have `z-index: 10` and `mix-blend-mode: color`, which would visually corrupt the lens overlay if it remains inside `.page-wrapper`). Teleporting also ensures consistent behavior in both `/infographics/straits` and `/embed/straits` routes.

- **Focus trap:** Instead of manually handling Tab/Shift+Tab key events (error-prone and incomplete), use `@vueuse/integrations/useFocusTrap` (wraps `focus-trap` library) or implement a lightweight trap:
  ```ts
  import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'

  const trapRef = ref<HTMLElement | null>(null)
  const { activate, deactivate } = useFocusTrap(trapRef, {
    immediate: true,
    escapeDeactivates: false, // we handle Escape ourselves
    allowOutsideClick: true, // backdrop click handled separately
  })

  onMounted(() => activate())
  onUnmounted(() => deactivate())
  ```
  If adding `@vueuse/integrations` + `focus-trap` as dependencies is undesirable, a minimal manual implementation is acceptable for this scope, but should be documented as tech debt for BF-78.

- **`aria-modal="true"`** eliminates the need to set `aria-hidden` on sibling DOM nodes, as screen readers should treat everything outside the dialog as inert. However, note that `aria-modal` support is inconsistent in older screen readers (NVDA < 2023). Adding `inert` attribute to the `.straits-infographic` container as a belt-and-suspenders approach is recommended:
  ```ts
  onMounted(() => {
    const parent = document.querySelector('.straits-infographic')
    parent?.setAttribute('inert', '')
  })
  onUnmounted(() => {
    const parent = document.querySelector('.straits-infographic')
    parent?.removeAttribute('inert')
  })
  ```

- **Emit signature:** Use the Vue 3.5+ tuple syntax `close: []` instead of the function signature `(e: 'close'): void` for `defineEmits`. This is the current recommended pattern.

**Motion Design Insights (Jakub Krehel perspective -- primary for this project type):**

- **Enter animation for info panel content:** After the lens container fades in, stagger-animate the info panel children (heading, share label, facts list) with a subtle `opacity: 0 -> 1` + `translateY: 8px -> 0` + `filter: blur(4px) -> blur(0)` at 0.1s stagger. This creates a polished "content settling" effect:
  ```ts
  // After lens fade-in completes (onComplete of step 3):
  gsap.from('.lens-info-panel > *', {
    opacity: 0,
    y: 8,
    filter: 'blur(4px)',
    duration: 0.35,
    stagger: 0.08,
    ease: 'power2.out',
  })
  ```

- **Exit should be subtler than enter.** The reverse timeline handles this naturally (GSAP's `reverse()` plays the same durations), but consider a slightly faster reverse with `timeline.reverse().timeScale(1.2)` for a snappier close feel.

- **Close button hover:** Add a subtle scale transition `transform: scale(1.1)` on hover, 150ms duration. Keep it minimal -- this is an informational visualization, not a playful app.

**Lens background:**

CSS `background-image` using the same satellite `.webp`, with `background-position` offset based on the strait's `posX`/`posY` and `background-size` scaled up to simulate a zoom crop. A computed style object calculates the position:

```ts
const lensBackgroundStyle = computed(() => ({
  backgroundImage: `url(/assets/map-indo-pacific-2x.webp)`,
  backgroundSize: '300%', // 3x zoom into the satellite image
  backgroundPosition: `${props.strait.posX}% ${props.strait.posY}%`,
}))
```

**Glassmorphism info panel styling:**

```css
.lens-info-panel {
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  width: 360px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 2rem;
  background: rgba(10, 22, 40, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Encode Sans', sans-serif;
}
```

### Research Insights: Glassmorphism Panel

**Performance Considerations:**

- `backdrop-filter: blur(16px)` is GPU-intensive. On low-end devices, the blur radius can cause frame drops during the lens enter animation. Consider reducing blur to `blur(12px)` or deferring the `backdrop-filter` application until after the transition completes (add it via a CSS class toggled in the timeline's `onComplete`).

- Test with Chrome DevTools "CPU 4x slowdown" to verify the combined GSAP animation + backdrop-filter does not drop below 30fps.

**Edge Cases:**

- **`-webkit-backdrop-filter` requirement:** Safari (including Safari on iOS, which is relevant for embed viewers) requires the `-webkit-` prefix as of 2025. The plan correctly includes it.

- **Scrollable info panel:** `max-height: 80vh` + `overflow-y: auto` is correct. Add `overscroll-behavior: contain` to prevent scroll chaining (the page scrolling when the panel scroll reaches its boundary).

### StraitsInfographic.vue Modifications

This component becomes the orchestrator:

```vue
<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import StraitMap from '~/components/StraitMap.vue'
import StraitLens from '~/components/StraitLens.vue'
import straitsData from '~/data/straits/straits.json'
import type { Strait } from '~/types/strait'
import { useStraitTransition } from '~/composables/useStraitTransition'

const straits = straitsData.straits as Strait[]

const selectedStrait = ref<Strait | null>(null)
const straitMapRef = ref<InstanceType<typeof StraitMap> | null>(null)
const mapContainer = ref<HTMLElement | null>(null)
const lensContainer = ref<HTMLElement | null>(null)

// Derive the SVG ref from StraitMap's exposed property
const circleOverlay = computed(() =>
  straitMapRef.value?.$el?.querySelector('.circle-overlay') as SVGSVGElement | null
)

const { open, close, isAnimating } = useStraitTransition({
  mapContainer,
  circleOverlay,
  lensContainer,
  selectedStraitId: computed(() => selectedStrait.value?.id ?? null),
})

function onSelectStrait(id: string) {
  if (isAnimating.value) return
  const strait = straits.find(s => s.id === id) ?? null
  if (!strait) return
  selectedStrait.value = strait

  // Use watch + flush: 'post' to wait for StraitLens to mount
  // before starting the GSAP timeline
}

// Watch for selectedStrait changes and trigger transition after DOM update
watch(selectedStrait, (newStrait) => {
  if (newStrait) {
    // Lens is now mounted (flush: 'post' ensures DOM update)
    // Pass viewBox coordinates for svgOrigin
    const mappedStrait = getMappedStrait(newStrait.id)
    if (mappedStrait) {
      open(newStrait.id, { cx: mappedStrait.cx, cy: mappedStrait.cy })
    }
  }
}, { flush: 'post' })

function onCloseLens() {
  close()
  // After reverse animation completes, clear selectedStrait
  // The composable's onReverseComplete callback handles focus restoration
  // Use a timeout matching the reverse duration to clear state
  setTimeout(() => {
    if (!isAnimating.value) {
      selectedStrait.value = null
    }
  }, 800) // slightly longer than animation duration as safety margin
}
</script>

<template>
  <div ref="mapContainer" class="straits-infographic">
    <StraitMap
      ref="straitMapRef"
      class="strait-map"
      @select-strait="onSelectStrait"
    />
    <StraitLens
      v-if="selectedStrait"
      ref="lensContainer"
      :strait="selectedStrait"
      @close="onCloseLens"
    />
  </div>
</template>
```

### Research Insights: StraitsInfographic.vue

**Race Condition: `v-if` + GSAP `fromTo` timing:**

The `v-if="selectedStrait"` on StraitLens means the lens DOM is only mounted when a strait is selected. The critical timing issue: `open()` calls `gsap.fromTo(targets.lensContainer.value, ...)`, but `lensContainer` ref is `null` until Vue's reactivity system processes the `selectedStrait` change and mounts the component.

**Solution:** Use `watch(selectedStrait, ..., { flush: 'post' })` to ensure the watcher fires *after* the DOM has been updated. This is more reliable than `nextTick()` in Nuxt because `nextTick` may fire before Nuxt's internal rendering pipeline completes (especially during hydration). The plan now uses this pattern.

**Alternative (simpler but with tradeoff):** Use `v-show` instead of `v-if`. The lens DOM always exists but is hidden. This eliminates the timing issue but means the canvas element (BF-78) is always in the DOM. For this ticket (placeholder canvas), `v-if` with `flush: 'post'` is the better choice. Revisit when BF-78 implements the particle system.

**`setTimeout` for state cleanup after reverse animation:** The `onReverseComplete` callback fires when the reverse animation finishes, but we need to clear `selectedStrait` to unmount StraitLens. Using a `setTimeout` is a pragmatic choice. A cleaner alternative is to have the composable accept a `onReverseComplete` callback:
```ts
const { open, close, isAnimating } = useStraitTransition({
  ...targets,
  onReverseComplete: () => { selectedStrait.value = null },
})
```

### Reduced Motion Handling

The composable uses `gsap.matchMedia()` with the `conditions` syntax:

```ts
mm.add({
  isMotionOk: '(prefers-reduced-motion: no-preference)',
  isReduced: '(prefers-reduced-motion: reduce)',
}, (context) => {
  const { isReduced } = context.conditions!
  // ... branch logic
})
```

When `prefers-reduced-motion: reduce` is active:
- Skip all GSAP tweens
- Instantly hide overview circles and show lens (opacity swap, no motion)
- Reverse: instantly show circles, hide lens
- The existing `@media (prefers-reduced-motion: reduce)` block in StraitMap.vue already disables CSS transitions

### Research Insights: Reduced Motion

**Why `gsap.matchMedia()` over a custom composable:**

1. **Auto-cleanup:** When the media query changes (user toggles reduced motion in OS settings), `gsap.matchMedia()` automatically reverts all animations created in the old condition and re-runs the matching condition's setup function. A manual `ref`-based approach would leave stale animations.
2. **Dynamic toggling:** If a future UI toggle for reduced motion is added (common accessibility pattern), `gsap.matchMediaRefresh()` instantly re-evaluates all conditions.
3. **No `window.matchMedia` SSR risk:** `gsap.matchMedia()` is SSR-safe when called inside `onMounted()` -- GSAP handles the server case internally.

### Exit Mechanisms

Three ways to close the lens (standard modal pattern):

1. **Close button (X)** -- top-right corner of the lens overlay, triggers `emit('close')`
2. **Backdrop click** -- clicking the `.lens-backdrop` area outside the info panel, detected via event target check
3. **Escape key** -- `keydown` listener on `document`, triggers `emit('close')`

All three funnel into the same `onCloseLens()` handler, which calls `close()` on the transition composable.

### Focus Management

When the lens opens:
- Move focus to the close button (via `closeButtonRef.value?.focus()` in `onMounted` + `nextTick`)
- Trap focus within the lens dialog (Tab should cycle within the lens, not escape to the overview behind it)
- Set `inert` attribute on `.straits-infographic` to prevent assistive technology from reaching background content

When the lens closes:
- Return focus to the circle that was clicked (stored in `triggerElement` ref before opening)
- Remove `inert` attribute from `.straits-infographic`

This follows the WAI-ARIA dialog pattern.

### Research Insights: Focus Management

**`inert` attribute vs `aria-hidden`:**

The `inert` attribute (now supported in all evergreen browsers as of 2023) is preferred over `aria-hidden="true"` on background content because `inert` also disables pointer events and tab navigation, not just screen reader access. This provides a complete "modal takeover" effect:

```ts
// In StraitsInfographic.vue or StraitLens.vue
onMounted(() => {
  const bg = document.querySelector('.straits-infographic')
  bg?.setAttribute('inert', '')
})
onUnmounted(() => {
  const bg = document.querySelector('.straits-infographic')
  bg?.removeAttribute('inert')
})
```

**Focus restoration timing:** When the reverse animation completes, the close button is about to be unmounted (because `selectedStrait` is set to `null`). Focus must be restored *before* the component unmounts. The composable's `onReverseComplete` callback should call `triggerElement.value?.focus()` before the parent clears `selectedStrait`.

## System-Wide Impact

- **Interaction graph:** Circle click -> `StraitsInfographic.onSelectStrait()` -> sets `selectedStrait` -> mounts `StraitLens` (via `v-if`) -> `watch` with `flush: 'post'` triggers `useStraitTransition.open()` -> GSAP timeline plays. Close button/backdrop/Escape -> `onCloseLens()` -> `useStraitTransition.close()` reverses timeline -> `onReverseComplete` restores focus -> clears `selectedStrait` -> unmounts `StraitLens`.
- **Error propagation:** GSAP timeline failures are non-fatal (the lens still renders, just without animation). Missing DOM refs are guarded with null checks.
- **State lifecycle risks:** The `v-if` on StraitLens means the canvas element is created/destroyed on each open/close. This is acceptable for this ticket; the particle system (BF-78) may switch to `v-show` if canvas initialization is expensive.
- **API surface parity:** The embed route (`/embed/straits`) renders `StraitsInfographic`, so the lens transition works identically in embeds. The `<Teleport to="body">` ensures the lens renders above the embed layout's pseudo-elements. The `role="dialog"` and focus trapping should work within iframes.
- **SSR compatibility:** GSAP must be imported only on client side. Wrap `gsap.context()` and `gsap.matchMedia()` creation inside `onMounted()`. Use `import.meta.client` guards for any standalone GSAP calls.

### Research Insights: System-Wide Impact

**Teleport in SSR context:** `<Teleport to="body">` is SSR-safe in Nuxt -- the teleported content is rendered inline during SSR and moved to `<body>` on hydration. No special handling needed.

**Embed iframe considerations:** When the lens is shown inside an `/embed/straits` iframe:
- Escape key works normally (keydown events fire within the iframe)
- `<Teleport to="body">` targets the iframe's `<body>`, not the parent page's -- this is correct behavior
- The `100vh` sizing of the lens backdrop should use `100dvh` (dynamic viewport height) to account for mobile browser chrome in iOS Safari embeds

## Acceptance Criteria

### Functional Requirements

- [ ] Clicking a circle triggers the forward GSAP transition:
  - [ ] Non-selected circles fade out (opacity -> 0)
  - [ ] Selected circle scales and translates to fill the viewport
  - [ ] Lens view cross-fades in with canvas and info panel
- [ ] Lens -> Overview: clicking close button, backdrop, or pressing Escape reverses the timeline
- [ ] Total transition duration is ~0.6-0.8s with ease-out easing
- [ ] Lens view renders a `<canvas>` element (placeholder; particle animation is BF-78)
- [ ] Lens background shows a zoomed crop of the satellite image centered on the selected strait
- [ ] Info panel displays strait name, globalShareLabel, description, key facts, and threats
- [ ] Double-clicking during transition does not trigger a second animation

### Non-Functional Requirements

- [ ] `prefers-reduced-motion: reduce` skips all GSAP animations (instant show/hide) via `gsap.matchMedia()`
- [ ] Lens dialog has `role="dialog"`, `aria-modal="true"`, and a descriptive `aria-label`
- [ ] Focus moves to close button when lens opens; returns to clicked circle when lens closes
- [ ] Focus is trapped within the lens dialog while open
- [ ] Background content is marked `inert` while lens is open
- [ ] Escape key closes the lens
- [ ] GSAP context is reverted on component unmount (no memory leaks)
- [ ] SSR-safe: no `window` or `document` access outside `onMounted` / `import.meta.client` guards
- [ ] Lens uses `<Teleport to="body">` to avoid stacking context issues

### Quality Gates

- [ ] Transition plays smoothly at 60fps on a mid-range device (test in Chrome DevTools Performance tab with 4x CPU throttle)
- [ ] No layout shift or flash of unstyled content during transition
- [ ] Works in both `/infographics/straits` and `/embed/straits` routes
- [ ] `backdrop-filter` does not cause visible frame drops during transition (test on Safari)
- [ ] Keyboard-only navigation works: Tab through circles, Enter to open, Tab within lens, Escape to close

## Implementation Phases

### Phase 1: Foundation (composable + data attributes)

**Files:**
- `composables/useStraitTransition.ts` -- create
- `components/StraitMap.vue` -- add `data-strait-id` to circle groups, expose SVG ref

**Deliverable:** Composable exists with `open()` / `close()` / `isAnimating` API. Forward timeline animates circle groups using `gsap.context()` and `gsap.matchMedia()`. No lens view yet (animation targets empty).

**Estimated effort:** ~1-2 hours

### Phase 2: Lens View Shell

**Files:**
- `components/StraitLens.vue` -- create (with `<Teleport to="body">`)
- `types/strait.ts` -- (optional) add helper types if needed

**Deliverable:** Static lens component renders strait data. Close button and Escape key work. Glassmorphism panel styled. Canvas placeholder present. Focus management wired (auto-focus close button, `inert` on background). No transition wiring yet.

**Estimated effort:** ~1-2 hours

### Phase 3: Wire It Together

**Files:**
- `components/infographics/StraitsInfographic.vue` -- rewrite to coordinate state + transition
- `composables/useStraitTransition.ts` -- finalize with lens container targeting

**Deliverable:** Full open/close cycle works. Click circle -> transition -> lens -> close -> reverse transition -> overview. Focus management wired. Reduced motion path tested. `watch` with `flush: 'post'` ensures correct timing.

**Estimated effort:** ~2-3 hours

### Phase 4: Polish

- Fine-tune timing, easing, and scale factors
- Add info panel content stagger animation (opacity + translateY + blur)
- Test at multiple viewports (1920x1080, 1440x900, embed sizes)
- Test `backdrop-filter` performance on Safari
- Verify accessibility (screen reader, keyboard-only, reduced motion)
- Verify SSR/SSG compatibility (`nuxt generate` succeeds)
- Add `will-change` hints and verify GPU layer promotion
- Test resize behavior during animation

**Estimated effort:** ~1-2 hours

## Alternative Approaches Considered

1. **Vue `<Transition>` component instead of GSAP:** Vue's built-in transitions handle enter/leave animations well for simple opacity/scale changes. However, the multi-step timeline (fade siblings -> scale selected -> cross-fade lens) requires sequenced animations that Vue transitions do not support natively. GSAP's timeline API is purpose-built for this. (See brainstorm: "Technical Approach" -- GSAP is the stated choice.)

2. **CSS animations with `@keyframes`:** Could achieve the visual effect, but coordinating the sequenced steps (fade siblings, then scale, then cross-fade) and supporting reverse playback would require complex state-driven class toggling. GSAP handles this declaratively.

3. **Separate route for lens view (e.g., `/infographics/straits/malacca`):** Would leverage Nuxt's page transitions but break the single-page infographic model. The lens is a modal-like overlay, not a separate page. URL-based navigation could be added later as an enhancement (push state without full route change).

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|---|---|---|
| GSAP 3.14 (already installed) | None -- already in `package.json` | N/A |
| `getBoundingClientRect()` for scale calculation | Returns incorrect values on SVG elements with `preserveAspectRatio="slice"` or after GSAP transforms are applied | Cache rects before animation starts; consider `svg.getScreenCTM()` for SVG-to-screen coordinate mapping |
| `v-if` mounting timing | Lens DOM not available when `open()` is called | Use `watch(selectedStrait, ..., { flush: 'post' })` -- not `nextTick()` alone |
| GSAP + SSR | GSAP accesses `window` internally | Import GSAP only in client context; wrap `gsap.context()` and `gsap.matchMedia()` in `onMounted`; use `import.meta.client` guards |
| Canvas element (placeholder) | Particle system (BF-78) may need different canvas setup | Keep canvas generic; BF-78 will own its initialization |
| `backdrop-filter` performance | Blur compositing is GPU-intensive; may cause frame drops during animation on low-end devices or Safari | Test with CPU throttle; consider deferring `backdrop-filter` until after transition completes |
| `<Teleport>` + embed iframe | Teleport targets iframe's `<body>`, which is correct, but may interact with parent page's styling if iframe is unsandboxed | Test in actual embed iframe; `<Teleport>` is SSR-safe in Nuxt |
| Focus trap dependency | `@vueuse/integrations/useFocusTrap` requires `focus-trap` npm package | Check if already in dependency tree; if not, manual focus trap is acceptable for this scope |
| Resize during animation | Cached geometry becomes stale if viewport is resized mid-transition | Add `ResizeObserver` that kills the timeline and resets state on resize during `isAnimating` |

## Open Questions

1. **Lens background zoom level:** The proposed `background-size: 300%` is a starting estimate for the zoomed crop. The implementer should calibrate this per strait or use a single global zoom factor. If straits at the edges of the map (Hormuz, Bab el-Mandeb) look awkward when zoomed, consider a per-strait `zoomFactor` in `straits.json`.

2. **Info panel position on small viewports:** The panel is positioned `right: 2rem` for desktop. On embed-sized viewports (e.g., 600px wide), the panel may need to stack below the canvas or become a bottom drawer. This can be deferred to a responsive polish pass but should be noted.

3. **Canvas sizing in lens:** The placeholder `<canvas>` needs explicit `width`/`height` attributes for the particle system (BF-78). For now, use CSS to fill the lens area. BF-78 will set the canvas resolution based on `devicePixelRatio`.

4. **`v-if` vs `v-show` for StraitLens:** Using `v-if` means the canvas is destroyed and recreated each time. If BF-78's particle system has expensive initialization, `v-show` (with hidden state) may be preferable. The implementer should start with `v-if` (simpler) and switch if needed.

5. **SVG coordinate mapping for scale calculation:** The current approach uses `getBoundingClientRect()` which returns screen pixels. Because the SVG uses `preserveAspectRatio="xMidYMid slice"`, the visible SVG area may not match the full viewBox. The implementer should verify the scale calculation works correctly at different aspect ratios (16:9, 4:3, square embed) and consider using `svg.getScreenCTM()` if `getBoundingClientRect` produces misaligned results.

6. **Focus trap library vs manual implementation:** Determine whether `@vueuse/integrations` and `focus-trap` are already in the dependency tree. If not, decide whether to add them or implement a minimal manual focus trap for this ticket.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md](docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md) -- Key decisions carried forward: (1) GSAP timeline for sequenced transition, (2) ~0.6-0.8s duration with ease-out, (3) Canvas element for particle rendering in lens, (4) Glassmorphism info panel overlay, (5) Exit via X button or click outside.

### Internal References

- Overview map implementation: `components/StraitMap.vue` (BF-76)
- Infographic wrapper: `components/infographics/StraitsInfographic.vue`
- Strait data & types: `data/straits/straits.json`, `types/strait.ts`
- Page routes: `pages/infographics/straits.vue`, `pages/embed/straits.vue`
- Previous plan (predecessor): `docs/plans/2026-03-05-feat-overview-map-proportional-circles-plan.md`

### Research References

- [GSAP matchMedia() for reduced motion](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) -- official GSAP docs on conditions-based animation branching
- [GSAP Accessibility Guide](https://gsap.com/resources/a11y) -- `gsap.matchMedia()` with `prefers-reduced-motion` examples
- [GSAP SVG Transform Guide](https://gsap.com/resources/svg/) -- `svgOrigin`, cross-browser SVG transform handling
- [getBoundingClientRect & GSAP](https://gsap.com/community/forums/topic/19433-getboundingclientrect-gsap/) -- known issues with rect values after GSAP transforms
- [Vue 3 Focus Trap in Modals](https://www.telerik.com/blogs/how-to-trap-focus-modal-vue-3) -- Vue-specific focus trap patterns
- [Accessible Vue Modal Dialogs](https://accessible-vue.com/chapter/4/) -- WAI-ARIA dialog pattern with `inert` attribute
- [Nuxt Client Components](https://nuxt.com/docs/4.x/directory-structure/app/components) -- `.client` suffix and SSR-safe patterns
- [GSAP Reduced Motion Toggle Demo](https://codepen.io/GreenSock/pen/RwMQwpR) -- live example of `gsap.matchMedia()` with motion preferences

### Related Work

- BF-76: Overview map with proportional circles (merged, PR #14)
- BF-78: Particle animation system (future -- depends on this ticket's lens shell)
- BF-39: Straits visualization scaffold (merged, PR #13)
