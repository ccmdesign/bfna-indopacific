---
title: Route-Based Strait Selection (Desktop + Mobile Shared Routes)
type: feat
status: active
date: 2026-03-07
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
---

# Route-Based Strait Selection

## Overview

Attach each zoomed-in strait state to a URL so that selecting a strait on the desktop map navigates to `/infographics/straits/[id]` (e.g., `/infographics/straits/malacca`). Deep links work — opening that URL renders the map already zoomed in. Back button returns to the overview. This shares the same route structure planned for mobile (BF-89), where the same `/infographics/straits/[id]` URL renders a card detail page instead.

## Problem Statement / Motivation

Currently, clicking a strait circle on the desktop map zooms in via local component state (`selectedStraitId` ref inside `StraitMap.vue`). The URL never changes. This means:

- Strait views can't be shared via URL
- Browser back button doesn't work (no history entry for the zoom)
- SEO can't index individual strait pages
- The mobile version (BF-89) plans its own `/infographics/straits/[id]` routes — if desktop doesn't share this structure, the two experiences diverge and may conflict

## Proposed Solution

Use a **single optional-parameter page** (`pages/infographics/straits/[[id]].vue`) that handles both the overview and detail routes. On desktop (>900px), this renders `StraitMap` with the strait ID driving the zoom state via the route param. On mobile (<900px, when BF-89 is implemented), the same route conditionally renders the card list or card detail page.

### Key Behaviors

- **Click a strait circle** → `navigateTo('/infographics/straits/malacca')`
- **Click close / click background** → `navigateTo('/infographics/straits')`
- **Browser back from detail** → returns to `/infographics/straits`, zoom-out animation plays
- **Deep link to `/infographics/straits/malacca`** → renders directly in zoomed state, panels visible immediately (no animation)
- **While zoomed into a strait** → other strait circles are not clickable. The only action is going back to the overview
- **Invalid ID** (e.g., `/infographics/straits/banana`) → redirect to `/infographics/straits`

### Route Architecture

```
pages/infographics/straits/
  [[id]].vue          ← single optional-param page (replaces current straits.vue)
```

Nuxt generates two route patterns from this:
- `/infographics/straits` (id = undefined → overview)
- `/infographics/straits/:id` (id = 'malacca' → detail)

**Why `[[id]]` (optional param) instead of `index.vue` + `[id].vue`?**
Two separate page files would cause `StraitMap` to unmount and remount on every overview↔detail transition, destroying the CSS zoom animation. A single page file preserves the component instance, so the 600ms cubic-bezier transition works seamlessly when the route param changes.

## Technical Considerations

### State Migration: Local Ref → Route-Driven Computed

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

### Disabling Other Strait Clicks During Zoom

When a strait is selected, other circles should not be clickable. In `StraitData.vue`, the `@activate` emit should be suppressed when a different strait is already selected:

```typescript
// In StraitMap.vue onActivate:
function onActivate(id: string) {
  if (props.selectedStraitId && props.selectedStraitId !== id) return
  // ... rest of logic
}
```

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

For now, only the desktop path is implemented. The mobile branch can be added when BF-89 is picked up — the route structure is already in place.

**SSR consideration:** Use CSS media queries for the show/hide rather than JS viewport detection to avoid hydration mismatches. Server renders both, CSS hides the wrong one. Mobile components can be lazy-loaded (`defineAsyncComponent`) to avoid bundling them for desktop users.

### Invalid ID Handling

Validate the route param in the page setup. If the ID doesn't match a known strait, redirect:

```typescript
const VALID_IDS = new Set(['malacca', 'taiwan', 'bab-el-mandeb', 'luzon', 'lombok', 'hormuz'])

if (straitId.value && !VALID_IDS.has(straitId.value)) {
  navigateTo('/infographics/straits', { replace: true })
}
```

### Page Meta and SEO

`useStraitsHead()` should accept an optional strait object to set dynamic titles:

- Overview: "Indo-Pacific Straits"
- Detail: "Strait of Malacca — Indo-Pacific Straits"

`definePageMeta` stays the same (`layoutClass: 'layout-2'`, `embedSlug: 'straits'`).

### Prerendering

Currently straits is `draft` status so prerendering is off. When moved to `published`, the prerender route generation in `nuxt.config.ts` should be extended to include the 6 strait IDs. The route generation logic should be prepared but won't activate until status changes.

### Embed Routes

`/embed/straits/[id]` is **out of scope** for this iteration. Embeds continue to show the overview map only.

### Metric Toggle Persistence

The `sizeMetric` ref (tonnage/ships) is local to `StraitMap`. Since we're using a single page with optional param (no remount), the toggle state naturally persists across overview↔detail transitions. No change needed.

## Acceptance Criteria

- [ ] `/infographics/straits` renders the overview map (same as today)
- [ ] Clicking a strait circle navigates to `/infographics/straits/[id]` and zooms the map
- [ ] Browser back from a detail route returns to overview with zoom-out animation
- [ ] Deep link to `/infographics/straits/malacca` renders zoomed in with panels visible (no animation)
- [ ] While zoomed into a strait, other strait circles are not clickable
- [ ] Close button and background click navigate back to `/infographics/straits`
- [ ] Invalid IDs redirect to `/infographics/straits`
- [ ] Page title updates dynamically per strait (e.g., "Strait of Malacca — Indo-Pacific Straits")
- [ ] `definePageMeta` with `layoutClass: 'layout-2'` is preserved (master grid not broken)
- [ ] Embed route (`/embed/straits`) continues to work as overview-only
- [ ] Route structure is compatible with BF-89 mobile card layout (no conflicts)

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

## Implementation Scope

### Files to create
- `pages/infographics/straits/[[id]].vue` — new page (replaces `pages/infographics/straits.vue`)

### Files to modify
- `components/StraitMap.vue` — convert `selectedStraitId` from local ref to prop, refactor `onActivate`/`deselect` to emit events or call `navigateTo`
- `composables/useStraitsHead.ts` — accept optional strait for dynamic title
- `pages/embed/straits.vue` — no changes needed (stays overview-only)

### Files to delete
- `pages/infographics/straits.vue` — replaced by `pages/infographics/straits/[[id]].vue`

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) — mobile routing structure (`/infographics/straits/[id]`) that desktop must share
- **Linear BF-89:** [Mobile routing + conditional layout](https://linear.app/ccm-design/issue/BF-89/mobile-routing-conditional-layout-list-vs-map) — mobile counterpart using the same route structure
- **Linear BF-86:** Fisheye/barrel distortion (merged) — recent zoom work on the same component
- Current zoom implementation: [components/StraitMap.vue:53-92](components/StraitMap.vue#L53-L92)
- Current page: [pages/infographics/straits.vue](pages/infographics/straits.vue)
- Strait data and IDs: [data/straits/straits.json](data/straits/straits.json)
- Nuxt optional params docs: `pages/infographics/straits/[[id]].vue` pattern
