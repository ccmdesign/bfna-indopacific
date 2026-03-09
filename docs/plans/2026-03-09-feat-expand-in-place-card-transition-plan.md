---
title: "feat: Expand-in-place shared element transition"
type: feat
status: completed
date: 2026-03-09
deepened: 2026-03-09
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
---

## Enhancement Summary

**Deepened on:** 2026-03-09
**Sections enhanced:** 7
**Research sources:** Vue 3 docs (TransitionGroup/JS hooks), MDN Web Animations API, Emil Kowalski motion principles, Jakub Krehel production polish patterns, motion design performance guidelines, Vue composable best practices, existing codebase analysis

### Key Improvements
1. Added `will-change` pre-promotion strategy and `commitStyles()` cleanup pattern for the floating clone to prevent first-frame stutter and GPU memory leaks
2. Identified critical race condition: `popstate` interception must use `history.pushState` re-entry guard to prevent Vue Router from processing the route change before the reverse animation completes
3. Added blur-bridge technique (2px blur during mid-transition) to mask the visual seam between hiding the real circle and showing the clone
4. Specified clone rendering strategy using `cloneNode(true)` with explicit dimension locking to avoid image re-decode flicker on the satellite image
5. Added stale-rect invalidation for the reverse animation when the card list may have been scrolled or resized during detail view

### New Considerations Discovered
- The `StraitCircle` component uses `position: relative` + `overflow: hidden` only when it has an image child (via `:has(.strait-circle__image)`), which means the clone's bounding rect must be measured from the `.strait-card__thumbnail` wrapper, not the circle itself, to get a stable rect that includes the overflow-hidden crop
- The `ResizeObserver` in `StraitMobileDetail.vue` mutates `heroRadius` on mount, meaning `playForward` must wait one frame after mount for the hero circle to settle at its final size before capturing the "Last" rect
- The sticky nav bar (`position: sticky; top: 0; z-index: 10`) in the detail view will visually layer above a `position: fixed` clone unless the clone uses `z-index: 9999` or is teleported to `<body>`

---

# Expand-in-Place Shared Element Transition

Animate the card-to-detail-page transition so the card expands in place and the circle morphs into the hero area, with reverse animation on back navigation.

## Overview

The mobile straits experience currently hard-cuts between `StraitCardList` and `StraitMobileDetail` via `v-if` toggling inside `[[id]].vue`. This plan adds a shared-element transition where:

1. The tapped card grows to fill the viewport
2. The circle thumbnail scales up and repositions into the hero area
3. Detail content fades in below the hero
4. Back navigation reverses the animation (hero shrinks back into the card position)

This was identified as a key behavior in the brainstorm (see brainstorm: `docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md`, "Tap to expand" under Key Behaviors).

## Approach Evaluation

### Option A: View Transitions API

**Pros:**
- Native browser API, minimal JS code
- Automatic cross-fade with `view-transition-name` CSS property
- Built-in snapshot-based animation (no manual FLIP math)
- Nuxt 3 has experimental `viewTransition` support in `definePageMeta`

**Cons:**
- Safari support is incomplete as of early 2026 (brainstorm noted this)
- This is NOT a Nuxt page navigation -- the transition happens within a single `[[id]].vue` page via `v-if` switching. `document.startViewTransition()` would need to be called manually around the route change
- The `[[id]].vue` catch-all route means both views share one page component. Nuxt's built-in `pageTransition` config does not fire for same-page param changes
- Fallback needed for unsupported browsers adds complexity

**Verdict:** Not recommended for this use case. The same-page `v-if` pattern doesn't align well with the View Transitions API's page-navigation model, and Safari gaps make it unreliable for a mobile-first feature.

### Option B: Manual FLIP Animation with Vue (Recommended)

**Pros:**
- Full cross-browser support (uses `transform` + `opacity`, GPU-composited)
- Works naturally with the existing `v-if` conditional rendering pattern
- Complete control over timing, easing, and staggering
- Respects `prefers-reduced-motion` easily
- No framework version or browser support concerns

**Cons:**
- More code to write (FLIP measurement, animation orchestration)
- Must manage the "ghost" card element during the transition manually

**Verdict:** Recommended. FLIP gives full control, works cross-browser, and fits the existing architecture.

### Research Insights: Approach Validation

**Best Practices (Emil Kowalski / Jakub Krehel):**
- The FLIP approach aligns with the "shared layout animation" pattern (Jakub): capture two rects, animate between them using only `transform` and `opacity` -- the only GPU-composited properties
- Emil's interruptibility principle applies: the Web Animations API supports `animation.cancel()` natively, which means FLIP animations can be interrupted mid-flight if the user taps back before forward animation completes. CSS keyframes cannot do this

**Performance (MDN Web Animations API):**
- `Element.animate()` returns an `Animation` object with a `.finished` promise -- this is the correct async coordination primitive (not `setTimeout` or `transitionend` events)
- After animation completes, use `animation.commitStyles()` then `animation.cancel()` to persist final state without keeping a fill-mode animation alive (which holds a GPU layer indefinitely)

**Vue Composable Patterns:**
- The composable should use `onScopeDispose` for cleanup (matching the pattern in the existing `useViewport.ts`)
- State should be exposed via `readonly()` refs where external mutation is not desired (matching `useViewport.ts`)
- Guard all browser API usage with `import.meta.client` for SSR safety (matching existing pattern)

## Technical Design

### Architecture

The transition is a **coordinated FLIP animation** across two states:

```
State A (list visible):           State B (detail visible):
+---------------------------+     +---------------------------+
| [card] [circle][text] [>] |     | [<] All Straits           |
|                           |     | +---------------------+   |
| [card]                    |     | |                     |   |
|                           |  -> | |   [hero circle]     |   |
| [card]                    |     | |                     |   |
|                           |     | +---------------------+   |
| [card]                    |     | Strait Name               |
+---------------------------+     | Detail content...         |
                                  +---------------------------+
```

### Key Components

#### 1. `useStraitTransition` composable

New file: `composables/useStraitTransition.ts`

Manages the shared-element transition state:

```ts
// Responsibilities:
// - Capture card bounding rect on tap (First)
// - Capture hero bounding rect after detail mounts (Last)
// - Compute transform delta (Invert)
// - Animate with Web Animations API (Play)
// - Expose transition state for coordinating fade-ins
// - Handle reverse animation on back navigation
```

State machine:

```
idle -> capturing -> animating-forward -> settled
settled -> animating-back -> idle
```

Exports:
- `transitionState: Ref<'idle' | 'capturing' | 'animating-forward' | 'settled' | 'animating-back'>`
- `captureCard(straitId: string, cardEl: HTMLElement): void` -- called on card tap
- `playForward(heroCircleEl: HTMLElement): void` -- called when detail mounts
- `playReverse(): Promise<void>` -- called on back navigation
- `cardRect: Ref<DOMRect | null>` -- stored for reverse animation

##### Research Insights: Composable Design

**Best Practices (Vue composables reference):**
- Return an object with named properties for destructuring-friendly usage
- Accept an options object for configuration (e.g., `{ duration?: number, easing?: string }`)
- Use `readonly()` for `transitionState` and `cardRect` since consumers should not mutate them directly
- Handle cleanup with `onScopeDispose` -- cancel any in-flight `Animation` objects and remove cloned DOM nodes

**FLIP Implementation Detail:**
- The "First" measurement must happen synchronously on the click event, before Vue processes any reactive updates, to capture the card's exact position. Use `getBoundingClientRect()` on the thumbnail wrapper element (`.strait-card__thumbnail`), not the inner `.strait-circle`, because the circle uses conditional `position: relative` via `:has()` which may shift the rect
- The "Last" measurement must wait one `requestAnimationFrame` after mount because `StraitMobileDetail.vue` uses a `ResizeObserver` that updates `heroRadius` on mount. The hero circle's final dimensions are not available on the first frame

**Web Animations API Pattern:**
```ts
// Recommended pattern: animate, await, commit, cancel
const animation = cloneEl.animate(
  [
    { transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})` },
    { transform: 'translate(0, 0) scale(1, 1)' }
  ],
  { duration: 350, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
)
await animation.finished
animation.commitStyles()
animation.cancel()
```

**State Machine Hardening:**
- Add a `cancelled` transition: if `playForward` is called while `animating-back`, cancel the current animation and start fresh. This handles rapid back-then-forward taps
- The `idle -> capturing` transition should be synchronous and set immediately on click, preventing double-tap from triggering two captures

**Clone Rendering Strategy:**
- Use `thumbnailEl.cloneNode(true)` to clone the entire thumbnail including the satellite `<img>`. This preserves the already-decoded image data and avoids a re-fetch flash
- Lock the clone's dimensions explicitly with `width` and `height` inline styles matching the source rect, because the clone will be `position: fixed` and lose its flex-layout context
- Apply `will-change: transform` to the clone element immediately after insertion to pre-promote to a GPU layer, preventing first-frame jank
- Remove `will-change` after animation completes to free the GPU layer

**Blur Bridge Technique (Jakub Krehel):**
- During the brief moment when the real circle is hidden and the clone takes over, add `filter: blur(2px)` to the clone's first keyframe, transitioning to `blur(0)` by 20% of the animation. This "materializing" effect masks any visual discontinuity between the real element and the clone

#### 2. Modifications to `StraitCard.vue`

- Add a `ref` on the `.strait-card__thumbnail` element
- On click, call `captureCard(strait.id, thumbnailEl)` before navigation
- Add `view-transition-name` equivalent data attribute for identification

```vue
<!-- StraitCard.vue additions -->
<script setup>
const thumbnailRef = ref<HTMLElement | null>(null)
const { captureCard } = useStraitTransition()

function handleClick() {
  if (thumbnailRef.value) {
    captureCard(props.strait.id, thumbnailRef.value)
  }
  // NuxtLink handles navigation
}
</script>

<template>
  <li class="strait-card">
    <NuxtLink @click.capture="handleClick" ...>
      <div ref="thumbnailRef" class="strait-card__thumbnail">
        <!-- StraitCircle -->
      </div>
    </NuxtLink>
  </li>
</template>
```

##### Research Insights: Click Capture

**Best Practices:**
- Using `@click.capture` is correct here -- capture phase ensures `captureCard` runs before NuxtLink's click handler processes the navigation. This guarantees the bounding rect is measured before any DOM changes
- The `thumbnailRef` must be on the `.strait-card__thumbnail` div (72x72 flex container), not the inner `StraitCircle`, because the circle sets its own `--diameter` CSS variable and uses conditional `position: relative` that can shift the visual rect

**Edge Case: Card Visibility During Scroll:**
- If the tapped card is partially off-screen (user scrolled to it but it's near the viewport edge), the `getBoundingClientRect()` will return a rect partially outside the viewport. The clone should still animate correctly because `position: fixed` works relative to the viewport, but the starting position of the animation may begin off-screen. This is acceptable behavior

**Accessibility:**
- The click handler must not interfere with keyboard activation. `@click.capture` fires on both mouse and keyboard `Enter`/`Space`, so no additional handling is needed
- The `NuxtLink` already has an `aria-label` with the strait name and trade value -- this provides context for the transition's destination

#### 3. Modifications to `StraitMobileDetail.vue`

- Add a `ref` on the `.strait-mobile-detail__hero-circle` element
- On mount, call `playForward(heroCircleEl)` to trigger the FLIP animation
- Content below the hero gets a staggered fade-in (controlled by `transitionState`)
- Back link calls `playReverse()` before navigation

```vue
<!-- StraitMobileDetail.vue additions -->
<script setup>
const heroCircleRef = ref<HTMLElement | null>(null)  // already exists
const { playForward, playReverse, transitionState } = useStraitTransition()

onMounted(() => {
  if (heroCircleRef.value) {
    playForward(heroCircleRef.value)
  }
})

async function handleBack() {
  await playReverse()
  navigateTo('/infographics/straits')
}
</script>
```

##### Research Insights: Detail Mount Timing

**Critical Timing Issue:**
- `StraitMobileDetail.vue` has a `ResizeObserver` on `heroCircleRef` that fires on mount and updates `heroRadius`. This means the hero circle's final dimensions are NOT stable on the first frame of `onMounted`
- `playForward` must internally wait one `requestAnimationFrame` before measuring the "Last" rect, to allow the `ResizeObserver` callback to fire and the hero circle to settle at its responsive size (`clamp(160px, 65vw, 288px)`)
- Sequence: `onMounted` -> `requestAnimationFrame` -> measure hero rect -> compute FLIP delta -> start animation

**Staggered Content Fade-In (Jakub Krehel patterns):**
- Detail content sections should fade in with a subtle stagger, not all at once. Apply CSS classes driven by `transitionState`:
  - When `transitionState === 'animating-forward'`: content has `opacity: 0; transform: translateY(8px); filter: blur(4px)`
  - When `transitionState === 'settled'`: content transitions to `opacity: 1; transform: translateY(0); filter: blur(0)`
  - Use `transition-delay` increments of 50ms per section (nav: 0ms, name: 50ms, description: 100ms, stats: 150ms)
- Exit animations should be subtler than enter animations (Jakub principle): on reverse, content fades out without the translateY or blur, just `opacity: 1 -> 0` over 100ms

**Back Navigation Interception:**
- The existing `NuxtLink to="/infographics/straits"` must be replaced with a `<button>` or `<a>` that calls `handleBack()` instead of navigating directly. The current `NuxtLink` would trigger an immediate route change, destroying the detail DOM before the reverse animation can play
- Style the button identically to the current back link using the existing `.strait-mobile-detail__back` class

#### 4. Modifications to `[[id]].vue`

- Wrap the mobile `v-if` section with transition coordination
- During `animating-forward`, render BOTH the card list (fading out) and the detail (with FLIP circle)
- During `animating-back`, render detail fading while card list fades in
- Use a brief overlap period (~300ms) where both components coexist

##### Research Insights: Overlap Rendering Strategy

**Critical Architecture Decision:**
- The current `v-if="!straitId"` / `v-else-if="selectedStrait"` pattern means only ONE of the two components exists in the DOM at any time. For the FLIP transition, this is actually fine because the floating clone handles the visual continuity -- the card list can be removed before the detail mounts
- However, for the REVERSE animation, the card list must be re-mounted BEFORE the reverse animation completes so that the clone has a target position to animate back to. This means the `v-if` logic needs a brief window where `straitId` is still set (detail visible) but the card list is also rendered
- Approach: introduce a `transitionStraitId` computed that lags behind the real `straitId` by the animation duration during reverse transitions. The card list renders when `!straitId || transitionState === 'animating-back'`

**`ClientOnly` Wrapper Impact:**
- Both the card list and detail are inside `<ClientOnly>`, which is correct -- the transition composable is client-only and there's no SSR concern. But the `<ClientOnly>` wrapper means the `#fallback` skeleton shows during initial hydration. The transition should not attempt to play during the initial hydration phase -- guard with a `hydrated` flag

**Master Grid Constraint (from CLAUDE.md memory):**
- The page uses `layout-2` which places `.strait-map` at `grid-row: 1/8; grid-column: 1/-1`. On mobile, the `v-if="!isMobile"` hides the map entirely, so the card list and detail are not grid-placed. The transition overlay (floating clone) must use `position: fixed` and `<Teleport to="body">` to sit outside the grid entirely. This matches the existing architectural constraint documented in memory

#### 5. Transition overlay element

During the FLIP animation, a **floating circle clone** sits above both views:

1. On tap: clone the card's circle thumbnail, position it absolutely at the card's rect
2. Hide the real card circle and the real hero circle
3. Animate the clone from card rect to hero rect using `transform: translate() scale()`
4. On animation end: remove clone, show real hero circle, fade in detail content
5. Reverse: same in opposite direction

This avoids needing both components mounted simultaneously and sidesteps the `v-if` switching timing issue.

##### Research Insights: Clone Lifecycle

**Clone Creation Best Practices:**
- Use `Teleport to="body"` for the clone container to guarantee it sits above all grid and sticky elements
- The clone must capture the satellite image as well. Since `StraitCircle` uses `<img>` with `object-fit: cover` inside `overflow: hidden; border-radius: 50%`, the clone must preserve these styles. `cloneNode(true)` copies the DOM structure, but `scoped` styles from Vue won't apply to the clone. Solutions:
  1. Copy computed styles for the critical properties (`border-radius`, `overflow`, `width`, `height`, `box-shadow`, `border`) onto the clone's inline style
  2. Or: define the clone's styles in `public/styles.css` (unscoped) under a `.strait-transition-clone` class
- Option 2 is cleaner and matches the project pattern of keeping shared styles in `public/styles.css`

**GPU Layer Management (motion design performance guidelines):**
- Apply `will-change: transform, opacity` on the clone BEFORE the animation starts (ideally one frame before via `requestAnimationFrame`) to pre-promote to a GPU layer
- Remove `will-change` after `commitStyles()` / `cancel()` to free the GPU layer
- The clone is the ONLY element that needs `will-change` during the transition -- do not apply it to the fading content sections (they use `opacity` transitions which are already composited)

**Z-Index Strategy:**
- Clone container: `position: fixed; z-index: 9999; pointer-events: none`
- The detail's sticky nav uses `z-index: 10` -- the clone at 9999 will layer above it
- The clone should have `pointer-events: none` to prevent intercepting touches during the animation

### Animation Spec

| Property | Forward | Reverse |
|----------|---------|---------|
| Duration | 350ms | 300ms |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` (Material ease-out) | `cubic-bezier(0.4, 0, 0.6, 1)` |
| Circle | translate + scale from card rect to hero rect | hero rect to card rect |
| Card list | opacity 1 -> 0, 150ms | opacity 0 -> 1, 150ms, delay 150ms |
| Detail content | opacity 0 -> 1, 200ms, delay 200ms | opacity 1 -> 0, 100ms |
| Nav bar | opacity 0 -> 1, 150ms, delay 250ms | opacity 1 -> 0, 100ms |

#### Research Insights: Timing and Easing

**Duration Analysis (Emil Kowalski principles):**
- Emil recommends UI animations under 300ms for productivity tools, but this is a mobile-first data visualization app, not a high-frequency productivity tool. The 350ms forward / 300ms reverse durations are appropriate for this context
- The reverse being 50ms shorter than forward follows the principle that exits should be subtler/faster than enters (Jakub Krehel)
- The staggered delays (200ms for content, 250ms for nav) are well-designed: they keep total perceived animation time under 550ms while creating a cascading reveal

**Easing Refinement:**
- `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard easing) is a good choice for the forward FLIP -- it decelerates smoothly, giving the circle a "landing" feel as it reaches the hero position
- For the reverse, consider `cubic-bezier(0.4, 0, 1, 1)` (ease-in) instead of `cubic-bezier(0.4, 0, 0.6, 1)` -- the reverse should feel like the circle is "returning home" with acceleration, not deceleration. The circle accelerates away from the detail and slows into the card position. However, test both options visually

**Content Fade Refinement (Jakub Krehel enter animation recipe):**
- The detail content fade-in should combine three properties for the "materializing" effect:
  - `opacity: 0 -> 1`
  - `translateY: 8px -> 0` (subtle upward shift)
  - `filter: blur(4px) -> blur(0)` (coming into focus)
- Exit should be subtler: just `opacity: 1 -> 0` over 100ms, no translateY or blur on exit

### Reduced Motion

When `prefers-reduced-motion: reduce`:
- Skip all animations
- Instant cut between states (current behavior preserved)
- Already have precedent in `StraitCard.vue` and `StraitMobileDetail.vue` `@media` rules

#### Research Insights: Accessibility

**Implementation Detail:**
- Check `prefers-reduced-motion` in the composable using `window.matchMedia('(prefers-reduced-motion: reduce)')`, not CSS media queries, because the animation is driven by JavaScript (Web Animations API), not CSS transitions
- When reduced motion is active, `captureCard` and `playForward`/`playReverse` should still update the state machine (`idle -> settled` immediately) but skip the animation entirely. This ensures `transitionState` still drives the content visibility correctly
- The media query should be checked once at composable initialization AND listened to for changes (user can toggle reduced motion while the page is open). Use `matchMedia.addEventListener('change', ...)` with cleanup via `onScopeDispose`

**WCAG Compliance:**
- The transition is purely decorative/enhancement -- the content is fully accessible without animation
- The back button must remain keyboard-accessible. Changing from `NuxtLink` to a `<button>` requires ensuring `Enter` and `Space` still trigger `handleBack()`
- During the animation, `aria-busy="true"` on the detail container prevents screen readers from announcing partially-rendered content

## Implementation Phases

### Phase 1: FLIP composable + forward transition

**Files:**
- `composables/useStraitTransition.ts` (new)
- `components/straits/StraitCard.vue` (modify: add click capture + ref)
- `components/straits/StraitMobileDetail.vue` (modify: trigger forward animation on mount)
- `pages/infographics/straits/[[id]].vue` (modify: coordinate transition overlay)

**Tasks:**
- [x] Create `useStraitTransition` composable with FLIP logic
- [x] Capture card thumbnail rect on click in `StraitCard.vue`
- [x] Create floating circle clone positioned at card rect
- [x] Animate clone to hero position using Web Animations API
- [x] Fade in detail content with staggered delay
- [x] Handle `prefers-reduced-motion`

**Success criteria:** Tapping a card plays a smooth circle-morph animation into the hero, detail content fades in below.

#### Research Insights: Phase 1 Implementation Details

**Composable Skeleton:**
```ts
// composables/useStraitTransition.ts
export function useStraitTransition(options?: { duration?: number }) {
  // SSR guard
  if (!import.meta.client) {
    return {
      transitionState: readonly(ref('idle')),
      captureCard: () => {},
      playForward: () => {},
      playReverse: async () => {},
      cardRect: readonly(ref(null)),
    }
  }

  const state = ref<TransitionState>('idle')
  const cardRect = ref<DOMRect | null>(null)
  const heroRect = ref<DOMRect | null>(null)
  const scrollTop = ref(0)
  let currentAnimation: Animation | null = null
  let cloneEl: HTMLElement | null = null

  // Reduced motion detection
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  const reducedMotion = ref(mql.matches)
  const handleChange = (e: MediaQueryListEvent) => { reducedMotion.value = e.matches }
  mql.addEventListener('change', handleChange)

  // Cleanup
  onScopeDispose(() => {
    currentAnimation?.cancel()
    cloneEl?.remove()
    mql.removeEventListener('change', handleChange)
  })

  return {
    transitionState: readonly(state),
    captureCard,
    playForward,
    playReverse,
    cardRect: readonly(cardRect),
  }
}
```

**Clone CSS (add to `public/styles.css`):**
```css
.strait-transition-clone {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  border-radius: 50%;
  overflow: hidden;
  will-change: transform, opacity;
}

.strait-transition-clone img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
```

**FLIP Math:**
```ts
// In playForward:
// 1. Wait one rAF for ResizeObserver to fire
// 2. Measure hero rect (Last)
// 3. Compute delta from stored card rect (First)
const dx = cardRect.x - heroRect.x
const dy = cardRect.y - heroRect.y
const scaleX = cardRect.width / heroRect.width
const scaleY = cardRect.height / heroRect.height

// 4. Position clone at hero rect, then animate FROM inverted position TO identity
// This way the clone ends at the hero position naturally
```

### Phase 2: Reverse transition on back navigation

**Files:**
- `composables/useStraitTransition.ts` (extend)
- `components/straits/StraitMobileDetail.vue` (modify: intercept back navigation)

**Tasks:**
- [x] Store the last card rect for reverse animation
- [x] Intercept back button click and browser back
- [x] Animate hero circle back to stored card position
- [x] Fade out detail content first, then play reverse FLIP
- [x] Navigate to list after animation completes
- [x] Handle edge case: card list may have scrolled (re-measure or use stored position)

**Success criteria:** Pressing back plays the reverse animation; the hero circle shrinks back to where the card was.

#### Research Insights: Reverse Animation Challenges

**Stale Rect Problem:**
- The stored `cardRect` from `captureCard` reflects the card's position at the time it was tapped. If the user was scrolling when they tapped, or if the viewport has been resized since (orientation change on mobile), the stored rect may not match where the card will be when the list re-appears
- Mitigation approach: during reverse animation, store the scroll position that was captured on forward navigation. When the card list re-mounts, restore `scrollTop` to that value. Since the card's position relative to the scrollable container is fixed (alphabetical sort, stable heights), the stored rect remains valid as long as scroll position is restored
- Edge case: if the device rotated between forward and reverse, the rect is completely invalid. Detect orientation changes via `matchMedia('(orientation: portrait)')` and fall back to a simple crossfade if orientation changed

**Popstate Interception (Race Condition):**
- When the user presses the browser back button, `popstate` fires and Vue Router immediately processes the route change, which would unmount `StraitMobileDetail` before the reverse animation plays
- Solution: in `onMounted` of the detail view, push a dummy history entry:
  ```ts
  history.pushState({ straitTransition: true }, '')
  ```
  Then listen for `popstate`:
  ```ts
  window.addEventListener('popstate', async (e) => {
    if (e.state?.straitTransition) {
      // This is our dummy entry being popped -- play reverse animation
      await playReverse()
      // Now do the real navigation (go back past the original entry)
      navigateTo('/infographics/straits')
    }
  })
  ```
  This gives us a chance to intercept the back action before Vue Router processes the real route change

**Content Fade-Out Sequence:**
1. `transitionState` changes to `animating-back`
2. Content sections immediately begin fading out (`opacity: 1 -> 0`, 100ms)
3. After 100ms delay, the FLIP reverse animation begins (circle shrinks back to card position)
4. After FLIP completes, navigate to list and reset state to `idle`

### Phase 3: Polish and edge cases

**Tasks:**
- [x] Handle rapid tap (debounce or ignore taps during animation)
- [x] Handle browser back button (popstate) vs in-app back link
- [x] Scroll position restoration: return to the same scroll offset in the card list
- [ ] Test with slow network (skeleton state during transition)
- [x] Verify particle canvas doesn't interfere with the clone animation
- [ ] Test across iOS Safari, Chrome Android, Firefox Android
- [ ] Performance profile: ensure 60fps on mid-range mobile

#### Research Insights: Edge Cases and Polish

**Rapid Tap Prevention:**
- The simplest guard: check `transitionState.value !== 'idle'` at the top of `captureCard`. If a transition is already in progress, return early without capturing
- This is better than debouncing because it's state-based, not time-based. The user can tap again the instant the animation settles

**Scroll Position Restoration:**
- Capture `document.documentElement.scrollTop` or the card list container's `scrollTop` in `captureCard`, before navigation
- Restore it in the `[[id]].vue` page when transitioning back: after the card list re-mounts and its DOM is ready (use `nextTick`), set `scrollTop` to the stored value
- This ensures the card the user originally tapped is visible when they return, and the reverse animation target position is correct

**Particle Canvas Interference:**
- `StraitCircle.vue` conditionally renders `StraitParticleCanvas` when `selected === true` and the strait has polygon data. In the card list, `selected` is not passed (defaults to `false`/`undefined`), so particles don't render in cards -- no interference during forward animation
- In the detail hero, particles ARE active (`:selected="true"`). During reverse animation, the clone is a static snapshot (no canvas), and the real hero circle should have particles hidden. Set a `data-transitioning` attribute on the hero circle during reverse animation, and use CSS to hide the canvas: `.strait-circle[data-transitioning] .strait-particle-canvas { display: none }`

**iOS Safari Specific:**
- iOS Safari has known issues with `position: fixed` elements during scroll momentum. The clone should use `position: fixed` but also set `-webkit-transform: translateZ(0)` to force a new stacking context and prevent scroll-momentum interference
- iOS Safari's `getBoundingClientRect()` can return incorrect values during scroll momentum deceleration. Call `window.scrollTo(window.scrollX, window.scrollY)` immediately before measurement to stop momentum scrolling, or accept slight visual offset during fast scrolling

**Performance Budget:**
- Target: 1 animated element (clone) with `will-change: transform, opacity` during the 350ms animation. This is well within the 0-3 element budget
- The content sections use CSS `transition: opacity` which is already GPU-composited and requires no `will-change`
- Avoid animating `filter: blur()` on more than 1 element simultaneously on mobile -- the blur bridge should be limited to the clone only

**Animation Cancellation and Cleanup:**
- If the component unmounts during animation (user navigates away via gesture or URL change), `onScopeDispose` must:
  1. Call `currentAnimation?.cancel()` to stop the Web Animation
  2. Remove the clone element from the DOM
  3. Remove the `popstate` event listener
- The `Animation.cancel()` call rejects the `.finished` promise with an `AbortError`. Any `await animation.finished` must be wrapped in try/catch to handle this gracefully

## Acceptance Criteria

- [x] Tapping a strait card plays an expand-in-place animation where the circle thumbnail morphs into the hero circle
- [x] Detail content (name, stats, description) fades in after the circle animation settles
- [x] Back navigation (both in-app link and browser back) plays the reverse animation
- [x] Animation is skipped entirely when `prefers-reduced-motion: reduce` is active
- [x] No layout shift or flash-of-unstyled-content during transition
- [ ] Works on iOS Safari 17+, Chrome Android, Firefox Android
- [ ] Animation maintains 60fps on mid-range devices
- [x] Desktop layout is completely unaffected

### Research Insights: Additional Acceptance Criteria

Based on edge case research, consider adding:
- [x] Rapid taps during animation are ignored (no double-transition)
- [x] Orientation change between forward and reverse degrades gracefully (crossfade fallback)
- [x] Clone element is always cleaned up, even on unexpected navigation
- [x] Scroll position is restored to the tapped card's position on back navigation
- [x] `aria-busy` is set during animation to prevent screen reader announcement of partial content

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Card scroll position lost on return | Store `scrollTop` in composable before navigating to detail; restore on return |
| Floating clone z-index conflicts with sticky nav | Clone uses `position: fixed` + `z-index: 9999` + `pointer-events: none`, inserted into `<body>` via Teleport |
| Particle canvas visible during clone animation | Hide particles on the real circle during transition via `data-transitioning` attribute; clone is a static snapshot |
| Browser back button timing | Push dummy history entry on detail mount; intercept `popstate` to play reverse animation before Vue processes route change |
| SSR hydration mismatch | Transition composable is client-only; guard with `import.meta.client` checks. Return no-op functions during SSR |

### Research Insights: Additional Risks Discovered

| Risk | Mitigation |
|------|------------|
| Hero circle rect unstable on first frame of mount (ResizeObserver async) | Wait one `requestAnimationFrame` in `playForward` before measuring the "Last" rect |
| Scoped styles don't apply to `cloneNode(true)` elements | Define clone styles in `public/styles.css` as unscoped `.strait-transition-clone` class |
| `Animation.finished` promise rejects with `AbortError` on cancel | Wrap all `await animation.finished` in try/catch to handle unexpected cancellation |
| iOS Safari `getBoundingClientRect()` during scroll momentum returns incorrect values | Stop momentum scroll with `window.scrollTo(window.scrollX, window.scrollY)` before measurement, or accept slight offset |
| Device orientation change invalidates stored card rect | Detect via `matchMedia('(orientation: portrait)')` change listener; fall back to crossfade if orientation changed |
| `will-change` GPU layer not freed after animation | Always call `commitStyles()` then `cancel()` after animation completes, and remove `will-change` from clone before removal |
| Content fade-in starts before clone reaches target | Use `transitionState` as gate: content transitions to visible only after `transitionState` changes from `animating-forward` to `settled`, which happens only after `animation.finished` resolves |

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) -- Key decisions carried forward: card list with no map on mobile, nested routes with dynamic `[id]`, expand-in-place shared element transition
- **Existing components:** `StraitCard.vue`, `StraitCardList.vue`, `StraitMobileDetail.vue`, `StraitCircle.vue`
- **Page router:** `pages/infographics/straits/[[id]].vue` -- same-page `v-if` pattern between list and detail
- **FLIP technique reference:** Aerotwist "FLIP Your Animations" pattern (First-Last-Invert-Play)
- **Web Animations API:** MDN docs -- `Element.animate()`, `Animation.finished`, `Animation.commitStyles()`, `Animation.cancel()`
- **Motion design:** Emil Kowalski (duration, interruptibility, easing), Jakub Krehel (enter/exit asymmetry, blur bridge, shared layout patterns)
- **Vue composable patterns:** Vue 3 docs -- `onScopeDispose`, `readonly()`, SSR guards
- **Performance:** Motion design performance guidelines -- `will-change` budget, GPU layer management, composited-only properties
