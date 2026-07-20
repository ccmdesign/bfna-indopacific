<script setup lang="ts">
// Generic 3D flip wrapper. Two slots (front + back) sit on opposite faces of
// a card-sized box. Toggle `flipped` to rotate the whole stack on the Y axis.
//
// Usage:
//   <CardFlip :flipped="someState">
//     <template #front>...</template>
//     <template #back>...</template>
//   </CardFlip>
//
// Where the rotation can't be trusted — or the user asked for less motion — the
// component falls back to "flat" mode: same stacked slot, instant swap, no
// rotation at all. See `flat` below.

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  /** When true, show the back face. */
  flipped: boolean
  /** Override transition duration in ms. */
  durationMs?: number
}>()

// Named distinctly from the `durationMs` prop: a setup binding of the same name
// would shadow the prop in the template, which reads as a bug even when it isn't.
const flipDurationMs = computed(() => props.durationMs ?? 700)

// Flat mode: drop the 3D rotation and just swap the faces in place.
//
// Three triggers, all resolved client-side (SSR has no browser to inspect, and
// the server-rendered default is the flip — a class change on hydrate, with no
// visual difference at rest):
//
//  1. prefers-reduced-motion — the user asked for less movement. Kept live via a
//     matchMedia listener so toggling the OS setting takes effect immediately.
//  2. No `preserve-3d` support — the rotation would collapse to a 2D smear.
//  3. WebKit — Safari and every iOS browser. These DO report preserve-3d support,
//     so `@supports` can't catch them, but their `backface-visibility` is
//     unreliable once a face contains its own compositing layers (our SVG charts
//     do). BF-104's `visibility` gate keeps the settled state correct there, but
//     mid-rotation both faces are deliberately painted and the outgoing face can
//     bleed through mirrored. Flat mode removes that window entirely.
//     `navigator.vendor` is the cheap discriminator: 'Apple Computer, Inc.' for
//     WebKit, something else for Chrome/Firefox. Revisit if Safari's compositing
//     stops glitching.
const flat = ref(false)
let motionQuery: MediaQueryList | undefined

const isWebkit = () => navigator.vendor === 'Apple Computer, Inc.'
const lacks3d = () => !CSS.supports('transform-style', 'preserve-3d')

function syncFlat() {
  flat.value = Boolean(motionQuery?.matches) || lacks3d() || isWebkit()
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', syncFlat)
  syncFlat()
})

// Flat mode swaps instantly, so the settle gate below must not hold the outgoing
// face open for the (now non-existent) rotation.
const settleMs = computed(() => (flat.value ? 0 : flipDurationMs.value))

// BF-104: `backface-visibility` alone is a single point of failure for hiding the
// inactive face. Back it with `visibility`, which needs no 3D support. The catch
// is timing: the outgoing face must stay painted while it rotates away. `settled`
// therefore mirrors `flipped`, but only once the rotation has finished — during
// the flip the two disagree and both faces stay visible, which is exactly what
// the animation needs. A face is hidden only when `flipped` and `settled` agree
// it is inactive. In flat mode `settleMs` is 0, so they agree immediately and the
// swap is instant — which is also what keeps the inactive face out of hit-testing
// straight away, so a trade-chart tooltip can't fire over the minerals tab.
//
// Deliberately driven from component state rather than a CSS `visibility`
// transition: transitions are frozen in background/occluded tabs, so a
// transition-timed gate can strand a face in the wrong state.
const settled = ref(props.flipped)
let settleTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.flipped,
  (next) => {
    clearTimeout(settleTimer)
    // Flat mode settles synchronously, not via a 0ms timer: a timer still costs
    // one macrotask, and that is a frame in which the outgoing trade face is
    // still painted and hit-testable on the Critical Minerals tab. Caught in
    // testing — the swap has to be atomic with the tab change, not merely fast.
    if (settleMs.value === 0) {
      settled.value = next
      return
    }
    settleTimer = setTimeout(() => {
      settled.value = next
    }, settleMs.value)
  }
)

onBeforeUnmount(() => {
  clearTimeout(settleTimer)
  motionQuery?.removeEventListener('change', syncFlat)
})

const frontHidden = computed(() => props.flipped && settled.value)
const backHidden = computed(() => !props.flipped && !settled.value)
</script>

<template>
  <div class="card-flip" :style="{ '--card-flip-duration': flipDurationMs + 'ms' }">
    <div class="card-flip__inner" :class="{ 'is-flipped': flipped, 'is-flat': flat }">
      <div
        class="card-flip__face card-flip__face--front"
        :class="{ 'is-hidden': frontHidden }"
        :aria-hidden="flipped"
      >
        <slot name="front" />
      </div>
      <div
        class="card-flip__face card-flip__face--back"
        :class="{ 'is-hidden': backHidden }"
        :aria-hidden="!flipped"
      >
        <slot name="back" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-flip {
  position: relative;
  width: 100%;
  perspective: 1400px;
  min-width: 0;
}

/* Both faces share a single grid cell, so the inner sizes to the TALLER face's
   intrinsic height — no absolute positioning and no explicit height required
   from the consumer. The flip is a Y-axis rotation of this stacked layer. */
.card-flip__inner {
  display: grid;
  width: 100%;
  transform-style: preserve-3d;
  transition: transform var(--card-flip-duration, 700ms) cubic-bezier(0.7, 0, 0.2, 1);
  will-change: transform;
}

.card-flip__inner.is-flipped {
  transform: rotateY(180deg);
}

.card-flip__face {
  grid-area: 1 / 1;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* BF-104: the settled-state gate (see the script block). Independent of 3D
   support, so the trade face stays hidden even where `backface-visibility` fails.
   `visibility: hidden` also drops the face out of hit-testing. */
.card-flip__face.is-hidden {
  visibility: hidden;
}

.card-flip__face--back {
  transform: rotateY(180deg);
}

/* Flat mode: no rotation, so the faces must un-mirror and `backface-visibility`
   must be neutralised (it would blank a face that never rotates). Hiding is left
   entirely to the `is-hidden` gate above, which in flat mode applies immediately.
   `will-change: auto` drops a compositing layer we no longer animate. */
.card-flip__inner.is-flat,
.card-flip__inner.is-flat.is-flipped {
  transform: none;
  transition: none;
  transform-style: flat;
  will-change: auto;
}

.card-flip__inner.is-flat .card-flip__face,
.card-flip__inner.is-flat .card-flip__face--back {
  transform: none;
  backface-visibility: visible;
  -webkit-backface-visibility: visible;
}
</style>
