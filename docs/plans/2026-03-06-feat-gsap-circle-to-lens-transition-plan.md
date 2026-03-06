---
title: "feat: GSAP circle-to-lens transition"
type: feat
status: active
date: 2026-03-06
origin: docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md
linear: BF-77
---

# feat: GSAP circle-to-lens transition

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
- Handle `prefers-reduced-motion` by skipping animation (instant opacity swap)
- Clean up timeline on component unmount via `onUnmounted`

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

```ts
// composables/useStraitTransition.ts (sketch)
import { gsap } from 'gsap'
import type { Ref } from 'vue'

interface TransitionTargets {
  mapContainer: Ref<HTMLElement | null>
  circleOverlay: Ref<SVGSVGElement | null>
  lensContainer: Ref<HTMLElement | null>
  selectedStraitId: Ref<string | null>
}

export function useStraitTransition(targets: TransitionTargets) {
  let timeline: gsap.core.Timeline | null = null
  const isAnimating = ref(false)
  const prefersReducedMotion = useReducedMotion()

  function open(straitId: string) {
    if (isAnimating.value) return

    const circleGroups = targets.circleOverlay.value
      ?.querySelectorAll('.strait-circle-group')
    if (!circleGroups) return

    const selected = targets.circleOverlay.value
      ?.querySelector(`[data-strait-id="${straitId}"]`)
    const others = Array.from(circleGroups)
      .filter(g => g.getAttribute('data-strait-id') !== straitId)

    if (prefersReducedMotion.value) {
      // Instant swap -- no animation
      others.forEach(el => gsap.set(el, { opacity: 0 }))
      gsap.set(selected, { opacity: 0 })
      gsap.set(targets.lensContainer.value, { opacity: 1, scale: 1 })
      return
    }

    isAnimating.value = true
    timeline = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete: () => { isAnimating.value = false },
      onReverseComplete: () => { isAnimating.value = false },
    })

    // Step 1: Fade out non-selected circles
    timeline.to(others, { opacity: 0, duration: 0.25 }, 0)

    // Step 2: Scale + translate selected circle to viewport center
    const viewportRect = targets.mapContainer.value?.getBoundingClientRect()
    const circleRect = (selected as Element)?.getBoundingClientRect()
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
        transformOrigin: 'center center',
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
  }

  function close() {
    if (prefersReducedMotion.value) {
      // Instant reset
      gsap.set(targets.lensContainer.value, { opacity: 0 })
      // Reset all circle groups
      targets.circleOverlay.value
        ?.querySelectorAll('.strait-circle-group')
        .forEach(el => gsap.set(el, { opacity: 1, scale: 1, x: 0, y: 0 }))
      return
    }

    if (timeline) {
      isAnimating.value = true
      timeline.reverse()
    }
  }

  onUnmounted(() => {
    timeline?.kill()
  })

  return { open, close, isAnimating }
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
  (e: 'close'): void
}>()

// Close on Escape key
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

// Close when clicking the backdrop (outside content)
function onBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('lens-backdrop')) {
    emit('close')
  }
}
</script>

<template>
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
      class="lens-close-btn"
      aria-label="Close detail view"
      @click="emit('close')"
    >
      &times;
    </button>
  </div>
</template>
```

**Lens background:** CSS `background-image` using the same satellite `.webp`, with `background-position` offset based on the strait's `posX`/`posY` and `background-size` scaled up to simulate a zoom crop. A computed style object calculates the position:

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

### StraitsInfographic.vue Modifications

This component becomes the orchestrator:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import StraitMap from '~/components/StraitMap.vue'
import StraitLens from '~/components/StraitLens.vue'
import straitsData from '~/data/straits/straits.json'
import type { Strait } from '~/types/strait'
import { useStraitTransition } from '~/composables/useStraitTransition'

const straits = straitsData.straits as Strait[]

const selectedStrait = ref<Strait | null>(null)
const mapContainer = ref<HTMLElement | null>(null)
const circleOverlay = ref<SVGSVGElement | null>(null)
const lensContainer = ref<HTMLElement | null>(null)

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
  open(id)
}

function onCloseLens() {
  close()
  // After reverse animation completes, clear selectedStrait
  // (handled via timeline's onReverseComplete callback or a watch)
}
</script>

<template>
  <div ref="mapContainer" class="straits-infographic">
    <StraitMap
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

**Important:** The `v-if="selectedStrait"` on StraitLens means the lens DOM is only mounted when a strait is selected. The transition composable's `open()` must account for the lens element appearing in the DOM after `selectedStrait` is set -- use `nextTick()` or `watch` with `{ flush: 'post' }` to ensure the ref is populated before starting the GSAP timeline.

### Reduced Motion Handling

The composable checks `prefers-reduced-motion` via a small utility (or `window.matchMedia`):

```ts
function useReducedMotion(): Ref<boolean> {
  const matches = ref(false)
  onMounted(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    matches.value = mql.matches
    mql.addEventListener('change', (e) => { matches.value = e.matches })
  })
  return matches
}
```

When `prefers-reduced-motion: reduce` is active:
- Skip all GSAP tweens
- Instantly hide overview circles and show lens (opacity swap, no motion)
- Reverse: instantly show circles, hide lens
- The existing `@media (prefers-reduced-motion: reduce)` block in StraitMap.vue already disables CSS transitions

### Exit Mechanisms

Two ways to close the lens (standard modal pattern):

1. **Close button (X)** -- top-right corner of the lens overlay, triggers `emit('close')`
2. **Backdrop click** -- clicking the `.lens-backdrop` area outside the info panel, detected via event target check
3. **Escape key** -- `keydown` listener on `document`, triggers `emit('close')`

All three funnel into the same `onCloseLens()` handler, which calls `close()` on the transition composable.

### Focus Management

When the lens opens:
- Move focus to the close button (or the dialog itself) for keyboard accessibility
- Trap focus within the lens dialog (Tab should cycle within the lens, not escape to the overview behind it)

When the lens closes:
- Return focus to the circle that was clicked (stored in a ref before opening)

This follows the WAI-ARIA dialog pattern.

## System-Wide Impact

- **Interaction graph:** Circle click -> `StraitsInfographic.onSelectStrait()` -> sets `selectedStrait` -> mounts `StraitLens` -> `useStraitTransition.open()` drives GSAP timeline. Close button/backdrop/Escape -> `onCloseLens()` -> `useStraitTransition.close()` reverses timeline -> clears `selectedStrait` -> unmounts `StraitLens`.
- **Error propagation:** GSAP timeline failures are non-fatal (the lens still renders, just without animation). Missing DOM refs are guarded with null checks.
- **State lifecycle risks:** The `v-if` on StraitLens means the canvas element is created/destroyed on each open/close. This is acceptable for this ticket; the particle system (BF-78) may switch to `v-show` if canvas initialization is expensive.
- **API surface parity:** The embed route (`/embed/straits`) renders `StraitsInfographic`, so the lens transition works identically in embeds. The `role="dialog"` and focus trapping should work within iframes.
- **SSR compatibility:** GSAP must be imported only on client side. Wrap `gsap.timeline()` creation inside `onMounted()` or use `import.meta.client` guard. The `window.matchMedia` call in `useReducedMotion` also requires client-only execution.

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

- [ ] `prefers-reduced-motion: reduce` skips all GSAP animations (instant show/hide)
- [ ] Lens dialog has `role="dialog"`, `aria-modal="true"`, and a descriptive `aria-label`
- [ ] Focus moves to close button when lens opens; returns to clicked circle when lens closes
- [ ] Escape key closes the lens
- [ ] GSAP timeline is killed on component unmount (no memory leaks)
- [ ] SSR-safe: no `window` or `document` access outside `onMounted` / client guards

### Quality Gates

- [ ] Transition plays smoothly at 60fps on a mid-range device (test in Chrome DevTools Performance tab)
- [ ] No layout shift or flash of unstyled content during transition
- [ ] Works in both `/infographics/straits` and `/embed/straits` routes

## Implementation Phases

### Phase 1: Foundation (composable + data attributes)

**Files:**
- `composables/useStraitTransition.ts` -- create
- `components/StraitMap.vue` -- add `data-strait-id` to circle groups, expose SVG ref

**Deliverable:** Composable exists with `open()` / `close()` / `isAnimating` API. Forward timeline animates circle groups. No lens view yet (animation targets empty).

**Estimated effort:** ~1-2 hours

### Phase 2: Lens View Shell

**Files:**
- `components/StraitLens.vue` -- create
- `types/strait.ts` -- (optional) add helper types if needed

**Deliverable:** Static lens component renders strait data. Close button and Escape key work. Glassmorphism panel styled. Canvas placeholder present. No transition wiring yet.

**Estimated effort:** ~1-2 hours

### Phase 3: Wire It Together

**Files:**
- `components/infographics/StraitsInfographic.vue` -- rewrite to coordinate state + transition
- `composables/useStraitTransition.ts` -- finalize with lens container targeting

**Deliverable:** Full open/close cycle works. Click circle -> transition -> lens -> close -> reverse transition -> overview. Focus management wired. Reduced motion path tested.

**Estimated effort:** ~2-3 hours

### Phase 4: Polish

- Fine-tune timing, easing, and scale factors
- Test at multiple viewports (1920x1080, 1440x900, embed sizes)
- Verify accessibility (screen reader, keyboard-only, reduced motion)
- Verify SSR/SSG compatibility (`nuxt generate` succeeds)

**Estimated effort:** ~1 hour

## Alternative Approaches Considered

1. **Vue `<Transition>` component instead of GSAP:** Vue's built-in transitions handle enter/leave animations well for simple opacity/scale changes. However, the multi-step timeline (fade siblings -> scale selected -> cross-fade lens) requires sequenced animations that Vue transitions do not support natively. GSAP's timeline API is purpose-built for this. (See brainstorm: "Technical Approach" -- GSAP is the stated choice.)

2. **CSS animations with `@keyframes`:** Could achieve the visual effect, but coordinating the sequenced steps (fade siblings, then scale, then cross-fade) and supporting reverse playback would require complex state-driven class toggling. GSAP handles this declaratively.

3. **Separate route for lens view (e.g., `/infographics/straits/malacca`):** Would leverage Nuxt's page transitions but break the single-page infographic model. The lens is a modal-like overlay, not a separate page. URL-based navigation could be added later as an enhancement (push state without full route change).

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|---|---|---|
| GSAP 3.14 (already installed) | None -- already in `package.json` | N/A |
| `getBoundingClientRect()` for scale calculation | Returns 0 if element is not visible or SVG is not laid out | Guard with null checks; delay calculation to `nextTick` |
| `v-if` mounting timing | Lens DOM not available when `open()` is called | Use `nextTick()` or `watch(selectedStrait, ..., { flush: 'post' })` |
| GSAP + SSR | GSAP accesses `window` internally | Import GSAP only in client context; wrap timeline creation in `onMounted` |
| Canvas element (placeholder) | Particle system (BF-78) may need different canvas setup | Keep canvas generic; BF-78 will own its initialization |

## Open Questions

1. **Lens background zoom level:** The proposed `background-size: 300%` is a starting estimate for the zoomed crop. The implementer should calibrate this per strait or use a single global zoom factor. If straits at the edges of the map (Hormuz, Bab el-Mandeb) look awkward when zoomed, consider a per-strait `zoomFactor` in `straits.json`.

2. **Info panel position on small viewports:** The panel is positioned `right: 2rem` for desktop. On embed-sized viewports (e.g., 600px wide), the panel may need to stack below the canvas or become a bottom drawer. This can be deferred to a responsive polish pass but should be noted.

3. **Canvas sizing in lens:** The placeholder `<canvas>` needs explicit `width`/`height` attributes for the particle system (BF-78). For now, use CSS to fill the lens area. BF-78 will set the canvas resolution based on `devicePixelRatio`.

4. **`v-if` vs `v-show` for StraitLens:** Using `v-if` means the canvas is destroyed and recreated each time. If BF-78's particle system has expensive initialization, `v-show` (with hidden state) may be preferable. The implementer should start with `v-if` (simpler) and switch if needed.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md](docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md) -- Key decisions carried forward: (1) GSAP timeline for sequenced transition, (2) ~0.6-0.8s duration with ease-out, (3) Canvas element for particle rendering in lens, (4) Glassmorphism info panel overlay, (5) Exit via X button or click outside.

### Internal References

- Overview map implementation: `components/StraitMap.vue` (BF-76)
- Infographic wrapper: `components/infographics/StraitsInfographic.vue`
- Strait data & types: `data/straits/straits.json`, `types/strait.ts`
- Page routes: `pages/infographics/straits.vue`, `pages/embed/straits.vue`
- Previous plan (predecessor): `docs/plans/2026-03-05-feat-overview-map-proportional-circles-plan.md`

### Related Work

- BF-76: Overview map with proportional circles (merged, PR #14)
- BF-78: Particle animation system (future -- depends on this ticket's lens shell)
- BF-39: Straits visualization scaffold (merged, PR #13)
