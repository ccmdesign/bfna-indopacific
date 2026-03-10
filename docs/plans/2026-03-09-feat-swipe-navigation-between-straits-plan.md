---
title: "feat: Swipe navigation between straits"
type: feat
status: active
date: 2026-03-09
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
---

# Swipe Navigation Between Straits

Add horizontal swipe gesture on the mobile detail page (`StraitMobileDetail.vue`) to navigate between straits in alphabetical order. Swipe left advances to the next strait, swipe right goes to the previous, with route updates and directional transitions.

This was confirmed as a key behavior in the brainstorm (see brainstorm: `docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md`, Resolved Question #2: "Swipe between straits — Yes").

## Overview

The mobile detail page currently supports only back-navigation (back button / browser back). Users have no way to browse between straits without returning to the card list first. Adding horizontal swipe gestures creates a fluid, app-like browsing experience that matches native mobile conventions.

## Proposed Solution

Create a `useSwipeNavigation` composable that:
1. Listens for horizontal touch gestures on the detail page container
2. Discriminates horizontal swipes from vertical scrolls using an angle threshold
3. On a valid swipe, navigates to the adjacent strait via `navigateTo()`
4. Provides a reactive `swipeDirection` signal so transitions can match the gesture direction

### Strait Ordering

The alphabetical ordering already exists in `StraitCardList.vue` (`a.name.localeCompare(b.name)`). This ordering must be extracted into a shared utility in `utils/straitsData.ts` so both the card list and swipe navigation use the same sequence.

**Alphabetical order (from current data):**
1. Bab el-Mandeb
2. Lombok Strait
3. Luzon Strait
4. Strait of Hormuz
5. Strait of Malacca
6. Taiwan Strait

Navigation wraps: swiping left on Taiwan Strait goes to Bab el-Mandeb; swiping right on Bab el-Mandeb goes to Taiwan Strait.

## Technical Approach

### 1. Extract sorted strait order — `utils/straitsData.ts`

Add a `sortedStraits` export and helper functions:

```ts
// utils/straitsData.ts
export const sortedStraits = [...straits].sort((a, b) => a.name.localeCompare(b.name))

export function getAdjacentStrait(currentId: string, direction: 'next' | 'prev'): Strait | null {
  const idx = sortedStraits.findIndex(s => s.id === currentId)
  if (idx === -1) return null
  const len = sortedStraits.length
  const newIdx = direction === 'next'
    ? (idx + 1) % len
    : (idx - 1 + len) % len
  return sortedStraits[newIdx]
}
```

Update `StraitCardList.vue` to use the shared `sortedStraits` instead of its own inline sort.

### 2. Create swipe composable — `composables/useSwipeNavigation.ts`

A zero-dependency composable using native `touchstart`, `touchmove`, `touchend` events. No external libraries needed — the project has no gesture library and adding one for a single use case is unnecessary overhead.

**Key parameters:**
- `minDistance`: minimum horizontal distance to trigger (default: 50px)
- `maxVerticalRatio`: max vertical-to-horizontal ratio to distinguish from scroll (default: 0.5 — i.e., the gesture must be at least 2x more horizontal than vertical)
- `velocityThreshold`: optional minimum velocity for fast flicks (px/ms)

**Touch discrimination algorithm:**
1. On `touchstart`: record start position and timestamp
2. On `touchmove`: compute angle. If the gesture is clearly vertical (ratio > threshold), set a `rejected` flag and stop tracking. This must happen early to avoid fighting with browser scroll.
3. On `touchend`: if not rejected and horizontal distance exceeds `minDistance`, fire the swipe callback with direction.

**Critical: do not call `preventDefault()` on `touchmove`** unless the gesture is confirmed horizontal. Calling it too early blocks vertical scrolling. The composable should use a `{ passive: true }` listener for `touchmove` during the ambiguous phase, which means it cannot prevent default at all — instead, it simply ignores gestures that turn out to be vertical.

```ts
// composables/useSwipeNavigation.ts
export function useSwipeNavigation(
  containerRef: Ref<HTMLElement | null>,
  options: {
    onSwipe: (direction: 'left' | 'right') => void
    minDistance?: number
    maxVerticalRatio?: number
  }
)
```

**Lifecycle:** Attach listeners in `onMounted`, clean up in `onScopeDispose`. SSR-safe (no-op on server).

### 3. Integrate into `StraitMobileDetail.vue`

```ts
// Inside StraitMobileDetail.vue <script setup>
import { getAdjacentStrait } from '~/utils/straitsData'
import { useSwipeNavigation } from '~/composables/useSwipeNavigation'

const detailRef = ref<HTMLElement | null>(null)

useSwipeNavigation(detailRef, {
  onSwipe(direction) {
    const target = getAdjacentStrait(
      props.strait.id,
      direction === 'left' ? 'next' : 'prev'
    )
    if (target) {
      navigateTo(`/infographics/straits/${target.id}`)
    }
  }
})
```

Add `ref="detailRef"` to the root `.strait-mobile-detail` div.

### 4. Transition direction — extend `useStraitTransition.ts`

The existing FLIP transition animates card-to-detail (vertical expand). For swipe navigation between detail pages, a simpler **horizontal slide** transition is appropriate — the full FLIP is unnecessary since we're going detail-to-detail, not card-to-detail.

**Approach:** Use CSS transitions on the `.strait-mobile-detail` container, triggered by a reactive `swipeDirection` class:

```css
/* Slide-out left (going to next strait) */
.strait-mobile-detail--exit-left {
  animation: slideOutLeft 250ms ease-in forwards;
}
/* Slide-in from right (arriving from swipe left / next) */
.strait-mobile-detail--enter-right {
  animation: slideInRight 250ms ease-out forwards;
}

@keyframes slideOutLeft {
  to { transform: translateX(-30%); opacity: 0; }
}
@keyframes slideInRight {
  from { transform: translateX(30%); opacity: 0; }
}
```

The transition does NOT need to be a full-width slide — a subtle 30% offset with opacity fade feels natural and performs well.

**Implementation option:** Since Vue re-uses the `StraitMobileDetail` component when navigating between straits (same route, different param), the transition must be coordinated via:
- A `key` attribute on `StraitMobileDetail` set to `strait.id` to force re-mount, OR
- A reactive watcher on `props.strait.id` that plays exit/enter animations without re-mounting

The `key` approach is simpler and recommended. In `[[id]].vue`:

```vue
<StraitMobileDetail
  :key="selectedStrait.id"
  :strait="selectedStrait"
  ...
/>
```

Wrap with Vue's `<Transition>` component using mode `out-in` and dynamic `name` based on swipe direction.

### 5. Route and history integration

When swiping between straits, the route updates via `navigateTo()`. The existing `handleBack()` and popstate logic in `StraitMobileDetail` must not interfere:

- The dummy `history.pushState({ straitTransition: true })` currently pushed on mount is for back-to-list interception. When navigating via swipe, this entry should NOT be pushed again — the swipe replaces the current history entry rather than stacking.
- Consider using `navigateTo(path, { replace: true })` for swipe navigation so the back button always returns to the card list (not through each swiped strait).

### 6. Visual swipe indicator (optional enhancement)

Add subtle prev/next indicators at the horizontal edges of the detail page:

```
← Lombok     [current detail content]     Luzon →
```

This can be a minimal text hint that appears on first visit and fades after the user's first swipe, or always-visible chevrons at the bottom of the page. This is optional and can be deferred.

## Acceptance Criteria

- [ ] Horizontal swipe left on the detail page navigates to the next strait (alphabetical)
- [ ] Horizontal swipe right navigates to the previous strait
- [ ] Navigation wraps around (last → first, first → last)
- [ ] Route URL updates to reflect the new strait (`/infographics/straits/[id]`)
- [ ] Vertical scrolling is not impaired by the swipe listener
- [ ] Transition animates in the direction of the swipe (left swipe = content slides left)
- [ ] Back button from a swiped-to strait returns to the card list (not the previous strait)
- [ ] Works correctly on iOS Safari and Chrome Android
- [ ] Respects `prefers-reduced-motion` — skip animation, still navigate
- [ ] No new dependencies added (pure touch event handling)

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `composables/useSwipeNavigation.ts` | **Create** | Touch gesture composable with horizontal/vertical discrimination |
| `utils/straitsData.ts` | **Modify** | Add `sortedStraits` export and `getAdjacentStrait()` helper |
| `components/straits/StraitMobileDetail.vue` | **Modify** | Wire up swipe composable, add ref to root element |
| `components/straits/StraitCardList.vue` | **Modify** | Use shared `sortedStraits` from `utils/straitsData.ts` |
| `pages/infographics/straits/[[id]].vue` | **Modify** | Add `key` to `StraitMobileDetail`, wrap in `<Transition>` with dynamic name |
| `public/styles.css` | **Modify** | Add slide transition keyframes (or scoped in `[[id]].vue`) |

## Dependencies & Risks

- **Touch event passive listeners:** Modern browsers default `touchmove` to passive on document-level. The composable uses element-level listeners which can be non-passive, but we should keep them passive to avoid scroll jank warnings. This means we cannot `preventDefault()` — we simply ignore vertical gestures.
- **iOS Safari overscroll:** Horizontal swipe near the edge of the screen may trigger Safari's back/forward navigation gesture. The composable's `minDistance` threshold (50px) helps avoid conflict, but edge swipes may still be captured by the browser. This is an inherent platform limitation.
- **FLIP transition interaction:** The existing card-to-detail FLIP transition (`useStraitTransition`) should NOT play when navigating between detail pages via swipe. The `captureCard` step is skipped (no card was tapped), so `playForward` will correctly fall through to `state = 'settled'` immediately (existing behavior for direct URL navigation).
- **Component re-mount cost:** Using `:key="strait.id"` forces a full re-mount of `StraitMobileDetail` on each swipe. This re-creates the `StraitCircle` (with satellite image) and the history chart. If this causes visible jank, consider the watcher approach instead (animate without re-mounting). Profile on a mid-range device.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) — Confirmed swipe navigation (Resolved Question #2), alphabetical ordering (Resolved Question #1)
- **Existing transition composable:** `composables/useStraitTransition.ts` — FLIP animation pattern, module-level singleton, reduced-motion support
- **Card list ordering:** `components/straits/StraitCardList.vue:8-10` — current inline alphabetical sort to be extracted
- **Page routing:** `pages/infographics/straits/[[id]].vue` — catch-all route with conditional mobile/desktop rendering
