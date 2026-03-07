---
title: Route-Based Strait Selection (Desktop URL-Driven Zoom)
type: feat
status: active
date: 2026-03-07
linear: BF-96
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
---

# Route-Based Strait Selection (Desktop URL-Driven Zoom)

## Overview

Attach each zoomed-in strait state to a URL so selecting a strait navigates to `/infographics/straits/[id]` (e.g., `/infographics/straits/malacca`). Deep links render the map already zoomed in. The browser back button returns to the overview with a zoom-out animation. This shares the same route structure planned for mobile cards in BF-89 (see brainstorm: `docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md`).

## Problem Statement / Motivation

Currently, clicking a strait circle zooms in via local component state (`selectedStraitId` ref inside `StraitMap.vue`, line 55). The URL never changes. This means:

- Strait views cannot be shared via URL
- Browser back button does not work (no history entry for the zoom)
- SEO cannot index individual strait pages
- The mobile version (BF-89) plans its own `/infographics/straits/[id]` routes -- if desktop does not share this structure, the two experiences diverge

## Proposed Solution

Use a **single optional-parameter page** (`pages/infographics/straits/[[id]].vue`) that handles both overview and detail routes. The `[[id]]` pattern is critical: two separate page files (`index.vue` + `[id].vue`) would cause `StraitMap` to unmount/remount on every transition, destroying the CSS zoom animation. A single page preserves the component instance so the 600ms cubic-bezier transition works seamlessly.

### Key Behaviors

| User Action | Result |
|---|---|
| Click a strait circle | Navigate to `/infographics/straits/malacca` |
| Click close / background | Navigate to `/infographics/straits` |
| Browser back from detail | Return to overview with zoom-out animation |
| Deep link to `/infographics/straits/malacca` | Render zoomed in, panels visible immediately (no animation) |
| Click another circle while zoomed | No-op (only close/back exits zoom) |
| Invalid ID (e.g., `/infographics/straits/banana`) | Redirect to `/infographics/straits` |

## Technical Approach

### Phase 1: Create the Optional-Param Page

**Create:** `pages/infographics/straits/[[id]].vue`

This replaces `pages/infographics/straits.vue`. The page reads the route param, validates it, and passes it down to `StraitMap` as a prop.

```vue
<!-- pages/infographics/straits/[[id]].vue -->
<script setup lang="ts">
import straitsData from '~/data/straits/straits.json'

definePageMeta({
  layoutClass: 'layout-2',
  embedSlug: 'straits',
  embedTitle: 'Indo-Pacific Straits',
  footerSource: {
    url: 'https://portwatch.imf.org/',
    label: 'Source: IMF PortWatch'
  }
})

const route = useRoute()
const VALID_IDS = new Set(straitsData.straits.map((s: { id: string }) => s.id))
// Valid IDs: malacca, taiwan, bab-el-mandeb, luzon, lombok, hormuz

const selectedStraitId = computed(() => {
  const id = route.params.id as string | undefined
  return id && VALID_IDS.has(id) ? id : undefined
})

// Redirect invalid IDs
if (route.params.id && !VALID_IDS.has(route.params.id as string)) {
  navigateTo('/infographics/straits', { replace: true })
}

// Dynamic head title
const selectedStrait = computed(() =>
  straitsData.straits.find((s: { id: string }) => s.id === selectedStraitId.value)
)
useStraitsHead(selectedStrait.value?.name)
</script>

<template>
  <StraitMap :selected-strait-id="selectedStraitId" class="strait-map" />
</template>
```

### Phase 2: Refactor StraitMap.vue to Accept Prop

**Modify:** `components/StraitMap.vue`

The core change is converting `selectedStraitId` from a local ref to a prop, and replacing direct state mutations with `navigateTo()` calls.

#### Changes at a glance

| Current (local state) | New (route-driven) | Line(s) |
|---|---|---|
| `const selectedStraitId = ref<string \| null>(null)` | `props.selectedStraitId` (from page) | 55 |
| `selectedStraitId.value = next` in `onActivate()` | `navigateTo('/infographics/straits/' + id)` | 66-92 |
| `selectedStraitId.value = null` in `deselect()` | `navigateTo('/infographics/straits')` | 202-211 |
| No route awareness | `watch(props.selectedStraitId)` for animation orchestration | new |

#### Detailed refactor

1. **Add prop definition** -- replace line 55 (`const selectedStraitId = ref<string | null>(null)`) with a prop:

```typescript
const props = defineProps<{
  selectedStraitId?: string
}>()
```

2. **Replace `onActivate()`** (lines 66-92) -- instead of toggling the local ref, navigate:

```typescript
function onActivate(id: string) {
  // Block clicks on other straits while one is selected
  if (props.selectedStraitId && props.selectedStraitId !== id) return
  // Toggle: if clicking the selected strait, deselect; otherwise select
  if (props.selectedStraitId === id) {
    navigateTo('/infographics/straits')
  } else {
    navigateTo('/infographics/straits/' + id)
  }
}
```

3. **Replace `deselect()`** (lines 202-211):

```typescript
function deselect() {
  if (!props.selectedStraitId) return
  navigateTo('/infographics/straits')
}
```

4. **Add route-change watcher** for animation orchestration. The zoom-out/zoom-in timers (`zoomingOut`, `panelsVisible`, `zoomOutFromId`) must trigger when the prop changes:

```typescript
watch(() => props.selectedStraitId, (newId, oldId) => {
  // Always hide panels immediately on change
  panelsVisible.value = false
  if (panelTimer) clearTimeout(panelTimer)

  if (oldId && !newId) {
    // Zoom out
    zoomingOut.value = true
    zoomOutFromId.value = oldId
    if (zoomOutTimer) clearTimeout(zoomOutTimer)
    zoomOutTimer = setTimeout(() => {
      zoomingOut.value = false
      zoomOutFromId.value = null
    }, 600)
  } else if (newId && !oldId) {
    // Zoom in -- show panels after transition
    if (zoomOutTimer) {
      clearTimeout(zoomOutTimer)
      zoomingOut.value = false
    }
    panelTimer = setTimeout(() => { panelsVisible.value = true }, 650)
  }
})
```

5. **Deep link handling** in `onMounted` -- if the prop already has an ID on mount, skip animation and show panels immediately:

```typescript
onMounted(() => {
  // ... existing ResizeObserver setup ...
  if (props.selectedStraitId) {
    panelsVisible.value = true
  }
})
```

6. **Update all internal references** from `selectedStraitId.value` to `props.selectedStraitId`:
   - `selectedStrait` computed (line 148)
   - `getZoomedRadius()` (line 182)
   - `isHidden()` (line 197-199)
   - Template bindings: `:selected`, `:zooming-out`, `v-if="selectedStraitId"`, `ScaleLegend` class, `metric-toggle` class

7. **Keep local animation state** -- `zoomingOut`, `zoomOutFromId`, `panelsVisible` remain as local refs since they are transient UI state, not route state.

### Phase 3: Update useStraitsHead

**Modify:** `composables/useStraitsHead.ts`

Accept an optional strait name for dynamic page titles:

```typescript
export function useStraitsHead(straitName?: string, overrides: UseHeadInput = {}) {
  const title = straitName
    ? `${straitName} -- Indo-Pacific Straits`
    : 'Indo-Pacific Straits'

  const base: UseHeadInput = {
    title,
    link: [
      {
        rel: 'preload',
        as: 'image',
        type: 'image/webp',
        href: '/assets/map-indo-pacific-2x.webp',
      },
    ]
  }
  // ... rest unchanged ...
}
```

**Note:** The embed page (`pages/embed/straits.vue`, line 7) calls `useStraitsHead()` with no arguments -- this continues to work unchanged.

### Phase 4: Delete Old Page

**Delete:** `pages/infographics/straits.vue`

Replaced by `pages/infographics/straits/[[id]].vue`.

### Phase 5: Update Embed Page (No Changes Needed)

The embed page at `pages/embed/straits.vue` renders `<StraitMap class="strait-map" />` without passing a `selectedStraitId` prop. Since the prop is optional (`selectedStraitId?: string`), the embed continues to show the overview-only map. No changes needed.

## System-Wide Impact

### Interaction Graph

- User clicks a `StraitData` circle -> `@activate` emits to `StraitMap.onActivate()` -> `navigateTo()` -> Vue Router updates URL -> Nuxt re-renders `[[id]].vue` with new `route.params.id` -> computed `selectedStraitId` updates -> prop flows to `StraitMap` -> watcher fires animation orchestration -> zoom CSS transition plays

### State Lifecycle Risks

- **Component remount risk:** The `[[id]]` optional param approach should preserve the `StraitMap` instance across param changes. If Nuxt treats it as a page change (unmount/remount), the zoom animation breaks. Verify with `onMounted` logging during development.
- **Timer cleanup:** `zoomOutTimer` and `panelTimer` are cleaned up in `onBeforeUnmount` (line 115-118). This is unchanged and still correct.
- **ResizeObserver lifecycle:** Unchanged. Still created in `onMounted`, disconnected in `onBeforeUnmount`.

### API Surface Parity

- `StraitMap` gains a new optional prop `selectedStraitId`. All existing call sites (`pages/embed/straits.vue`) pass no prop, which is valid.
- `useStraitsHead()` gains an optional first argument. All existing call sites pass zero or one argument, which is backward-compatible.

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
- [ ] Metric toggle (tonnage/ships) persists across overview-to-detail transitions (no remount)
- [ ] Route structure is compatible with BF-89 mobile card layout (no conflicts)

## Success Metrics

- Every strait is individually shareable via URL
- Browser back/forward works correctly through strait selection history
- Zero visual regressions on the zoom animation
- Master grid layout (`layout-2`) is unbroken

## Dependencies & Risks

**Dependencies:**
- No external dependencies. All changes use existing Nuxt/Vue Router infrastructure.

**Risks:**
1. **Animation continuity** -- If Nuxt's router treats the `[[id]]` param change as a full page transition, `StraitMap` will unmount and remount, destroying the zoom animation. Mitigation: verify with `onMounted` logging during development. If this occurs, the fallback is to use `key` on the component to force instance preservation.
2. **Master grid breakage** -- Moving `straits.vue` to `straits/[[id]].vue` changes the file path but the route stays the same. Verify `layoutClass: 'layout-2'` still applies correctly in the master grid.
3. **Prerendering** -- Straits is currently `draft` status in `data/infographics.ts` (line 29), so prerendering is disabled. When moved to `published`, the prerender route generation in `nuxt.config.ts` (lines 13-17) will need to include the 6 strait ID sub-routes. This is out of scope for this iteration but should be noted.
4. **Hydration mismatch** -- If BF-89 later adds conditional mobile rendering via JS viewport detection, it could cause hydration mismatches. Use CSS media queries for show/hide instead.

## Implementation Scope

### Files to create
- `pages/infographics/straits/[[id]].vue` -- new optional-param page

### Files to modify
- `components/StraitMap.vue` -- convert `selectedStraitId` from local ref to prop; `onActivate`/`deselect` use `navigateTo`; add prop watcher for animation; deep link handling in `onMounted`
- `composables/useStraitsHead.ts` -- accept optional strait name for dynamic title

### Files to delete
- `pages/infographics/straits.vue` -- replaced by folder structure

### Files unchanged
- `pages/embed/straits.vue` -- no changes needed (overview-only, no prop passed)
- `components/straits/StraitData.vue` -- no changes needed (still emits `@activate`)
- `nuxt.config.ts` -- no changes needed (straits is draft, prerender not active)

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) -- key decision: shared `/infographics/straits/[id]` route structure for desktop and mobile
- Current zoom implementation: `components/StraitMap.vue:53-92` (local ref state)
- Current page: `pages/infographics/straits.vue` (17 lines, defines meta + renders StraitMap)
- Embed page: `pages/embed/straits.vue` (overview-only, no selectedStraitId prop)
- Strait data and IDs: `data/straits/straits.json` (6 straits: malacca, taiwan, bab-el-mandeb, luzon, lombok, hormuz)
- Existing design spec: `docs/plans/2026-03-07-feat-route-based-strait-selection-plan.md` (in main repo)
- Nuxt optional params: `[[id]]` pattern for optional catch-all route parameters
