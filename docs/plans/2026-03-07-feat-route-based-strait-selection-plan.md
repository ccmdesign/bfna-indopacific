---
title: Route-Based Strait Selection (Desktop + Mobile Shared Routes)
type: feat
status: active
date: 2026-03-07
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
deepened: 2026-03-07
---

# Route-Based Strait Selection

## Enhancement Summary

**Deepened on:** 2026-03-07
**Sections enhanced:** 8
**Research sources:** Vue Router best practices skill, Nuxt 4 routing docs (Context7), design-motion-principles skill, codebase analysis (StraitMap.vue, StraitData.vue, nuxt.config.ts, useStraitsHead.ts)

### Key Improvements
1. Added typed route navigation pattern (Nuxt 4 `navigateTo` with route name objects) to replace string concatenation
2. Identified critical race condition: rapid back/forward browser navigation can stack conflicting zoom timers
3. Added `prefers-reduced-motion` handling for route-driven animations (accessibility gap)
4. Discovered `beforeEnter` guard gotcha -- param-only changes skip per-route guards, so invalid ID validation must use `watch` or `onBeforeRouteUpdate`, not a route guard
5. Added `nuxt.config.ts` prerender route generation pattern for when straits moves to `published` status

### New Risks Discovered
- **Timer stacking on rapid navigation:** Browser back/forward can fire multiple param changes faster than the 600ms animation, leaving stale `zoomingOut` state
- **SSG trailing slash mismatch:** Nuxt static generation may produce `/infographics/straits/malacca/index.html` -- confirm Netlify rewrite rules match
- **Embed route isolation:** `pages/embed/straits.vue` must NOT gain an optional param directory sibling, or Nuxt routing will conflict

---

## Overview

Attach each zoomed-in strait state to a URL so that selecting a strait on the desktop map navigates to `/infographics/straits/[id]` (e.g., `/infographics/straits/malacca`). Deep links work -- opening that URL renders the map already zoomed in. Back button returns to the overview. This shares the same route structure planned for mobile (BF-89), where the same `/infographics/straits/[id]` URL renders a card detail page instead.

## Problem Statement / Motivation

Currently, clicking a strait circle on the desktop map zooms in via local component state (`selectedStraitId` ref inside `StraitMap.vue`). The URL never changes. This means:

- Strait views can't be shared via URL
- Browser back button doesn't work (no history entry for the zoom)
- SEO can't index individual strait pages
- The mobile version (BF-89) plans its own `/infographics/straits/[id]` routes -- if desktop doesn't share this structure, the two experiences diverge and may conflict

## Proposed Solution

Use a **single optional-parameter page** (`pages/infographics/straits/[[id]].vue`) that handles both the overview and detail routes. On desktop (>900px), this renders `StraitMap` with the strait ID driving the zoom state via the route param. On mobile (<900px, when BF-89 is implemented), the same route conditionally renders the card list or card detail page.

### Key Behaviors

- **Click a strait circle** -> `navigateTo('/infographics/straits/malacca')`
- **Click close / click background** -> `navigateTo('/infographics/straits')`
- **Browser back from detail** -> returns to `/infographics/straits`, zoom-out animation plays
- **Deep link to `/infographics/straits/malacca`** -> renders directly in zoomed state, panels visible immediately (no animation)
- **While zoomed into a strait** -> other strait circles are not clickable. The only action is going back to the overview
- **Invalid ID** (e.g., `/infographics/straits/banana`) -> redirect to `/infographics/straits`

### Route Architecture

```
pages/infographics/straits/
  [[id]].vue          <- single optional-param page (replaces current straits.vue)
```

Nuxt generates two route patterns from this:
- `/infographics/straits` (id = undefined -> overview)
- `/infographics/straits/:id` (id = 'malacca' -> detail)

**Why `[[id]]` (optional param) instead of `index.vue` + `[id].vue`?**
Two separate page files would cause `StraitMap` to unmount and remount on every overview<->detail transition, destroying the CSS zoom animation. A single page file preserves the component instance, so the 600ms cubic-bezier transition works seamlessly when the route param changes.

#### Research Insights: Route Architecture

**Nuxt 4 naming convention:** The skill recommends descriptive param names (`[[straitId]]` over `[[id]]`). However, since this is the only param on this route and the directory name (`straits/`) provides context, `[[id]]` is acceptable here. If a second param is ever added, rename.

**Component instance reuse confirmed:** Vue Router reuses the component instance when only params change on the same route (per `router-param-change-no-lifecycle` reference). This is the exact behavior we need -- `onMounted` fires only once, and `watch` on the param handles transitions. This is a HIGH-impact gotcha that validates the `[[id]]` single-file approach.

**`beforeEnter` guard limitation:** Per `router-beforeenter-no-param-trigger` reference, a `beforeEnter` guard on this route would only fire when entering from a DIFFERENT route (e.g., from `/infographics/renewables`). Navigating from `/infographics/straits/malacca` to `/infographics/straits/banana` would NOT trigger `beforeEnter`. Invalid ID validation MUST use `watch` with `immediate: true` or `onBeforeRouteUpdate`, not a per-route guard.

---

## Technical Considerations

### State Migration: Local Ref -> Route-Driven Computed

The core change is replacing the local `selectedStraitId` ref with a computed derived from the route:

```typescript
// pages/infographics/straits/[[id]].vue
const route = useRoute()
const straitId = computed(() => route.params.id as string | undefined)

// Pass to StraitMap as a prop
<StraitMap :selected-strait-id="straitId" />
```

Inside `StraitMap.vue`, `selectedStraitId` becomes a prop instead of a local ref. The `onActivate()` function calls `navigateTo()` instead of setting the ref directly. The `deselect()` function calls `navigateTo('/infographics/straits')`.

**Key refactor points in `StraitMap.vue`:**

| Current (local state) | New (route-driven) |
|---|---|
| `const selectedStraitId = ref(null)` | `props.selectedStraitId` (from page) |
| `selectedStraitId.value = next` in `onActivate()` | `navigateTo('/infographics/straits/' + id)` |
| `selectedStraitId.value = null` in `deselect()` | `navigateTo('/infographics/straits')` |
| No route awareness | Watch `props.selectedStraitId` for animation orchestration |

#### Research Insights: State Migration

**Dual-mode operation for embed route:** The embed page (`pages/embed/straits.vue`) renders `<StraitMap>` without any route param. `StraitMap` must continue to work in both modes:
1. **Route-driven mode** (infographic page): `selectedStraitId` prop provided, `navigateTo` for selection changes
2. **Local-state mode** (embed page): no prop provided, selection stays local

Implementation pattern: Accept `selectedStraitId` as an optional prop with default `undefined`. If the prop is provided, emit an event (`@select`) and let the parent handle navigation. If not provided, fall back to local `ref` behavior. This avoids breaking the embed route.

```typescript
const props = withDefaults(defineProps<{
  selectedStraitId?: string | null
}>(), {
  selectedStraitId: undefined
})

const emit = defineEmits<{
  (e: 'select', id: string | null): void
}>()

// Internal state for embed/standalone mode
const _localSelectedId = ref<string | null>(null)

// Effective selected ID: prop wins if provided
const effectiveSelectedId = computed(() =>
  props.selectedStraitId !== undefined ? props.selectedStraitId : _localSelectedId.value
)

const isRouteControlled = computed(() => props.selectedStraitId !== undefined)
```

**Nuxt 4 typed navigation:** Prefer route name objects over string concatenation for type safety:

```typescript
// Preferred (type-safe)
navigateTo({ path: `/infographics/straits/${id}` })

// Even better once typed-router is confirmed:
navigateTo({ name: '/infographics/straits/[[id]]', params: { id } })
```

---

### Animation Orchestration on Route Change

The zoom-out animation depends on `zoomingOut`, `zoomOutFromId`, and a 600ms timer. These must trigger when the prop changes from a valid ID to `undefined`:

```typescript
watch(() => props.selectedStraitId, (newId, oldId) => {
  if (oldId && !newId) {
    // Zoom out: replicate deselect() animation logic
    zoomingOut.value = true
    zoomOutFromId.value = oldId
    panelsVisible.value = false
    zoomOutTimer = setTimeout(() => {
      zoomingOut.value = false
      zoomOutFromId.value = null
    }, 600)
  } else if (newId && !oldId) {
    // Zoom in: show panels after transition
    panelsVisible.value = false
    panelTimer = setTimeout(() => { panelsVisible.value = true }, 650)
  }
})
```

#### Research Insights: Animation Orchestration

**Race condition: rapid back/forward navigation.** If the user presses browser back then immediately forward (or rapidly navigates between straits), multiple `setTimeout` calls can stack. The existing `clearTimeout` guards on `zoomOutTimer` and `panelTimer` mitigate this, but the watcher must handle ALL transition paths, not just `oldId && !newId` and `newId && !oldId`:

```typescript
watch(() => props.selectedStraitId, (newId, oldId) => {
  // Clear ALL pending timers on ANY param change
  if (zoomOutTimer) { clearTimeout(zoomOutTimer); zoomOutTimer = null }
  if (panelTimer) { clearTimeout(panelTimer); panelTimer = null }
  panelsVisible.value = false

  if (oldId && !newId) {
    // Zoom out
    zoomingOut.value = true
    zoomOutFromId.value = oldId
    zoomOutTimer = setTimeout(() => {
      zoomingOut.value = false
      zoomOutFromId.value = null
    }, 600)
  } else if (newId && !oldId) {
    // Zoom in
    zoomingOut.value = false
    zoomOutFromId.value = null
    panelTimer = setTimeout(() => { panelsVisible.value = true }, 650)
  } else if (newId && oldId && newId !== oldId) {
    // Direct strait-to-strait transition (should not happen in current UX,
    // but defensive: treat as zoom-out then zoom-in)
    zoomingOut.value = false
    zoomOutFromId.value = null
    panelTimer = setTimeout(() => { panelsVisible.value = true }, 650)
  }
})
```

**`prefers-reduced-motion` interaction:** The CSS already disables `.map-bg` transitions when `prefers-reduced-motion: reduce` is set. However, the JavaScript timers (600ms zoom-out, 650ms panel-show) still run. For reduced-motion users, panels should appear immediately:

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// In the watcher:
const delay = prefersReducedMotion ? 0 : 650
panelTimer = setTimeout(() => { panelsVisible.value = true }, delay)
```

**Motion design principle (Emil Kowalski / Linear style):** The 600ms cubic-bezier(0.4, 0, 0.2, 1) is well-calibrated for a productivity/data-viz context. The 650ms panel delay (50ms after zoom completes) creates a clean sequential reveal. No changes needed to timing values -- they follow the "purposeful, not decorative" principle.

---

### Deep Link (No Animation on Initial Load)

When the page loads with an ID already in the route (deep link), the map should render directly in the zoomed state with panels visible. No zoom animation. Detect this in `onMounted`:

```typescript
onMounted(() => {
  if (props.selectedStraitId) {
    // Deep link: skip animation, show panels immediately
    panelsVisible.value = true
  }
})
```

The CSS transition on `.map-bg` will naturally not animate on initial render since there's no previous state to transition from.

#### Research Insights: Deep Link

**SSR/hydration timing:** On SSR, `onMounted` runs only on the client after hydration. The `selectedStraitId` prop will be available from the route param at hydration time, so the computed zoom styles (transform, scale) will render correctly in the initial HTML. The `panelsVisible = true` in `onMounted` will cause a single-frame flash where panels are hidden then shown. To avoid this on deep links, set `panelsVisible` in the initial `ref` based on the prop:

```typescript
const panelsVisible = ref(!!props.selectedStraitId)
```

This way, on deep link SSR, panels are visible from the first render. The `onMounted` approach is then only needed as a fallback for edge cases.

**Particle canvas on deep link:** `StraitParticleCanvas` renders conditionally with `v-if="selectedStraitId"`. On deep link, it will render immediately. Verify that `StraitParticleCanvas` handles mounting with an already-zoomed state (i.e., it doesn't assume it will see a zoom-in transition). Based on the current code, it accepts `selectedStrait` and `zoomScale` as props, so it should work correctly.

---

### Disabling Other Strait Clicks During Zoom

When a strait is selected, other circles should not be clickable. In `StraitData.vue`, the `@activate` emit should be suppressed when a different strait is already selected:

```typescript
// In StraitMap.vue onActivate:
function onActivate(id: string) {
  if (props.selectedStraitId && props.selectedStraitId !== id) return
  // ... rest of logic
}
```

#### Research Insights: Click Suppression

**Keyboard accessibility:** The `StraitData.vue` component has `@keydown.enter` and `@keydown.space` handlers that also emit `activate`. The guard in `onActivate` covers all input methods. However, consider also setting `tabindex="-1"` on non-selected straits when one is zoomed, so keyboard users can't Tab to them:

```vue
:tabindex="selectedStraitId && selectedStraitId !== id ? -1 : 0"
```

This requires passing `selectedStraitId` (or a `disabled` boolean) as a prop to `StraitData`. Currently `StraitData` doesn't know about the global selection state beyond its own `selected` prop.

**Pointer-events CSS fallback:** As an additional safeguard, straits that are not the selected one could get `pointer-events: none` via a CSS class when a selection is active. The existing `.strait-data--hidden` already does this for overlapping Taiwan/Luzon, but non-hidden, non-selected straits remain clickable at the CSS level.

---

### Desktop/Mobile Coexistence (BF-89 Compatibility)

The `[[id]].vue` page component conditionally renders based on viewport:

```vue
<template>
  <!-- Desktop: map with zoom -->
  <StraitMap v-if="isDesktop" :selected-strait-id="straitId" class="strait-map" />
  <!-- Mobile: card list or detail (BF-89, future) -->
  <MobileStraitView v-else :strait-id="straitId" />
</template>
```

For now, only the desktop path is implemented. The mobile branch can be added when BF-89 is picked up -- the route structure is already in place.

**SSR consideration:** Use CSS media queries for the show/hide rather than JS viewport detection to avoid hydration mismatches. Server renders both, CSS hides the wrong one. Mobile components can be lazy-loaded (`defineAsyncComponent`) to avoid bundling them for desktop users.

#### Research Insights: Mobile Coexistence

**Do NOT implement the mobile branch now.** The `v-if="isDesktop"` pattern should NOT be added until BF-89. For this PR, the template should remain exactly as it is today -- just `<StraitMap>` with the new prop. Adding a dead `v-else` branch adds complexity and an SSR hydration risk for no current benefit.

**Future-proofing without code:** Instead of code, add a comment in the template noting where the mobile branch will go:

```vue
<template>
  <!-- BF-89: Mobile branch will conditionally render here based on CSS media query -->
  <StraitMap :selected-strait-id="straitId" class="strait-map" @select="onSelect" />
</template>
```

---

### Invalid ID Handling

Validate the route param in the page setup. If the ID doesn't match a known strait, redirect:

```typescript
const VALID_IDS = new Set(['malacca', 'taiwan', 'bab-el-mandeb', 'luzon', 'lombok', 'hormuz'])

if (straitId.value && !VALID_IDS.has(straitId.value)) {
  navigateTo('/infographics/straits', { replace: true })
}
```

#### Research Insights: Invalid ID Handling

**Critical gotcha -- `beforeEnter` will NOT catch param-only invalid IDs.** As documented in the Vue Router `router-beforeenter-no-param-trigger` reference, if a user is already on `/infographics/straits/malacca` and navigates to `/infographics/straits/banana`, `beforeEnter` does NOT fire. The validation MUST be reactive.

**Use `watch` with `immediate: true` instead of bare script execution:**

```typescript
watch(
  () => route.params.id as string | undefined,
  (id) => {
    if (id && !VALID_IDS.has(id)) {
      navigateTo('/infographics/straits', { replace: true })
    }
  },
  { immediate: true }
)
```

**Derive VALID_IDS from data, not hardcoded:**

```typescript
import straitsData from '~/data/straits/straits.json'

const VALID_IDS = new Set(straitsData.straits.map((s: { id: string }) => s.id))
```

This ensures the validation stays in sync when strait IDs are added or changed in the data file. The current hardcoded set (`malacca`, `taiwan`, etc.) would silently break if a new strait is added to `straits.json`.

**`replace: true` is correct** -- it prevents the invalid URL from appearing in browser history, so the user doesn't get stuck in a back-button loop.

---

### Page Meta and SEO

`useStraitsHead()` should accept an optional strait object to set dynamic titles:

- Overview: "Indo-Pacific Straits"
- Detail: "Strait of Malacca -- Indo-Pacific Straits"

`definePageMeta` stays the same (`layoutClass: 'layout-2'`, `embedSlug: 'straits'`).

#### Research Insights: SEO

**Make `useStraitsHead` reactive to the route param.** The current implementation accepts static overrides. For dynamic titles, it needs to accept a computed or ref:

```typescript
// composables/useStraitsHead.ts
export function useStraitsHead(straitName?: MaybeRef<string | undefined>, overrides: UseHeadInput = {}) {
  const name = toRef(straitName)

  useHead(computed(() => {
    const title = name.value
      ? `${name.value} — Indo-Pacific Straits`
      : 'Indo-Pacific Straits'

    return {
      title,
      link: [
        {
          rel: 'preload',
          as: 'image',
          type: 'image/webp',
          href: '/assets/map-indo-pacific-2x.webp',
        },
        ...((overrides.link as any[]) || []),
      ],
      meta: [
        ...((overrides.meta as any[]) || []),
      ],
    }
  }))
}
```

**Usage in the page:**

```typescript
const selectedStrait = computed(() =>
  straitsData.straits.find((s) => s.id === straitId.value)
)
const straitName = computed(() => selectedStrait.value?.name)
useStraitsHead(straitName)
```

**OG meta tags for sharing:** When a strait is selected, the page should also set `og:title` and `og:description` for social sharing. This can be deferred to a follow-up but is worth noting since shareability is a primary motivation.

**Canonical URL:** Add a canonical link tag to prevent search engines from treating param variations as duplicates:

```typescript
link: [
  { rel: 'canonical', href: `https://indopacific.bfrancefoundation.org/infographics/straits${straitId.value ? '/' + straitId.value : ''}` }
]
```

---

### Prerendering

Currently straits is `draft` status so prerendering is off. When moved to `published`, the prerender route generation in `nuxt.config.ts` should be extended to include the 6 strait IDs. The route generation logic should be prepared but won't activate until status changes.

#### Research Insights: Prerendering

**Concrete implementation for `nuxt.config.ts`:** The current prerender logic (line 13) maps `publishedInfographics` to flat routes. When straits moves to published, extend it:

```typescript
import straitsData from './data/straits/straits.json'

// In nitro.prerender.routes:
routes: publishedInfographics.flatMap((i) => {
  const base = [`/embed/${i.slug}`, `/infographics/${i.slug}`, `/test/embeds/${i.slug}`]
  // Add sub-routes for infographics that have detail pages
  if (i.slug === 'straits') {
    const straitIds = straitsData.straits.map((s: { id: string }) => s.id)
    base.push(...straitIds.map((id: string) => `/infographics/straits/${id}`))
  }
  return base
})
```

**SSG trailing slash consideration:** Nuxt static generation creates `index.html` files. `/infographics/straits/malacca` becomes `/infographics/straits/malacca/index.html`. Verify Netlify's `_redirects` or `netlify.toml` handles this correctly for SPA fallback. Since the project uses `nitro.preset: 'static'`, Nuxt should handle this automatically, but test with `npx nuxi generate` and verify the output directory structure.

---

### Embed Routes

`/embed/straits/[id]` is **out of scope** for this iteration. Embeds continue to show the overview map only.

#### Research Insights: Embed Isolation

**Critical: Do NOT create `pages/embed/straits/[[id]].vue`.** The embed page at `pages/embed/straits.vue` must remain a flat file. If a `pages/embed/straits/` directory is created alongside it, Nuxt's file-based routing will treat `straits.vue` as a parent layout expecting `<NuxtPage />` inside it, breaking the embed entirely. The embed route is isolated by design.

**StraitMap dual-mode requirement:** Since the embed page renders `<StraitMap>` without passing `selectedStraitId`, `StraitMap` must continue to function with local state when the prop is not provided (see State Migration section above for the dual-mode pattern).

---

### Metric Toggle Persistence

The `sizeMetric` ref (tonnage/ships) is local to `StraitMap`. Since we're using a single page with optional param (no remount), the toggle state naturally persists across overview<->detail transitions. No change needed.

---

### Timer Cleanup on Unmount

#### Research Insights: Cleanup

**Existing cleanup is good but incomplete.** `onBeforeUnmount` currently clears `resizeObserver`, `zoomOutTimer`, and `panelTimer`. After the refactor, ensure the watcher's timer references are the same variables being cleaned up. If the watcher creates new timer references, they must also be cleared.

**The component will NOT unmount on param changes** (confirmed by Vue Router behavior), so `onBeforeUnmount` only fires when navigating away from the straits page entirely. This is correct -- param changes are handled by the watcher, and full navigation away cleans up everything.

---

## Acceptance Criteria

- [ ] `/infographics/straits` renders the overview map (same as today)
- [ ] Clicking a strait circle navigates to `/infographics/straits/[id]` and zooms the map
- [ ] Browser back from a detail route returns to overview with zoom-out animation
- [ ] Deep link to `/infographics/straits/malacca` renders zoomed in with panels visible (no animation)
- [ ] While zoomed into a strait, other strait circles are not clickable
- [ ] Close button and background click navigate back to `/infographics/straits`
- [ ] Invalid IDs redirect to `/infographics/straits`
- [ ] Page title updates dynamically per strait (e.g., "Strait of Malacca -- Indo-Pacific Straits")
- [ ] `definePageMeta` with `layoutClass: 'layout-2'` is preserved (master grid not broken)
- [ ] Embed route (`/embed/straits`) continues to work as overview-only
- [ ] Route structure is compatible with BF-89 mobile card layout (no conflicts)
- [ ] Rapid back/forward navigation does not leave stale zoom state (timer race condition)
- [ ] `prefers-reduced-motion` users see panels immediately (no delayed reveal)

## Success Metrics

- Every strait is individually shareable via URL
- Browser back/forward works correctly through strait selection history
- Zero visual regressions on the zoom animation
- Master grid layout (`layout-2`) is unbroken

## Dependencies & Risks

**Dependencies:**
- No external dependencies. All changes are within existing Nuxt/Vue infrastructure.

**Risks:**
- **Animation continuity:** The `[[id]]` optional param approach should preserve the component instance, but if Nuxt's router treats the param change as a full page transition, StraitMap could remount. Verify with `onMounted` logging during development.
- **Master grid breakage:** Moving `straits.vue` to `straits/[[id]].vue` changes the file path but the route stays the same. Verify `layoutClass: 'layout-2'` still applies correctly.
- **Hydration mismatch:** If mobile conditional rendering is added later (BF-89), CSS-based show/hide is safer than JS-based. Plan for this now even though mobile is deferred.
- **Timer race condition (NEW):** Rapid browser back/forward can fire multiple param changes faster than the 600ms animation completes. The watcher MUST clear all pending timers before starting new ones.
- **`beforeEnter` guard bypass (NEW):** Route-level `beforeEnter` guards do NOT fire on param-only changes. Invalid ID validation must use a reactive `watch`, not a navigation guard.
- **SSG trailing slash (NEW):** Verify that `npx nuxi generate` produces correct static files for `/infographics/straits/malacca` and that Netlify serves them correctly.
- **Embed route conflict (NEW):** Never create a `pages/embed/straits/` directory -- it would turn the existing `pages/embed/straits.vue` into a parent layout, breaking embeds.
- **VALID_IDS drift (NEW):** Hardcoded ID sets will silently break when `straits.json` is updated. Derive from data.

## Implementation Scope

### Files to create
- `pages/infographics/straits/[[id]].vue` -- new page (replaces `pages/infographics/straits.vue`)

### Files to modify
- `components/StraitMap.vue` -- convert `selectedStraitId` from local ref to optional prop with dual-mode (route-driven vs local-state for embeds), refactor `onActivate`/`deselect` to emit `select` event, add reduced-motion handling
- `composables/useStraitsHead.ts` -- accept reactive `straitName` ref for dynamic title
- `pages/embed/straits.vue` -- no changes needed (stays overview-only, confirms dual-mode works)

### Files to delete
- `pages/infographics/straits.vue` -- replaced by `pages/infographics/straits/[[id]].vue`

### Files to verify (no changes, but test)
- `nuxt.config.ts` -- confirm `routeRules` for draft straits still apply to the new route pattern
- `public/styles.css` -- confirm `.layout-2` grid placement unaffected by file move
- `components/straits/StraitData.vue` -- confirm `@activate` emit still works with parent guard

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) -- mobile routing structure (`/infographics/straits/[id]`) that desktop must share
- **Linear BF-89:** [Mobile routing + conditional layout](https://linear.app/ccm-design/issue/BF-89/mobile-routing-conditional-layout-list-vs-map) -- mobile counterpart using the same route structure
- **Linear BF-86:** Fisheye/barrel distortion (merged) -- recent zoom work on the same component
- Current zoom implementation: [components/StraitMap.vue:53-92](components/StraitMap.vue#L53-L92)
- Current page: [pages/infographics/straits.vue](pages/infographics/straits.vue)
- Strait data and IDs: [data/straits/straits.json](data/straits/straits.json)
- Nuxt optional params docs: `pages/infographics/straits/[[id]].vue` pattern
- **Vue Router gotcha -- param changes skip lifecycle hooks:** `~/.claude/skills/vue-router-best-practices/reference/router-param-change-no-lifecycle.md`
- **Vue Router gotcha -- `beforeEnter` ignores param changes:** `~/.claude/skills/vue-router-best-practices/reference/router-beforeenter-no-param-trigger.md`
- **Nuxt 4 routing docs (Context7):** Optional params, `navigateTo`, `useRoute` typed usage
