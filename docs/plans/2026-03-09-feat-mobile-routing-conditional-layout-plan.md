---
title: "feat: Mobile routing + conditional layout (list vs map)"
type: feat
status: active
date: 2026-03-09
linear: BF-89
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
deepened: 2026-03-09
---

# feat: Mobile routing + conditional layout (list vs map)

## Enhancement Summary

**Deepened on:** 2026-03-09
**Sections enhanced:** 8
**Research sources:** VueUse docs (useMediaQuery, useBreakpoints, SSR width), Vue Router gotchas (param-change lifecycle), motion.dev (layoutId shared element transitions), VueUse Gesture (useDrag swipe), Nuxt SSR hydration best practices, CSS container queries vs media queries, WCAG 2.1 mobile accessibility, design motion principles

### Key Improvements
1. **SSR hydration safety** — plan now specifies the `<ClientOnly>` wrapper strategy and CSS-first rendering to eliminate hydration mismatches, with VueUse `useMediaQuery` (with `ssrWidth`) as a cleaner alternative to a custom composable
2. **Shared element transition via motion.dev `layoutId`** — concrete library recommendation replaces vague "coordinated CSS transforms" for Phase 3 card-to-detail animation
3. **Swipe gesture via `@vueuse/gesture`** — `useDrag` with `swipe` state replaces raw `touchstart/touchmove/touchend` boilerplate, with proper `axis: 'x'` locking and `preventWindowScrollY`
4. **Accessibility gaps filled** — added WCAG requirements for card list (focus management, `aria-label`, keyboard navigation, touch target sizes) and detail page (skip-to-content, back button focus trap, reduced-motion)
5. **Data helper extraction resolved** — Open Question #1 and #2 answered with concrete implementation approach using a `useStraitsData` composable and shared `straitFormatters.ts` utility

### New Risks Discovered
- **Hydration mismatch on initial render** — `isMobile` defaulting to `false` during SSR means server always renders `<StraitMap>` markup; mobile clients will see a flash of desktop content before hydration swaps to card list. Mitigated by `<ClientOnly>` with a mobile-safe fallback slot.
- **`StraitCircle` at 90vw hero size** — the component uses a CSS `var(--diameter)` set in pixels; at 90vw on a 390px phone that is 351px. The satellite image may pixelate if the source image crop is smaller. Need to verify `imageUrl` asset resolution.
- **Footer overlap on mobile** — the default layout footer is `position: absolute; bottom: 0` which overlaps scrollable content. The `.layout-2` mobile override needs `footer { position: relative }` or extra bottom padding.
- **Swipe conflicts with horizontal scroll** — if any content inside `StraitMobileDetail` (e.g. the vessel breakdown bar or tag chips) has horizontal overflow, swipe gestures may conflict. Need `axis: 'x'` lock with `lockDirection: true` and only attach swipe to a top-level wrapper.

---

## Overview

Replace the desktop-only `RotateDeviceOverlay` blocker on mobile with a native card-based experience for the straits infographic. Below 900px, users see a scrollable card list at `/infographics/straits` and a long-scroll detail page at `/infographics/straits/:id`. Desktop remains unchanged.

## Problem Statement

Mobile users currently hit a full-screen "Please rotate your device" overlay on the straits page. The proportional-circle map does not translate to small screens. There is no mobile-native way to browse strait data.

(see brainstorm: `docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md`, "Why This Approach")

## Proposed Solution

### Route Structure

Keep the existing `pages/infographics/straits/[[id]].vue` catch-all route. It already handles both `/infographics/straits` (no param) and `/infographics/straits/:id` (with param). Inside this page, a viewport-aware composable determines whether to render:

- **Desktop (>=900px):** `<StraitMap>` (existing behavior, unchanged)
- **Mobile (<900px), no `id`:** `<StraitCardList>` (new)
- **Mobile (<900px), with `id`:** `<StraitMobileDetail>` (new)

**Why keep `[[id]].vue` instead of splitting into `index.vue` + `[id].vue`:**
- The catch-all already works and handles validation, head meta, and navigation callbacks
- Splitting would duplicate the `definePageMeta`, validation watcher, and `useStraitsHead` logic
- The mobile branch adds conditional rendering, not a different route structure

### Research Insights: Route Structure

**Vue Router param-change gotcha:** When navigating between `/infographics/straits/malacca` and `/infographics/straits/sunda`, the `[[id]].vue` component is **reused** (not remounted). The existing `watch(() => route.params.id, ...)` with `{ immediate: true }` already handles this correctly. The mobile detail component must also react to param changes via props (not `onMounted`), which the plan already ensures by passing `straitId` as a prop from the page.

**Nuxt typed router:** The plan uses string-based `navigateTo('/infographics/straits')`. Per Nuxt 4 best practices, consider using typed route names (`navigateTo({ name: '/infographics/straits/[[id]]' })`) once the typed router is configured. Not blocking for this feature, but worth noting.

### Viewport Detection

Create `composables/useViewport.ts` exposing a reactive `isMobile` ref based on a `matchMedia('(max-width: 899px)')` listener. This composable:

- Uses `window.matchMedia` (not resize events) for performance
- Returns `isMobile: Ref<boolean>`
- SSR-safe: defaults to `false` (desktop) during SSR, hydrates on mount
- Reusable across the project for future responsive needs

### Research Insights: Viewport Detection

**VueUse `useMediaQuery` as alternative:** VueUse provides `useMediaQuery('(max-width: 899px)')` with built-in SSR support via the `ssrWidth` option. However, VueUse is **not currently a project dependency**. Two options:

- **(A) Custom composable (plan's approach):** Zero new dependencies. ~20 lines of code. Use `onScopeDispose` for cleanup (Vue 3.5+ pattern).
- **(B) Install `@vueuse/core` and use `useMediaQuery`:** Battle-tested, SSR-safe with `ssrWidth: 375`, handles edge cases (Safari `addListener` fallback). Also unlocks `useBreakpoints`, `useSwipe`, `useElementSize`, and 200+ other composables for future use.

**Recommendation:** If the project anticipates needing more VueUse composables (likely, given Phase 3 swipe and future responsive work), install `@vueuse/core` now. Otherwise, the custom composable is fine — but it **must** include:

```ts
// composables/useViewport.ts — reference implementation
import { ref, onScopeDispose } from 'vue'

export function useViewport() {
  const isMobile = ref(false)

  if (import.meta.client) {
    const mql = window.matchMedia('(max-width: 899px)')
    isMobile.value = mql.matches

    const handler = (e: MediaQueryListEvent) => { isMobile.value = e.matches }
    mql.addEventListener('change', handler)
    onScopeDispose(() => mql.removeEventListener('change', handler))
  }

  return { isMobile: readonly(isMobile) }
}
```

**Key details:**
- Use `onScopeDispose` (not `onUnmounted`) — works in both component and effect scope contexts
- Export `readonly(isMobile)` — prevents external mutation (Vue composable best practice)
- The `import.meta.client` guard is the Nuxt-idiomatic SSR check (not `typeof window !== 'undefined'`)

**SSR hydration warning:** Because `isMobile` defaults to `false` during SSR, the server will always render `<StraitMap>` markup. On mobile devices, the client will hydrate and immediately swap to `<StraitCardList>`, causing a flash. Two mitigations:

1. **`<ClientOnly>` wrapper** with a loading skeleton fallback slot — prevents SSR from rendering either component, client renders the correct one on mount
2. **CSS-first approach** — render both components, use `display: none` via media query to hide the wrong one. Rejected in the plan because StraitMap still executes D3 logic on mobile. But could work if the mobile components are the ones hidden on desktop (they are lightweight).

**Recommended approach:** Wrap the conditional branch in `<ClientOnly>` with a minimal fallback:
```vue
<ClientOnly>
  <StraitMap v-if="!isMobile" ... />
  <StraitCardList v-else-if="!straitId" ... />
  <StraitMobileDetail v-else ... />
  <template #fallback>
    <div class="strait-loading-skeleton" />
  </template>
</ClientOnly>
```

### RotateDeviceOverlay Bypass

The layout already supports `suppressRotateOverlay` via page meta. The straits page will set this dynamically:

```ts
// In [[id]].vue — suppress overlay when mobile layout is active
definePageMeta({
  suppressRotateOverlay: true, // Always suppress on straits; mobile has its own layout
  layoutClass: 'layout-2',
  // ...existing meta
})
```

Since the straits page now has a proper mobile experience, the rotate overlay is never needed on this page. Static `suppressRotateOverlay: true` is simpler than reactive conditioning.

### Layout Bypass on Mobile

The master grid (`.layout-2`) locks `.strait-map` into `grid-row: 1/8; grid-column: 1/-1` with the 12x7 grid at `100svh`. On mobile, the card list and detail page need a scrollable layout. Two changes in `public/styles.css`:

1. Add a media query to `.layout-2` that switches to a scrollable flow layout below 900px (matching `layout-home` pattern)
2. The mobile components use normal document flow, not grid placement

```css
/* public/styles.css */
.layout-2 {
  @media (max-width: 900px) {
    height: auto;
    min-height: 100svh;
    overflow: visible;
    display: flex;
    flex-direction: column;
  }
}
```

### Research Insights: Layout Bypass

**Footer overlap risk:** The default layout (`layouts/default.vue`) positions the footer as `position: absolute; bottom: 0; height: 4rem`. When `.layout-2` switches to `display: flex; flex-direction: column` on mobile, the absolute footer will **still overlay** the bottom of the scrollable content. Must add:

```css
.layout-2 {
  @media (max-width: 900px) {
    height: auto;
    min-height: 100svh;
    overflow: visible;
    display: flex;
    flex-direction: column;
    padding-bottom: 0; /* override the 4rem from .page-wrapper */
  }
}

/* Match the .layout-home footer pattern */
.layout-2 footer {
  @media (max-width: 900px) {
    position: relative;
    margin-top: auto;
  }
}
```

**`.page-wrapper` max-height override:** The default layout's `.page-wrapper` has `max-height: 100vh` with a `@media (max-width: 900px)` override to `max-height: 100%; height: 100%`. This is already in place (lines 72-75 of `default.vue` scoped styles), so the mobile scrollable layout should work without additional overrides to `.page-wrapper`. Verify during implementation.

**Grid specificity:** The `.layout-2` rules are in `public/styles.css` (global), but `.page-wrapper` styles are in `layouts/default.vue` (scoped). Scoped styles have higher specificity due to the `[data-v-xxx]` attribute selector. The `.layout-2` mobile override may need `!important` or to be moved into the layout's scoped styles if specificity conflicts arise.

## Technical Approach

### Phase 1: Foundation (routing + viewport + layout bypass)

**Goal:** Mobile users see "something" instead of the rotate overlay. Desktop is unchanged.

#### Tasks

1. **`composables/useViewport.ts`** (new file)
   - Export `useViewport()` returning `{ isMobile: Ref<boolean> }`
   - Uses `matchMedia('(max-width: 899px)')` with `change` event listener
   - SSR guard: check `import.meta.client` before accessing `window`
   - Cleanup listener on scope dispose via `onScopeDispose`
   - Return `readonly(isMobile)` to prevent external mutation

2. **`pages/infographics/straits/[[id]].vue`** (modify)
   - Import `useViewport`
   - Add `suppressRotateOverlay: true` to `definePageMeta`
   - Wrap template in `<ClientOnly>` with a loading skeleton fallback
   - Inside `<ClientOnly>`: conditional `<StraitMap v-if="!isMobile" ...>` / `<StraitCardList v-else-if="!straitId" ...>` / `<StraitMobileDetail v-else ...>`
   - Pass `straits`, `straitId`, and `onSelect` to mobile components

3. **`public/styles.css`** (modify)
   - Add `@media (max-width: 900px)` block to `.layout-2` to override grid with flex column
   - Add `.layout-2 footer` mobile override to `position: relative; margin-top: auto`
   - Ensure `padding-bottom` override to prevent footer overlap

4. **`components/straits/StraitCardList.vue`** (new file)
   - Accepts `straits: Strait[]` prop
   - Renders alphabetically sorted list of `<StraitCard>` components
   - Emits `select(id: string)` when a card is tapped
   - Simple vertical scroll container with padding
   - Add a page title/heading for context ("Indo-Pacific Straits")

5. **`components/straits/StraitCard.vue`** (new file)
   - Accepts `strait: Strait` prop
   - Shows: strait name, `globalShareLabel`, `valueLabel` (trade value headline)
   - Shows a small `<StraitCircle>` as thumbnail (reuse existing component with a fixed small radius, e.g. 40px)
   - Card styling: dark glass card (reuse `--color-card-bg`, `--color-card-border` tokens)
   - Click handler emits `select`

### Research Insights: Phase 1

**Accessibility requirements (WCAG 2.1 AA):**
- **Touch target sizes:** Each `<StraitCard>` must have a minimum 44x44px touch target (WCAG 2.5.5). The full card should be tappable, not just the text.
- **Keyboard navigation:** Cards must be focusable (`tabindex="0"` or use `<button>` / `<a>` as the card root) and activatable with Enter/Space.
- **Focus indicators:** Reuse the existing `.btn-secondary:focus-visible` pattern (`outline: 2px solid rgba(255, 255, 255, 0.7)`).
- **Screen reader labels:** Each card should have an `aria-label` like `"Strait of Malacca — 28% of global trade — $5.3T annual value"` for context beyond visual layout.
- **List semantics:** Use `role="list"` on the container and `role="listitem"` on each card, or use native `<ul>` / `<li>` elements.

**Card component as `<NuxtLink>`:** Instead of `<div @click="emit('select')">`, consider making the card a `<NuxtLink :to="'/infographics/straits/' + strait.id">`. This gives free keyboard navigation, proper anchor semantics, and URL preview on hover/long-press. The `select` event can be replaced by the router's param watcher.

**Performance: lazy-load StraitMap on desktop:** Since `<ClientOnly>` already defers rendering, consider wrapping `<StraitMap>` in `defineAsyncComponent` so the D3-heavy component bundle is only loaded on desktop viewports. This reduces the mobile JS bundle.

```ts
const StraitMap = defineAsyncComponent(() => import('~/components/StraitMap.vue'))
```

#### Acceptance Criteria

- [ ] `composables/useViewport.ts` exists and exports `useViewport()` with reactive `isMobile`
- [ ] Desktop (>=900px): `<StraitMap>` renders, no change from current behavior
- [ ] Mobile (<900px), list view: card list renders with all straits in alphabetical order
- [ ] Mobile (<900px), detail view: placeholder detail component renders for `/infographics/straits/:id`
- [ ] `RotateDeviceOverlay` does not appear on the straits page at any viewport size
- [ ] `.layout-2` becomes scrollable below 900px
- [ ] Back button from detail navigates to list (existing `navigateTo` logic)
- [ ] No SSR hydration mismatch warnings in console
- [ ] Cards are keyboard-navigable and have proper focus indicators
- [ ] Footer does not overlap card list content on mobile

---

### Phase 2: Detail Page

**Goal:** Full mobile detail page with hero, data sections, and navigation.

#### Tasks

1. **`components/straits/StraitMobileDetail.vue`** (new file)
   - Props: `strait: Strait`, `historical: Record<string, StraitHistoricalEntry>`, `year: string`, `allStraits: Strait[]` (for swipe navigation)
   - Long-scroll layout with sections:
     1. **Hero:** `<StraitCircle>` at full viewport width (~90vw), satellite image visible, overlaid strait name. Height ~40vh.
     2. **Trade value hero stat:** Reuse `StraitDetailPanel` pattern (or extract into a shared component)
     3. **Key metrics row:** Oil, LNG, cargo, vessels (from `StraitDetailPanel`)
     4. **Description paragraph**
     5. **Top Industries** (tag chips)
     6. **Threats** (tag chips, threat color)
     7. **Key Facts** (bulleted list)
     8. **Vessel breakdown bar** (from `StraitDetailPanel`)
     9. **Historical trend chart:** `<StraitHistoryChart>` (reuse, may need responsive sizing)
   - Back button / link at top → `navigateTo('/infographics/straits')`
   - Emits `close` (alternative to back navigation)

2. **`pages/infographics/straits/[[id]].vue`** (modify)
   - Pass full data props to `<StraitMobileDetail>`: `strait`, `historical` (by strait), `year`, `allStraits`
   - The `historicalByStrait` function from `StraitMap.vue` needs to be extracted or duplicated (it's a pure function)

3. **`composables/useStraitsData.ts`** (new file — resolves Open Question #1)
   - Extract `historicalByStrait()` and `LATEST_YEAR` from `StraitMap.vue` into a shared composable
   - Also export `straits` array (typed as `Strait[]`) for consistent access
   - `StraitMap.vue` imports from this composable instead of duplicating logic

4. **`utils/straitFormatters.ts`** (new file — resolves Open Question #2)
   - Extract `fmtUsd()`, `fmtNum()`, and `vesselSegments` computation from `StraitDetailPanel.vue`
   - Both `StraitDetailPanel` and `StraitMobileDetail` import from this shared utility
   - Pure functions, no Vue dependency — testable in isolation

### Research Insights: Phase 2

**Hero circle sizing edge case:** `StraitCircle.vue` sets `width` and `height` via `var(--diameter)` in pixels, passed as `radius * 2`. At 90vw on a 390px phone, the hero circle would be ~351px diameter. The satellite `imageUrl` crops in the data are likely optimized for the desktop circle sizes (96–288px diameter range based on `RADIUS_MIN=48` to `RADIUS_MAX=144`). At 351px, images may appear pixelated. **Mitigation:** Either provide higher-resolution satellite crops, or cap the hero circle at 288px (the desktop max) and center it in the hero area.

**`StraitHistoryChart` responsive sizing:** The D3 chart likely has hard-coded dimensions or uses the parent container's size. Verify it uses `ResizeObserver` or responsive SVG (`viewBox` + `preserveAspectRatio`) to adapt to mobile widths. If not, pass explicit `width` and `height` props based on `window.innerWidth`.

**Back button patterns:**
- Use a `<NuxtLink to="/infographics/straits">` (not a `<button>` with `navigateTo`) for the back link — gives proper `<a>` semantics, right-click "open in new tab", and browser back/forward stack integration.
- Add `aria-label="Back to strait list"` for screen readers.
- Position as a sticky header so it remains accessible during long scrolls.

**Deep link handling:** When a user loads `/infographics/straits/malacca` directly on mobile, the `watch` on `route.params.id` with `{ immediate: true }` fires and validates the ID. The `selectedStrait` computed already resolves. The mobile detail page should render immediately without requiring the list to load first. This already works with the current architecture since all data is from the static JSON import.

**Scroll restoration:** When navigating back from detail to list, the browser may not restore the previous scroll position in the card list. Consider using `useScrollState` or saving scroll position before navigation and restoring on return.

#### Acceptance Criteria

- [ ] Detail page renders all data sections from the brainstorm spec
- [ ] `<StraitCircle>` renders as hero with satellite image at ~90vw (or capped at max resolution)
- [ ] `<StraitHistoryChart>` renders responsively on mobile widths
- [ ] Back navigation returns to card list
- [ ] Deep link to `/infographics/straits/malacca` renders the detail page directly on mobile
- [ ] `fmtUsd` and `fmtNum` are shared between desktop panel and mobile detail (no duplication)
- [ ] `historicalByStrait` and `LATEST_YEAR` live in `composables/useStraitsData.ts`

---

### Phase 3: Transitions + Swipe (Polish)

**Goal:** Fluid card-to-detail transition and swipe-between-straits gesture.

#### Tasks

1. **Expand-in-place transition**
   - Use Vue's `<Transition>` with CSS animations for now (View Transitions API has limited Safari support as of early 2026 — see brainstorm)
   - Card scales up + fades into detail page; reverse on back
   - The `<StraitCircle>` in the card morphs into the hero circle (shared element concept via coordinated CSS transforms)
   - Fallback: simple fade transition if shared-element is too complex for Phase 3

2. **Swipe between straits**
   - Horizontal swipe on the detail page navigates to the next/previous strait (alphabetically)
   - Use touch event listeners (`touchstart`, `touchmove`, `touchend`) with a swipe threshold (~50px horizontal, <30px vertical)
   - Update route via `navigateTo` to adjacent strait ID
   - Show subtle edge indicators (chevron or peek of next card)

3. **Particle system in hero** (depends on BF-78)
   - `<StraitParticleCanvas>` already renders inside `<StraitCircle>` when `selected` prop is true
   - On mobile detail, always pass `selected: true` so particles animate in the hero
   - Performance tuning tracked separately in BF-88 (reduced particle count for mobile)

### Research Insights: Phase 3

**Shared element transitions — motion.dev `layoutId`:**
The `motion.dev` library (successor to Framer Motion) supports Vue and provides a `layoutId` prop that automatically animates between two elements with the same ID. When a new component with a matching `layoutId` enters the DOM, it animates from the old element's position/size to the new one. This is significantly simpler than manually coordinating CSS transforms.

```vue
<!-- In StraitCard.vue -->
<motion.div :layoutId="'strait-circle-' + strait.id">
  <StraitCircle :radius="40" ... />
</motion.div>

<!-- In StraitMobileDetail.vue -->
<motion.div :layoutId="'strait-circle-' + strait.id">
  <StraitCircle :radius="heroRadius" ... />
</motion.div>
```

**Trade-offs of motion.dev:**
- Adds a dependency (~15KB gzipped)
- Layout animations use CSS `transform` for 60fps performance
- Requires both old and new elements to briefly coexist in the DOM (crossfade)
- May conflict with `<ClientOnly>` if the transition happens across route changes
- **Alternative if motion.dev is too heavy:** Use FLIP animation manually (First, Last, Invert, Play) with Vue's `<Transition>` hooks (`onBeforeEnter`, `onEnter`, `onLeave`)

**Recommended timebox:** 2 hours on motion.dev `layoutId` approach. If integration issues arise (especially with `<ClientOnly>` or Nuxt route transitions), fall back to a simple CSS `opacity + transform: scale()` transition:

```css
.detail-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.detail-enter-from { opacity: 0; transform: scale(0.95); }
.detail-leave-active { transition: opacity 0.2s ease; }
.detail-leave-to { opacity: 0; }
```

**Swipe gestures — `@vueuse/gesture` `useDrag`:**
Instead of raw `touchstart`/`touchmove`/`touchend` listeners, the `@vueuse/gesture` library provides `useDrag` with built-in swipe detection:

```ts
import { useDrag } from '@vueuse/gesture'

const sortedStraits = computed(() => [...allStraits].sort((a, b) => a.name.localeCompare(b.name)))
const currentIndex = computed(() => sortedStraits.value.findIndex(s => s.id === strait.id))

useDrag(({ swipe: [swipeX], active }) => {
  if (swipeX === -1) {
    // Swiped left → next strait
    const next = sortedStraits.value[currentIndex.value + 1]
    if (next) navigateTo(`/infographics/straits/${next.id}`)
  } else if (swipeX === 1) {
    // Swiped right → previous strait
    const prev = sortedStraits.value[currentIndex.value - 1]
    if (prev) navigateTo(`/infographics/straits/${prev.id}`)
  }
}, {
  domTarget: detailRef,
  axis: 'x',
  lockDirection: true,
  preventWindowScrollY: true,
  swipeDistance: 50,
  swipeVelocity: 0.3,
  filterTaps: true,
})
```

**Key `useDrag` options:**
- `axis: 'x'` — constrains gesture recognition to horizontal only
- `lockDirection: true` — once horizontal swipe starts, vertical scrolling is suppressed
- `preventWindowScrollY: true` — prevents page bounce during horizontal swipe
- `filterTaps: true` — ignores taps so card links/buttons still work
- `swipeDistance: 50` — minimum 50px threshold before swipe fires

**If not using `@vueuse/gesture`:** Extract the raw touch handler into a `composables/useSwipe.ts` composable that encapsulates the boilerplate and returns `{ onSwipeLeft, onSwipeRight }` callbacks.

**Motion design principles (Emil Kowalski / productivity tool context):**
- **Duration:** Keep transitions under 300ms for perceived responsiveness. Card-to-detail: 250ms. Swipe between straits: 200ms.
- **Easing:** Use `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard) for enter, `cubic-bezier(0, 0, 0.2, 1)` for exit.
- **Reduced motion:** Wrap all animation logic in a `prefers-reduced-motion` check. The codebase already has this pattern in `StraitMap.vue` (line 85-88). Reuse the same `matchMedia` check or extract into a shared `usePrefersReducedMotion` composable.
- **Edge indicators for swipe:** Show a subtle 4px gradient shadow on the left/right edge to hint at swipe availability. Animate it on `touchmove` to follow the finger.

**Particle system performance concern:** `StraitParticleCanvas` renders a WebGL/Canvas-based particle system. On mobile detail with `selected: true`, this runs continuously. Ensure:
- The canvas size matches the hero circle size (not the full viewport)
- Use `requestAnimationFrame` throttled to 30fps on mobile (vs 60fps desktop) — this is tracked in BF-88 but may need a quick guard here
- Pause particles when the tab is backgrounded (`document.hidden`)

#### Acceptance Criteria

- [ ] Card-to-detail transition animates smoothly (or gracefully degrades to fade)
- [ ] Swiping left/right on detail page navigates between straits
- [ ] Particle system renders in hero circle (if BF-78 is merged)
- [ ] `prefers-reduced-motion` disables all animations (transitions, swipe indicators, particles)
- [ ] Swipe does not conflict with vertical scrolling or horizontal-overflow content
- [ ] Edge indicators (chevrons or shadows) hint at swipe availability on first/last strait

## Alternative Approaches Considered

1. **Split `[[id]].vue` into `index.vue` + `[id].vue`:** Rejected — would duplicate page meta, validation, and head logic. The catch-all already handles both states cleanly.

2. **CSS-only show/hide (no composable):** Rejected — we need the `isMobile` value in script to conditionally import/render heavy components (StraitMap vs StraitCardList). CSS `display:none` would still mount and execute StraitMap's D3 logic on mobile.

3. **Separate mobile layout:** Rejected — the `layout-2` responsive override is simpler and keeps the page in the same layout system. A separate layout would require a layout-switching mechanism.

4. **View Transitions API for shared-element:** Deferred to future — Safari support is incomplete as of early 2026. CSS transitions are a reliable cross-browser fallback.

5. **VueUse `useMediaQuery` instead of custom composable:** Viable but adds `@vueuse/core` as a dependency. Decision deferred to implementer. If Phase 3 adopts `@vueuse/gesture`, installing `@vueuse/core` becomes a natural prerequisite.

(see brainstorm: `docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md`, "Technical Considerations")

## System-Wide Impact

- **Interaction graph:** `[[id]].vue` conditionally renders one of three components based on viewport. `StraitMap` (desktop) is unchanged. New mobile components (`StraitCardList`, `StraitMobileDetail`) use `navigateTo` for route changes, which triggers the same param watcher already in `[[id]].vue`.
- **Error propagation:** Invalid strait IDs are already handled by the `watch` in `[[id]].vue` that redirects to `/infographics/straits`. This works for both desktop and mobile branches.
- **State lifecycle risks:** None — mobile components are stateless (data from props/JSON). No new client-side state beyond `useViewport`.
- **API surface parity:** The embed route (`/embed/straits`) uses `StraitMap` directly in `layouts/embed.vue`. Embeds remain desktop-only — no mobile card layout in embeds. This is intentional (embeds are publisher-controlled iframes).
- **Bundle size impact:** New mobile components add ~5-10KB gzipped. If `defineAsyncComponent` is used for `StraitMap`, the mobile bundle shrinks by excluding the D3 dependency (~30KB gzipped) from the initial mobile load.

## Dependencies & Prerequisites

- **BF-78 (Particle system):** The hero circle decoration depends on `<StraitParticleCanvas>`. If not merged, the hero renders without particles (graceful degradation — the satellite image still shows).
- **BF-88 (Mobile particle performance):** Reduced particle count for mobile. Out of scope for this feature — particles will use desktop count until BF-88 ships.
- **Strait data:** `data/straits/straits.json` is the single data source. No new data needed.
- **Satellite image resolution:** Verify that `imageUrl` assets are high enough resolution for the 90vw hero circle on mobile (minimum ~350px source images).

## Resolved Questions

*(Previously "Open Questions" — resolved during plan deepening)*

1. **Shared data composable vs duplication:** **Resolved: Composable.** Create `composables/useStraitsData.ts` extracting `historicalByStrait()`, `LATEST_YEAR`, and the typed `straits` array. `StraitMap.vue` and `[[id]].vue` both import from it. The functions are pure and trivial to extract.

2. **StraitDetailPanel reuse vs new mobile component:** **Resolved: New layout, shared formatters.** Build `StraitMobileDetail.vue` as a new component with its own long-scroll layout. Extract `fmtUsd`, `fmtNum`, and `vesselSegments` computation into `utils/straitFormatters.ts`. Both desktop panel and mobile detail import from the shared utility. This avoids fighting the 320px panel's CSS while eliminating logic duplication.

3. **Card thumbnail:** **Resolved: Use `<StraitCircle>`.** Pass `radius={40}`, `imageUrl`, and `active={false}`. The existing component handles this without modification. No need for static image crops.

4. **Transition approach for Phase 3:** **Resolved: Timebox motion.dev `layoutId`, fall back to CSS fade.** Try `motion.dev` for 2 hours. If `layoutId` integration with `<ClientOnly>` and Nuxt routing proves too complex, fall back to a simple CSS opacity+scale transition. Both approaches are documented in the Phase 3 research insights above.

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `composables/useViewport.ts` | Reactive viewport detection (mobile/desktop) |
| `composables/useStraitsData.ts` | Shared data helpers extracted from StraitMap |
| `utils/straitFormatters.ts` | Shared formatting functions (`fmtUsd`, `fmtNum`, `vesselSegments`) |
| `components/straits/StraitCardList.vue` | Mobile card list container |
| `components/straits/StraitCard.vue` | Individual strait card |
| `components/straits/StraitMobileDetail.vue` | Mobile detail page |

### Modified Files

| File | Change |
|------|--------|
| `pages/infographics/straits/[[id]].vue` | Add viewport branching, `<ClientOnly>` wrapper, suppress rotate overlay, pass props to mobile components |
| `public/styles.css` | Add `.layout-2` responsive rules for mobile, footer position override |
| `components/StraitMap.vue` | Import `historicalByStrait` and `LATEST_YEAR` from `useStraitsData` instead of local definitions |
| `components/straits/StraitDetailPanel.vue` | Import `fmtUsd`, `fmtNum` from `utils/straitFormatters.ts` instead of local definitions |

### Unchanged Files (referenced)

| File | Role |
|------|------|
| `components/straits/StraitCircle.vue` | Reused in card thumbnail and mobile hero |
| `components/straits/StraitHistoryChart.vue` | Reused in mobile detail page |
| `components/RotateDeviceOverlay.vue` | Suppressed via page meta (no code change) |
| `layouts/default.vue` | Already supports `suppressRotateOverlay` (no change) |
| `types/strait.ts` | Type definitions (no change) |
| `data/straits/straits.json` | Data source (no change) |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) -- Key decisions carried forward: card list instead of map on mobile, nested routes with `[id]`, expand-in-place transition, 900px breakpoint, long-scroll detail page.

### Internal References

- `layouts/default.vue:15-16,26,31` -- `suppressRotateOverlay` page meta support
- `layouts/default.vue:65-76` -- `.page-wrapper` max-height and mobile override (scoped)
- `layouts/default.vue:103-116` -- footer absolute positioning (must override on mobile)
- `public/styles.css:64-86` -- master grid and `.layout-2` rules
- `public/styles.css:139-157` -- `.layout-home` scrollable pattern and footer override (reference for mobile layout)
- `public/styles.css:229-233` -- existing `prefers-reduced-motion` pattern
- `components/straits/StraitDetailPanel.vue:28-36` -- `fmtUsd` and `fmtNum` formatters to extract
- `components/straits/StraitDetailPanel.vue:16-26` -- `vesselSegments` computation to extract
- `components/straits/StraitCircle.vue` -- reusable circle component with satellite image
- `components/StraitMap.vue:33-41` -- `LATEST_YEAR` and `historicalByStrait` to extract

### External References

- [VueUse `useMediaQuery` — SSR support with `ssrWidth`](https://vueuse.org/core/useMediaQuery)
- [VueUse `useBreakpoints` — SSR configuration](https://vueuse.org/core/useBreakpoints)
- [VueUse Gesture `useDrag` — swipe detection API](https://github.com/vueuse/gesture)
- [motion.dev Vue layout animations — `layoutId` shared element](https://motion.dev/docs/vue-layout-animations)
- [Nuxt hydration best practices — `<ClientOnly>` and SSR safety](https://nuxt.com/docs/4.x/guide/best-practices/hydration)
- [Vue Router — reacting to param changes (lifecycle gotcha)](https://router.vuejs.org/guide/essentials/dynamic-matching.html#reacting-to-params-changes)
- [WCAG 2.5.5 — Target Size (Enhanced)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [CSS container queries vs media queries — hybrid approach](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
