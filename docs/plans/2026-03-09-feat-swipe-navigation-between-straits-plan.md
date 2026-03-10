---
title: "feat: Swipe navigation between straits"
type: feat
status: active
date: 2026-03-09
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
---

## Enhancement Summary

**Deepened on:** 2026-03-09
**Sections enhanced:** 6
**Research sources:** Vue 3 docs (Context7), Vue Router best practices, design-motion-principles skill, touch gesture best practices, iOS Safari edge-swipe research, codebase analysis

### Key Improvements
1. Added detailed touch event lifecycle management with `onScopeDispose` alignment to existing composable patterns
2. Identified critical race condition: dummy `history.pushState` on re-mount via `:key` will stack history entries on every swipe — must guard against this
3. Added motion design guidance (Emil Kowalski restraint principles): 200-250ms slide with ease-out is correct for this data-exploration context
4. Discovered Vue Router gotcha: param-change lifecycle skip is irrelevant here since `:key` forces re-mount, but the `popstate` listener in `onMounted` will re-register on every swipe navigation — need to coordinate with swipe-initiated navigation flag
5. Added iOS Safari edge-swipe mitigation strategy and concrete acceptance test for edge zones

### New Risks Discovered
- History stack pollution: each `:key`-forced re-mount calls `history.pushState({ straitTransition: true })` again, stacking phantom entries
- The `isNavigatingBack` guard in `useStraitTransition` is module-level state — swipe navigation must not trigger `playReverse`, only the back button should
- `<Transition>` wrapping `StraitMobileDetail` inside `<ClientOnly>` inside a `v-if`/`v-else-if` chain requires careful placement to avoid breaking the conditional rendering

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

#### Research Insights

**Best Practices:**
- `localeCompare` without explicit locale argument uses the runtime locale, which is fine for these English strait names but could cause inconsistency if the app is ever i18n'd. Consider passing `'en'` explicitly: `a.name.localeCompare(b.name, 'en')`.
- The `sortedStraits` array is computed once at module load time. Since `straits` comes from a static JSON import, this is safe and efficient — no need for a computed or reactive wrapper.

**Edge Cases:**
- If `straits` is empty (e.g., data loading error), `sortedStraits` will be an empty array and `getAdjacentStrait` will return `null` — the swipe handler should be a no-op in this case. Already handled by the `if (target)` guard.
- If a strait ID is removed from the data but still in the URL (stale bookmark), `findIndex` returns `-1` and the function returns `null`. The existing route validation watcher in `[[id]].vue` already redirects invalid IDs.

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

#### Research Insights

**Best Practices (Touch Gesture Detection):**
- **Always use `{ passive: true }` for `touchstart` and `touchmove` listeners.** Chrome 56+ defaults these to passive on document-level, but element-level listeners are not auto-passive. Explicitly setting `passive: true` avoids browser warnings and ensures the scroll thread is never blocked. See [Chrome Lighthouse passive listeners guidance](https://developer.chrome.com/docs/lighthouse/best-practices/uses-passive-event-listeners).
- **Early rejection is critical.** On the *first* `touchmove` event, compute the ratio of `|deltaY| / |deltaX|`. If the ratio exceeds `maxVerticalRatio`, set `rejected = true` immediately. Do not wait for `touchend` — this prevents the composable from fighting with the browser's scroll handler and avoids jank on low-end devices.
- **Use a single-touch guard:** Check `e.touches.length === 1` on `touchstart`. Multi-touch (pinch-zoom) should not trigger swipe navigation.
- **Debounce rapid swipes:** Add a guard (e.g., `isNavigating` flag that resets after navigation completes or after a 300ms cooldown) to prevent double-swipe from firing two navigations before the first completes.

**Performance Considerations:**
- All three listeners (`touchstart`, `touchmove`, `touchend`) should be passive. Since we never call `preventDefault()`, this is safe.
- The composable stores only primitives (`startX`, `startY`, `startTime`, `rejected`) — no allocations during the gesture. This is correct and performant.
- The `touchmove` handler fires at 60Hz+ on modern devices. Keep it minimal: just compute the ratio and set the flag. No DOM reads, no reactive updates during the gesture.

**Lifecycle Management (from Vue 3 docs and existing codebase patterns):**
- The existing `useStraitTransition.ts` uses `onScopeDispose` for cleanup. `useSwipeNavigation` should follow the same pattern for consistency.
- Attach listeners in `onMounted` (not immediately in setup) because `containerRef.value` is `null` until the component mounts.
- Use a `watchEffect` or `watch` on `containerRef` if the element might change during the component's lifetime. In this case it won't (static ref), so `onMounted` + `onScopeDispose` is sufficient.

**Edge Cases:**
- **Touch canceled:** Listen for `touchcancel` as well and reset state. This fires when the browser takes over the gesture (e.g., iOS Safari edge swipe, notification pull-down, or when the user drags beyond the viewport).
- **Scroll position during swipe:** The user may be scrolled partway down the detail page. The swipe should work regardless of scroll position — the composable only cares about touch delta, not absolute position.
- **Fast navigation:** If the user swipes rapidly, `navigateTo` is async. Guard against re-entry with a navigating flag.

**iOS Safari Edge Swipe Mitigation:**
- iOS Safari captures swipes that start within ~20px of the screen edge for its own back/forward navigation. This is a **platform limitation that cannot be overridden**.
- The plan's `minDistance: 50px` helps, but gestures starting near the edge will still be captured by Safari regardless.
- **Mitigation strategy:** Ignore `touchstart` events where `e.touches[0].clientX < 25` or `e.touches[0].clientX > window.innerWidth - 25`. This avoids conflicting with Safari's gesture zone and prevents partial/aborted swipes from triggering navigation.
- References: [Blocking Navigation Gestures on iOS](https://pqina.nl/blog/blocking-navigation-gestures-on-ios-13-4/), [Swiper iOS issue #1140](https://github.com/nolimits4web/Swiper/issues/1140)

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

#### Research Insights

**Best Practices:**
- The root div already exists as `.strait-mobile-detail`. Adding `ref="detailRef"` is clean. However, note that `StraitMobileDetail` already uses `heroCircleRef` for the circle element — naming the new ref `detailRef` is distinct and clear.
- **The `onSwipe` callback should use `navigateTo(path, { replace: true })`** (see Section 5) to avoid history stack pollution. This is critical for the back-button UX.

**Integration with Existing Code:**
- The existing `handleBack()` function calls `playReverse()` then `navigateTo('/infographics/straits')`. Swipe navigation must NOT trigger `playReverse` — it should go directly to the next detail page. Since `playForward` correctly falls through to `'settled'` when no card was captured (line 190-194 of `useStraitTransition.ts`), this is already handled. The new `StraitMobileDetail` instance (from `:key` re-mount) will call `playForward` in its `onMounted`, and since no `captureCard` was called, it will skip to `'settled'`.

**Critical Issue — History Stack on Re-mount:**
- `StraitMobileDetail.onMounted` pushes `history.pushState({ straitTransition: true }, '')` (line 82). When `:key` forces a re-mount on swipe, this runs again, pushing *another* dummy entry onto the history stack. Combined with `navigateTo({ replace: true })`, you get: swipe replaces the route entry, then re-mount pushes a dummy entry. After swiping through 5 straits, the user has 5 dummy entries on the history stack — pressing back 5 times before reaching the card list.
- **Fix:** Guard the `history.pushState` call. Only push the dummy entry if this is the *first* mount of a detail page (i.e., coming from the card list), not on re-mounts from swipe navigation. Options:
  1. Check `performance.navigation.type` or a module-level flag set by the swipe handler before `navigateTo`.
  2. Pass a prop like `:from-swipe="true"` from `[[id]].vue` when the navigation was triggered by swipe, and skip the `pushState` if true.
  3. Use a module-level `isSwipeNavigation` flag (similar to the existing `isNavigatingBack` pattern in `useStraitTransition.ts`).
- **Recommended approach:** Option 3 (module-level flag) is most consistent with the existing codebase. Export `setSwipeNavigation(value: boolean)` from the swipe composable or a shared module, set it `true` before `navigateTo`, and check it in `StraitMobileDetail.onMounted`.

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

#### Research Insights

**Motion Design Principles (Emil Kowalski / Jakub Krehel):**
- This is a data-exploration app, not a creative portfolio. **Emil's restraint principles apply**: transitions should be fast and purposeful, not decorative.
- **200-250ms duration is correct** for this context. Emil's guidance: productivity/data tools should stay under 300ms. The plan's 250ms is well within this range.
- **`ease-out` for entrances, `ease-in` for exits** is the correct easing pattern — elements should decelerate into their final position (natural feel) and accelerate as they leave.
- **30% translateX with opacity fade** is a good choice. A full 100% slide (like iOS page transitions) would feel slow and block content visibility. The partial slide communicates direction without being distracting.
- **Do NOT add spring/bounce physics** — this is a data visualization tool, not a social media app. Linear or simple ease curves are appropriate.

**Vue `<Transition>` with `:key` (from Vue 3 docs):**
- Vue docs confirm: "When the `key` changes, Vue knows to create a new element, giving the Transition component 2 different elements to transition between." This is the documented pattern.
- Use `mode="out-in"` so the exiting component fully leaves before the entering one appears. Without `mode`, both would be present simultaneously, causing layout issues.
- Dynamic transition name works: `<Transition :name="transitionName">` where `transitionName` is `'slide-left'` or `'slide-right'` based on swipe direction.

**Critical Implementation Detail — `<Transition>` Placement in `[[id]].vue`:**
- The current template structure is: `<ClientOnly v-else>` → `<StraitMobileDetail v-else-if="selectedStrait">`. The `<Transition>` must wrap `StraitMobileDetail` *inside* the `v-else-if` branch, not around `<ClientOnly>`.
- **Proposed structure:**
  ```vue
  <ClientOnly v-else>
    <StraitCardList v-if="!straitId" :straits="straits" />
    <Transition v-else-if="selectedStrait" :name="slideTransitionName" mode="out-in">
      <StraitMobileDetail
        :key="selectedStrait.id"
        :strait="selectedStrait"
        :historical="selectedStraitHistorical"
        :year="LATEST_YEAR"
      />
    </Transition>
    <div v-else class="strait-not-found">...</div>
  </ClientOnly>
  ```
- The `slideTransitionName` ref must be set *before* `navigateTo` is called (in the swipe callback), so the transition knows which direction to animate. Store it in a module-level or provide/inject shared ref accessible from both `StraitMobileDetail` (where swipe fires) and `[[id]].vue` (where `<Transition>` lives).

**`prefers-reduced-motion` Handling:**
- The plan correctly states "skip animation, still navigate." The existing `useStraitTransition.ts` already reads `prefers-reduced-motion` via `matchMedia`. Reuse the same pattern.
- For the CSS approach: add `@media (prefers-reduced-motion: reduce)` that sets animation duration to `0ms` or removes the animation entirely. This is simpler than a JS check for a CSS-driven transition.
  ```css
  @media (prefers-reduced-motion: reduce) {
    .slide-left-enter-active,
    .slide-left-leave-active,
    .slide-right-enter-active,
    .slide-right-leave-active {
      animation: none;
    }
  }
  ```

**Performance — Re-mount Cost:**
- `:key="strait.id"` forces full re-mount: `StraitCircle` (canvas/image), `StraitHistoryChart` (D3 chart), `ResizeObserver` setup, `history.pushState`. Profile this on a mid-range Android device.
- If re-mount jank is visible, the alternative is the watcher approach: keep the same component instance, watch `props.strait.id`, and manually trigger enter/leave animations using Web Animations API (consistent with `useStraitTransition.ts` patterns).
- The watcher approach is more complex but avoids re-creating the canvas element, which is the most expensive operation.

### 5. Route and history integration

When swiping between straits, the route updates via `navigateTo()`. The existing `handleBack()` and popstate logic in `StraitMobileDetail` must not interfere:

- The dummy `history.pushState({ straitTransition: true })` currently pushed on mount is for back-to-list interception. When navigating via swipe, this entry should NOT be pushed again — the swipe replaces the current history entry rather than stacking.
- Consider using `navigateTo(path, { replace: true })` for swipe navigation so the back button always returns to the card list (not through each swiped strait).

#### Research Insights

**Best Practices (Vue Router History Management):**
- `navigateTo(path, { replace: true })` is equivalent to `router.replace()`. It navigates without pushing a new entry, so the back button skips over swiped-to pages. This is the correct UX: the user expects "back" to mean "return to the list," not "go to the previous strait I swiped through."
- Vue Router's `replace` mode is well-tested and works correctly with Nuxt's `navigateTo`.

**Critical History Stack Issue (Detailed Analysis):**
The current flow on initial card-tap navigation is:
1. User is on `/infographics/straits` (card list)
2. User taps a card → `navigateTo('/infographics/straits/malacca')` pushes a new history entry
3. `StraitMobileDetail.onMounted` pushes a dummy `{ straitTransition: true }` entry
4. History stack: `[list, malacca, dummy]`
5. User presses back → popstate fires, `playReverse()` runs, then `navigateTo('/infographics/straits')` replaces the stack

For swipe navigation with `:key` re-mount:
1. User is on `/infographics/straits/malacca` (detail page, history: `[list, malacca, dummy]`)
2. User swipes left → `navigateTo('/infographics/straits/hormuz', { replace: true })`
3. History stack becomes: `[list, hormuz]` (replace removed `malacca` and the dummy)
4. New `StraitMobileDetail` mounts (`:key` change) → pushes dummy again
5. History stack: `[list, hormuz, dummy]`
6. Back button → popstate → `playReverse()` → back to list

**This flow is correct IF `navigateTo({ replace: true })` is used.** Without `replace`, each swipe would push a new entry and the dummy on top, creating: `[list, malacca, dummy, hormuz, dummy]` — broken back navigation.

**However, there is a subtlety:** When `navigateTo({ replace: true })` runs, it replaces the *current* entry. But the current entry is the `dummy` (pushed by `pushState`), not `malacca`. So the history becomes `[list, malacca, hormuz]`, and then `onMounted` pushes another dummy: `[list, malacca, hormuz, dummy]`. The `malacca` entry is orphaned.

**Recommended fix:** Before calling `navigateTo({ replace: true })` in the swipe handler, pop the dummy entry first with `history.back()`, wait for the popstate, then navigate. Or simpler: use `history.replaceState` to remove the dummy entry before navigating:
```ts
// In the swipe callback, before navigateTo:
history.replaceState(null, '') // Remove the dummy marker from current state
navigateTo(`/infographics/straits/${target.id}`, { replace: true })
```
This ensures the `replace` targets the actual route entry, not the dummy.

### 6. Visual swipe indicator (optional enhancement)

Add subtle prev/next indicators at the horizontal edges of the detail page:

```
← Lombok     [current detail content]     Luzon →
```

This can be a minimal text hint that appears on first visit and fades after the user's first swipe, or always-visible chevrons at the bottom of the page. This is optional and can be deferred.

#### Research Insights

**UX Best Practices:**
- A "swipe hint" indicator on first visit is a well-established mobile pattern (used by Google Photos, Instagram, Tinder). Show it once, then persist a flag in `localStorage` to suppress on subsequent visits.
- Alternatively, a fixed bottom bar with `← Prev Name | Next Name →` provides persistent discoverability without being intrusive. This doubles as a tap target for users who prefer tapping to swiping.
- **Accessibility:** If swipe indicators include tap targets, ensure they are at least 44x44px (WCAG 2.5.8 target size). The text labels alone may not meet this requirement.
- **For the data-exploration context of this app:** Always-visible prev/next names at the bottom are more valuable than a one-time hint. Users exploring straits want to know *which* strait is next, not just that swiping is possible.

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
- [ ] Swipe gestures starting within 25px of screen edges are ignored (iOS Safari conflict zone)
- [ ] Multi-touch gestures (pinch-zoom) do not trigger swipe navigation
- [ ] Rapid successive swipes do not trigger multiple concurrent navigations
- [ ] `touchcancel` events properly reset swipe tracking state

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `composables/useSwipeNavigation.ts` | **Create** | Touch gesture composable with horizontal/vertical discrimination |
| `utils/straitsData.ts` | **Modify** | Add `sortedStraits` export and `getAdjacentStrait()` helper |
| `components/straits/StraitMobileDetail.vue` | **Modify** | Wire up swipe composable, add ref to root element, guard `history.pushState` for swipe re-mounts |
| `components/straits/StraitCardList.vue` | **Modify** | Use shared `sortedStraits` from `utils/straitsData.ts` |
| `pages/infographics/straits/[[id]].vue` | **Modify** | Add `key` to `StraitMobileDetail`, wrap in `<Transition>` with dynamic name, add `slideTransitionName` ref |
| `public/styles.css` | **Modify** | Add slide transition keyframes with `prefers-reduced-motion` override |

## Dependencies & Risks

- **Touch event passive listeners:** Modern browsers default `touchmove` to passive on document-level. The composable uses element-level listeners which can be non-passive, but we should keep them passive to avoid scroll jank warnings. This means we cannot `preventDefault()` — we simply ignore vertical gestures.
- **iOS Safari overscroll:** Horizontal swipe near the edge of the screen may trigger Safari's back/forward navigation gesture. The composable's `minDistance` threshold (50px) helps avoid conflict, but edge swipes may still be captured by the browser. This is an inherent platform limitation. **Mitigation: ignore touches starting within 25px of screen edges.**
- **FLIP transition interaction:** The existing card-to-detail FLIP transition (`useStraitTransition`) should NOT play when navigating between detail pages via swipe. The `captureCard` step is skipped (no card was tapped), so `playForward` will correctly fall through to `state = 'settled'` immediately (existing behavior for direct URL navigation).
- **Component re-mount cost:** Using `:key="strait.id"` forces a full re-mount of `StraitMobileDetail` on each swipe. This re-creates the `StraitCircle` (with satellite image) and the history chart. If this causes visible jank, consider the watcher approach instead (animate without re-mounting). Profile on a mid-range device.
- **History stack pollution (NEW):** The `history.pushState({ straitTransition: true })` in `StraitMobileDetail.onMounted` will fire on every `:key`-forced re-mount. Must guard this call with a swipe-navigation flag to prevent stacking phantom history entries. Use `history.replaceState(null, '')` before `navigateTo({ replace: true })` to ensure the replace targets the route entry, not the dummy.
- **`<Transition>` placement (NEW):** The `<Transition>` component must be placed *inside* the `v-else-if="selectedStrait"` branch in `[[id]].vue`, wrapping `StraitMobileDetail` directly. Placing it outside the conditional chain would break the `v-if`/`v-else-if`/`v-else` structure. The `slideTransitionName` state must be shared between `StraitMobileDetail` (sets it on swipe) and `[[id]].vue` (reads it for `<Transition :name>`).

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) — Confirmed swipe navigation (Resolved Question #2), alphabetical ordering (Resolved Question #1)
- **Existing transition composable:** `composables/useStraitTransition.ts` — FLIP animation pattern, module-level singleton, reduced-motion support
- **Card list ordering:** `components/straits/StraitCardList.vue:8-10` — current inline alphabetical sort to be extracted
- **Page routing:** `pages/infographics/straits/[[id]].vue` — catch-all route with conditional mobile/desktop rendering
- **Vue 3 Transition docs:** Dynamic `name`, `mode="out-in"`, `:key` forcing re-render — [Vue Built-in Transition](https://vuejs.org/guide/built-ins/transition.html)
- **Vue Router param change lifecycle:** Route param changes do NOT trigger lifecycle hooks — `:key` approach forces re-mount as workaround — [Vue Router Dynamic Matching](https://router.vuejs.org/guide/essentials/dynamic-matching.html)
- **Passive event listeners:** [Chrome Lighthouse guidance](https://developer.chrome.com/docs/lighthouse/best-practices/uses-passive-event-listeners)
- **iOS Safari edge gestures:** [PQINA blog](https://pqina.nl/blog/blocking-navigation-gestures-on-ios-13-4/), [Swiper issue #1140](https://github.com/nolimits4web/Swiper/issues/1140)
- **Touch gesture detection patterns:** [Sling Academy guide](https://www.slingacademy.com/article/detect-gestures-and-swipes-using-javascript-touch-apis/), [KIRUPA swipe tutorial](https://www.kirupa.com/html5/detecting_touch_swipe_gestures.htm)
