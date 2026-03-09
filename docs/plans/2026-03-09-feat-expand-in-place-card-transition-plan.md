---
title: "feat: Expand-in-place shared element transition"
type: feat
status: active
date: 2026-03-09
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
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

#### 4. Modifications to `[[id]].vue`

- Wrap the mobile `v-if` section with transition coordination
- During `animating-forward`, render BOTH the card list (fading out) and the detail (with FLIP circle)
- During `animating-back`, render detail fading while card list fades in
- Use a brief overlap period (~300ms) where both components coexist

#### 5. Transition overlay element

During the FLIP animation, a **floating circle clone** sits above both views:

1. On tap: clone the card's circle thumbnail, position it absolutely at the card's rect
2. Hide the real card circle and the real hero circle
3. Animate the clone from card rect to hero rect using `transform: translate() scale()`
4. On animation end: remove clone, show real hero circle, fade in detail content
5. Reverse: same in opposite direction

This avoids needing both components mounted simultaneously and sidesteps the `v-if` switching timing issue.

### Animation Spec

| Property | Forward | Reverse |
|----------|---------|---------|
| Duration | 350ms | 300ms |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` (Material ease-out) | `cubic-bezier(0.4, 0, 0.6, 1)` |
| Circle | translate + scale from card rect to hero rect | hero rect to card rect |
| Card list | opacity 1 -> 0, 150ms | opacity 0 -> 1, 150ms, delay 150ms |
| Detail content | opacity 0 -> 1, 200ms, delay 200ms | opacity 1 -> 0, 100ms |
| Nav bar | opacity 0 -> 1, 150ms, delay 250ms | opacity 1 -> 0, 100ms |

### Reduced Motion

When `prefers-reduced-motion: reduce`:
- Skip all animations
- Instant cut between states (current behavior preserved)
- Already have precedent in `StraitCard.vue` and `StraitMobileDetail.vue` `@media` rules

## Implementation Phases

### Phase 1: FLIP composable + forward transition

**Files:**
- `composables/useStraitTransition.ts` (new)
- `components/straits/StraitCard.vue` (modify: add click capture + ref)
- `components/straits/StraitMobileDetail.vue` (modify: trigger forward animation on mount)
- `pages/infographics/straits/[[id]].vue` (modify: coordinate transition overlay)

**Tasks:**
- [ ] Create `useStraitTransition` composable with FLIP logic
- [ ] Capture card thumbnail rect on click in `StraitCard.vue`
- [ ] Create floating circle clone positioned at card rect
- [ ] Animate clone to hero position using Web Animations API
- [ ] Fade in detail content with staggered delay
- [ ] Handle `prefers-reduced-motion`

**Success criteria:** Tapping a card plays a smooth circle-morph animation into the hero, detail content fades in below.

### Phase 2: Reverse transition on back navigation

**Files:**
- `composables/useStraitTransition.ts` (extend)
- `components/straits/StraitMobileDetail.vue` (modify: intercept back navigation)

**Tasks:**
- [ ] Store the last card rect for reverse animation
- [ ] Intercept back button click and browser back
- [ ] Animate hero circle back to stored card position
- [ ] Fade out detail content first, then play reverse FLIP
- [ ] Navigate to list after animation completes
- [ ] Handle edge case: card list may have scrolled (re-measure or use stored position)

**Success criteria:** Pressing back plays the reverse animation; the hero circle shrinks back to where the card was.

### Phase 3: Polish and edge cases

**Tasks:**
- [ ] Handle rapid tap (debounce or ignore taps during animation)
- [ ] Handle browser back button (popstate) vs in-app back link
- [ ] Scroll position restoration: return to the same scroll offset in the card list
- [ ] Test with slow network (skeleton state during transition)
- [ ] Verify particle canvas doesn't interfere with the clone animation
- [ ] Test across iOS Safari, Chrome Android, Firefox Android
- [ ] Performance profile: ensure 60fps on mid-range mobile

## Acceptance Criteria

- [ ] Tapping a strait card plays an expand-in-place animation where the circle thumbnail morphs into the hero circle
- [ ] Detail content (name, stats, description) fades in after the circle animation settles
- [ ] Back navigation (both in-app link and browser back) plays the reverse animation
- [ ] Animation is skipped entirely when `prefers-reduced-motion: reduce` is active
- [ ] No layout shift or flash-of-unstyled-content during transition
- [ ] Works on iOS Safari 17+, Chrome Android, Firefox Android
- [ ] Animation maintains 60fps on mid-range devices
- [ ] Desktop layout is completely unaffected

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Card scroll position lost on return | Store `scrollTop` in composable before navigating to detail; restore on return |
| Floating clone z-index conflicts with sticky nav | Clone uses `position: fixed` + high z-index, inserted into `<body>` via Teleport |
| Particle canvas visible during clone animation | Hide particles on the real circle during transition; clone is a static snapshot |
| Browser back button timing | Listen to `popstate` and intercept to play reverse animation before Vue processes the route change |
| SSR hydration mismatch | Transition composable is client-only; guard with `import.meta.client` checks |

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) -- Key decisions carried forward: card list with no map on mobile, nested routes with dynamic `[id]`, expand-in-place shared element transition
- **Existing components:** `StraitCard.vue`, `StraitCardList.vue`, `StraitMobileDetail.vue`, `StraitCircle.vue`
- **Page router:** `pages/infographics/straits/[[id]].vue` -- same-page `v-if` pattern between list and detail
- **FLIP technique reference:** Aerotwist "FLIP Your Animations" pattern (First-Last-Invert-Play)
