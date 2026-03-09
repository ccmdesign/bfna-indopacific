---
title: "feat: Detail page layout + hero + qualitative content"
type: feat
status: active
date: 2026-03-09
linear: BF-91
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
---

# feat: Detail page layout + hero + qualitative content

## Enhancement Summary

**Deepened on:** 2026-03-09
**Sections enhanced:** 6
**Research sources:** Vue 3 Composition API skill, Vue best practices skill, accessibility skill, design-motion-principles skill, frontend-design skill, codebase pattern analysis (useFisheyeCanvas, useParticleSystem, useViewport), CSS container queries research, ResizeObserver cleanup patterns, mobile hero UX best practices

### Key Improvements
1. ResizeObserver implementation aligned with existing project RAF-debounce pattern (from `useFisheyeCanvas.ts` and `useParticleSystem.ts`) instead of naive callback
2. Cleanup pattern upgraded to match project convention: `getCurrentScope()` guard + `onScopeDispose` + `cancelAnimationFrame` for pending RAF
3. Accessibility gaps identified: divider needs `role="separator"`, sections need `aria-labelledby` linked to heading IDs, hero circle needs descriptive `aria-label`
4. StraitCircle transition conflict surfaced as concrete risk with mitigation strategy (suppress transition during initial mount)
5. Edge case discovered: particle canvas `circleSize` will receive reactive updates during resize, requiring the particle system to handle mid-animation size changes gracefully

### New Considerations Discovered
- The `65vw` sizing needs a minimum floor (e.g., `max(180px, min(65vw, 288px))`) to prevent the circle from becoming too small on 280px viewports (SE-class devices)
- `StraitCircle` uses `position: relative` + `overflow: hidden` only when it has an image (`:has(.strait-circle__image)`) --- the responsive container must not add conflicting positioning
- The divider's `margin: 8px 0 20px` creates asymmetric spacing; the top margin should account for the preceding section's `margin-bottom: 20px` to avoid visual doubling

## Overview

Enhance the existing `StraitMobileDetail.vue` component to align with the brainstorm specification for the mobile detail page. The component already renders all required sections (hero circle, trade value, metrics, description, industries, threats, facts, vessel breakdown, historical chart) but needs three adjustments: (1) reorder content to match the brainstorm's "qual first, quant second" reading flow, (2) make the hero circle responsive instead of fixed-size, and (3) add a particle slot placeholder for future BF-78 integration.

This is an **enhancement task** — not a rebuild. BF-89 delivered the routing and card list, BF-90 polished the card previews, and BF-91 refines the detail page itself.

## Current State (BF-89/BF-90 baseline)

| Capability | Status | File |
|---|---|---|
| Mobile detail page with all sections | Done | `components/straits/StraitMobileDetail.vue` |
| Hero circle via `StraitCircle` (fixed radius 144) | Done | `components/straits/StraitMobileDetail.vue:42-50` |
| Strait name + global share label overlay | Done | `components/straits/StraitMobileDetail.vue:52-53` |
| Trade value hero stat | Done | `components/straits/StraitMobileDetail.vue:57-60` |
| Key metrics grid (oil, LNG, cargo, vessels) | Done | `components/straits/StraitMobileDetail.vue:63-80` |
| Description paragraph | Done | `components/straits/StraitMobileDetail.vue:83-85` |
| Top industries tags | Done | `components/straits/StraitMobileDetail.vue:88-93` |
| Threats tags | Done | `components/straits/StraitMobileDetail.vue:96-101` |
| Key facts list | Done | `components/straits/StraitMobileDetail.vue:104-109` |
| Vessel breakdown stacked bar | Done | `components/straits/StraitMobileDetail.vue:112-132` |
| Historical trend chart | Done | `components/straits/StraitMobileDetail.vue:135-137` |
| Sticky back navigation bar | Done | `components/straits/StraitMobileDetail.vue:26-37` |
| Mobile routing (`[[id]].vue`) | Done | `pages/infographics/straits/[[id]].vue` |
| Particle system in `StraitCircle` (gated to `selected` + polygon-ready) | Done | `components/straits/StraitCircle.vue:15-17` |

## Problem Statement / Motivation

The brainstorm (see `docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md`) specifies the detail page reading order as:

> 1. Hero: zoomed-in circle with satellite image + animated particle flow
> 2. Strait name overlay on the hero
> 3. Description paragraph
> 4. Qualitative data (top industries, threats, key facts)
> 5. Quantitative data (trade value, oil/LNG, vessel breakdown, historical trend chart)

The current implementation places **quantitative data before qualitative data** (trade value and metrics appear between the hero and description). This inverts the brainstorm's "natural mobile reading flow" decision (see brainstorm: Key Decision #5 — "Qual data first, then quant data").

Additionally:
- The hero circle uses a fixed `HERO_RADIUS = 144` (288px diameter), which doesn't adapt to viewport width. On narrow phones (320px viewport) the circle is nearly edge-to-edge, while on wider phones (428px) it looks small.
- No visual slot or placeholder exists for the particle system integration (BF-78/BF-88). While only `hormuz` has polygon data today, the hero should be structurally ready for particles at any circle size.

## Proposed Solution

### Change 1: Reorder sections to qual-first flow

Move the trade value hero stat and key metrics grid **below** the qualitative sections. New order in `StraitMobileDetail.vue` template:

1. Sticky back nav (unchanged)
2. Hero section: circle + name + global share label (unchanged)
3. Description paragraph
4. Top Industries
5. Threats
6. Key Facts
7. **Divider** (visual separator between qual and quant)
8. Trade value hero stat
9. Key metrics grid
10. Vessel breakdown bar
11. Historical trend chart

This matches the brainstorm's reading flow exactly. The divider provides a clear visual break between the qualitative narrative and the quantitative data.

#### Research Insights

**Best Practices:**
- The "qual first, quant second" pattern aligns with the inverted pyramid (journalism) and progressive disclosure (UX) principles --- lead with context and narrative, follow with data. This is especially effective on mobile where users scroll linearly and benefit from understanding "what" before "how much."
- When reordering template sections, verify that any CSS selectors using `+` (adjacent sibling) or `~` (general sibling) combinators still target the correct elements. In this case, no such selectors exist in the scoped styles.

**Edge Cases:**
- If `strait.description` is empty/falsy, the qual section starts directly with Industries. Ensure the divider still renders even without a description, so the visual boundary between hero and qual content is maintained. Currently the description uses `v-if="strait.description"`, which is correct.
- If all qualitative fields are empty (no description, no industries, no threats, no facts), the divider would appear immediately after the hero with no content above it. Consider wrapping the divider in a `v-if` that checks whether any qual section rendered.

### Change 2: Responsive hero circle

Replace the fixed `HERO_RADIUS = 144` with a responsive approach:

```vue
<!-- StraitMobileDetail.vue -->
const HERO_MAX_DIAMETER = 288  // px, same as current 144 * 2
```

Use CSS to make the hero circle container responsive:

```css
.strait-mobile-detail__hero-circle {
  width: min(65vw, 288px);
  aspect-ratio: 1;
  margin-bottom: 1.25rem;
}
```

Pass the actual rendered size to `StraitCircle` via a `ResizeObserver` or compute from viewport width. The `StraitCircle` component accepts a `radius` prop in pixels, so the computed value needs to be half the container width.

**Implementation approach:** Use a `ref` + `ResizeObserver` on the hero-circle container to get its rendered width, then pass `width / 2` as the radius to `StraitCircle`. This keeps the circle responsive while StraitCircle continues to work with its existing pixel-based API.

```ts
const heroCircleRef = ref<HTMLElement | null>(null)
const heroRadius = ref(144) // fallback

onMounted(() => {
  if (!heroCircleRef.value) return
  const ro = new ResizeObserver(([entry]) => {
    heroRadius.value = Math.round(entry.contentRect.width / 2)
  })
  ro.observe(heroCircleRef.value)
  onScopeDispose(() => ro.disconnect())
})
```

#### Research Insights

**Best Practices (ResizeObserver pattern — align with project conventions):**
- This project already uses ResizeObserver with a `requestAnimationFrame` debounce in both `composables/useFisheyeCanvas.ts` (line 347) and `composables/useParticleSystem.ts` (line 314). The plan's naive callback approach deviates from the established pattern. Align with the existing RAF-gate pattern:

```ts
let resizeRafId: number | null = null
const heroCircleRef = ref<HTMLElement | null>(null)
const heroRadius = ref(144) // fallback

onMounted(() => {
  if (!heroCircleRef.value) return
  const ro = new ResizeObserver(([entry]) => {
    if (resizeRafId !== null) return          // RAF gate (project pattern)
    resizeRafId = requestAnimationFrame(() => {
      resizeRafId = null
      heroRadius.value = Math.round(entry.contentRect.width / 2)
    })
  })
  ro.observe(heroCircleRef.value)

  onScopeDispose(() => {
    ro.disconnect()
    if (resizeRafId !== null) {               // Cancel pending RAF on cleanup
      cancelAnimationFrame(resizeRafId)
      resizeRafId = null
    }
  })
})
```

- The cleanup pattern should match `useViewport.ts` style: use `getCurrentScope()` guard before `onScopeDispose()` if there is any chance the code runs outside a Vue scope. Since this is inside `onMounted()` (which always has a scope), the guard is unnecessary here --- but adding it is defensive and consistent.

**Why not VueUse `useResizeObserver`?**
- VueUse (`@vueuse/core`) is **not** a dependency in this project. Adding it for a single ResizeObserver use would be over-engineering. The project has an established raw-ResizeObserver pattern that should be followed.

**Responsive sizing — floor value needed:**
- `min(65vw, 288px)` has no lower bound. On a 280px viewport (iPhone SE in landscape or small Android), `65vw = 182px` which is acceptable. But consider using `max(160px, min(65vw, 288px))` to set a hard floor and prevent the circle from becoming unusably small on sub-280px viewports or when browser chrome compresses the viewport.
- Alternative: use `clamp(160px, 65vw, 288px)` which is semantically identical but more readable.

**Performance Considerations:**
- ResizeObserver fires on initial observe, so `heroRadius` will be set correctly on mount without needing a separate measurement pass.
- The RAF debounce prevents layout thrashing during continuous resize (e.g., orientation change animation). This is critical because `StraitCircle` sets inline `--diameter` which triggers style recalculation.

**StraitCircle transition conflict:**
- `StraitCircle` has `transition: ... width 0.6s cubic-bezier(0.4, 0, 0.2, 1), height 0.6s ...`. When the ResizeObserver fires on initial mount, the circle will animate from its initial CSS size to the observed size. This creates a visible "grow-in" effect that may feel unintentional.
- **Mitigation options:**
  1. Suppress the transition on first paint by adding a `--no-transition` CSS variable or class that is removed after the first ResizeObserver callback.
  2. Accept the grow-in as a feature (it looks like an entrance animation).
  3. Set the initial `heroRadius` from a CSS calc (`Math.min(window.innerWidth * 0.65, 288) / 2`) synchronously in `<script setup>`, so the first render is already correct and the ResizeObserver only handles subsequent resizes.

  Option 3 is the most robust --- it eliminates the flash entirely:
  ```ts
  const heroRadius = ref(
    import.meta.client
      ? Math.round(Math.min(window.innerWidth * 0.65, 288) / 2)
      : 144
  )
  ```

**Edge Cases:**
- **Orientation change:** When the device rotates, the ResizeObserver will fire and update the radius. The `StraitCircle` transition will animate the size change, which is desirable for orientation changes (smooth resize).
- **Split-screen / multitasking:** On iPadOS or Android split-screen, the viewport can be much narrower than expected. The `clamp()` floor prevents the circle from collapsing.
- **SSR hydration:** `heroRadius` defaults to `144` during SSR. On hydrate, the ResizeObserver sets the actual size. If the SSR value differs significantly from the client value, there will be a hydration mismatch on the inline `--diameter` style. Since `StraitMobileDetail` is wrapped in `<ClientOnly>`, this is not a concern.

### Change 3: Section divider between qual and quant

Add a lightweight horizontal divider element between the Key Facts section and the Trade Value stat. Style it consistently with the existing `__desc` bottom border:

```css
.strait-mobile-detail__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 8px 0 20px;
}
```

This creates a clear visual boundary that signals the shift from narrative content to data.

#### Research Insights

**Accessibility:**
- The divider should use `role="separator"` to convey its purpose to screen readers. Without it, the `<div>` is invisible to assistive technology, which means screen reader users miss the conceptual boundary between qualitative and quantitative sections.
- Recommended markup: `<div class="strait-mobile-detail__divider" role="separator" aria-label="Qualitative and quantitative data boundary" />`
- Alternatively, use an `<hr>` element which has implicit `role="separator"`. Reset its default browser styling:
  ```css
  hr.strait-mobile-detail__divider {
    border: none;
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
    margin: 8px 0 20px;
  }
  ```

**Spacing consistency:**
- The preceding `__section` (Key Facts) has `margin-bottom: 20px`. The divider has `margin-top: 8px`. These combine to 28px above the divider but only 20px below. For visual symmetry, consider `margin: 0 0 20px` on the divider and let the section's existing margin provide the top gap. Or collapse margins by using a consistent system.
- Review whether `margin: 0` on the divider + the section's `margin-bottom: 20px` gives the right visual spacing (20px gap above the line, 20px below it).

**Conditional rendering:**
- Consider wrapping the divider in a `v-if` that checks `hasQualContent && hasQuantContent` to avoid rendering a lone divider when one side is empty. A computed like:
  ```ts
  const hasQualContent = computed(() =>
    !!strait.description || strait.topIndustries.length > 0 ||
    strait.threats.length > 0 || strait.keyFacts.length > 0
  )
  ```

## Technical Considerations

### StraitCircle radius reactivity
`StraitCircle` uses the `radius` prop to set `--diameter` via inline style (`radius * 2 + 'px'`). It also has a CSS transition on `width` and `height`. The ResizeObserver approach will cause the radius to update on viewport resize, which will trigger the transition. This is acceptable — the transition is 0.6s cubic-bezier and will produce a smooth resize animation. If this feels sluggish, debounce the ResizeObserver callback or disable the transition for the mobile detail context.

#### Research Insights

**StraitCircle internal layout detail:**
- `StraitCircle` uses `:has(.strait-circle__image)` to apply `position: relative; overflow: hidden`. Since `StraitMobileDetail` always passes `:image-url="strait.imageUrl"`, the image is always present, meaning the circle always has `position: relative; overflow: hidden`. The responsive container div wrapping it must NOT set competing `position` or `overflow` rules --- just use it as a sizing shell with `width` and `aspect-ratio`.

**Particle canvas resize handling:**
- When `heroRadius` changes reactively, `StraitCircle` re-renders with the new `--diameter`, and `StraitParticleCanvas` receives a new `circleSize` prop. The particle system in `useParticleSystem.ts` has its own ResizeObserver on the canvas element. These two ResizeObservers (one on the hero container, one on the canvas inside StraitCircle) will fire in sequence. Verify there is no feedback loop: container resize -> radius prop update -> StraitCircle diameter change -> canvas ResizeObserver fires -> no external effect (contained within particle system). This chain terminates cleanly.

### Particle system readiness
`StraitCircle` already conditionally renders `StraitParticleCanvas` when `selected=true` AND the strait is in `POLYGON_READY_STRAITS`. The mobile detail already passes `:selected="true"`, so particles will render for Hormuz automatically once the particle canvas works at larger sizes. The responsive radius change ensures the `circleSize` prop passed to `StraitParticleCanvas` tracks the actual rendered size. **No additional particle work needed in this task.**

### No new components or files
All changes are within `StraitMobileDetail.vue`. No new components, utils, or types are needed. The template reorder is a cut-and-paste operation within the existing `<template>` block.

#### Research Insights

**Vue best practices — component complexity check:**
- `StraitMobileDetail.vue` is currently 356 lines (template + script + style). After these changes it will grow slightly (divider markup, ResizeObserver logic, computed for conditional divider). This is still well within acceptable SFC size. No split is needed.
- The ResizeObserver logic could be extracted into a `useHeroRadius()` composable for testability, but given the plan's "no new files" constraint and the logic being ~15 lines, inline is appropriate. Flag for extraction only if other components later need responsive radius measurement.

### Swipe navigation — out of scope
The brainstorm mentions "horizontal swipe on the detail page navigates to adjacent straits" (see brainstorm: Resolved Questions #2). This requires touch gesture handling and knowledge of the sorted strait list. It is architecturally separate from layout/content ordering and should be tracked as a follow-up task.

## Acceptance Criteria

- [ ] **Qual-first ordering**: Description, Industries, Threats, and Key Facts appear above Trade Value, Metrics, Vessel Breakdown, and Historical Chart
- [ ] **Visual divider**: A subtle horizontal rule separates the qualitative and quantitative sections
- [ ] **Responsive hero circle**: The hero circle scales with viewport width, capped at 288px diameter, using `clamp(160px, 65vw, 288px)` or equivalent
- [ ] **StraitCircle radius prop**: The `radius` passed to `StraitCircle` reflects the actual rendered size (via ResizeObserver), not a hardcoded constant
- [ ] **Particle readiness**: `StraitCircle` continues to receive `:selected="true"` so particles render for polygon-ready straits at the correct size
- [ ] **No regression**: Back navigation, sticky nav, all 6 straits render correctly, no broken styles on viewports 320px-899px
- [ ] **Desktop unaffected**: `StraitMobileDetail` only renders on mobile (`isMobile` guard in `[[id]].vue`)

### Additional Acceptance Criteria (from research)

- [ ] **ResizeObserver RAF debounce**: The ResizeObserver callback uses the project's established `requestAnimationFrame` gate pattern (matching `useFisheyeCanvas.ts` and `useParticleSystem.ts`)
- [ ] **Cleanup correctness**: `onScopeDispose` disconnects the ResizeObserver AND cancels any pending `requestAnimationFrame`
- [ ] **No initial flash**: The hero circle does not visibly animate from a wrong size on first paint (use synchronous initial calculation or suppress transition)
- [ ] **Divider accessibility**: The divider uses `role="separator"` or is an `<hr>` element
- [ ] **Divider conditional**: The divider only renders when both qualitative and quantitative content exist

## Files to Modify

| File | Change |
|---|---|
| `components/straits/StraitMobileDetail.vue` | Reorder template sections, add divider element, replace fixed HERO_RADIUS with responsive ResizeObserver, add hero-circle ref, update CSS |

## Dependencies & Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| ResizeObserver not supported on old mobile browsers | Low (95%+ global support) | Fallback to `heroRadius = 144` default value |
| StraitCircle transition looks janky during viewport resize | Low | Debounce the ResizeObserver callback at 100ms, or add `.strait-circle--no-transition` class for mobile detail context |
| Reorder breaks scroll position or sticky nav behavior | Very low | Sticky nav is `position: sticky; top: 0` and is unaffected by content order below it |
| Initial mount flash: circle animates from 144px to responsive size | Medium | Use synchronous initial calc: `Math.round(Math.min(window.innerWidth * 0.65, 288) / 2)` as default value (SSR-gated) |
| Two ResizeObservers in chain (hero container + particle canvas) create feedback loop | Very low | Verified: the chain terminates because particle canvas ResizeObserver only affects internal canvas sizing, not external layout |
| Circle too small on sub-280px viewports (iPhone SE landscape, small Android) | Low | Use `clamp(160px, 65vw, 288px)` to set a hard floor |
| Divider renders with no content above or below it | Low | Wrap divider in `v-if="hasQualContent"` computed check |

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) — Key decisions carried forward: qual-first reading flow (#5), particles as hero decoration (#4), long scroll with no tabs (#5)
- Current implementation: `components/straits/StraitMobileDetail.vue`
- Circle component: `components/straits/StraitCircle.vue`
- Particle canvas: `components/straits/StraitParticleCanvas.vue`
- Mobile routing: `pages/infographics/straits/[[id]].vue`
- Existing ResizeObserver pattern: `composables/useFisheyeCanvas.ts` (line 343-377), `composables/useParticleSystem.ts` (line 311-326)
- Existing cleanup pattern: `composables/useViewport.ts` (onScopeDispose + getCurrentScope guard)
- [VueUse useResizeObserver](https://vueuse.org/core/useresizeobserver/) — Referenced but NOT adopted (not a project dependency)
- [CSS Container Queries (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) — Considered but viewport-relative sizing is simpler for this use case
- [ResizeObserver API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
