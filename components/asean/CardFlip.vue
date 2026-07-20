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
// Honour reduced-motion: cross-fade instead of rotate.

import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  /** When true, show the back face. */
  flipped: boolean
  /** Override transition duration in ms. */
  durationMs?: number
}>()

const durationMs = computed(() => props.durationMs ?? 700)

// BF-104: `backface-visibility` alone is a single point of failure for hiding the
// inactive face — it breaks wherever a face contains its own compositing layers
// (the SVG charts do), notably in Safari and on software / blocklisted-GPU 3D
// paths. When it fails BOTH faces paint at once and the trade chart shows through,
// mirrored, on the Critical Minerals tab. That is the client-reported symptom.
//
// So back it with `visibility`, which needs no 3D support. The catch is timing: the
// outgoing face must stay painted while it rotates away. `settled` therefore
// mirrors `flipped`, but only once the rotation has finished — during the flip the
// two disagree and both faces stay visible, which is exactly what the animation
// needs. A face is hidden only when `flipped` and `settled` agree it is inactive.
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
    settleTimer = setTimeout(() => {
      settled.value = next
    }, durationMs.value)
  }
)

onBeforeUnmount(() => clearTimeout(settleTimer))

const frontHidden = computed(() => props.flipped && settled.value)
const backHidden = computed(() => !props.flipped && !settled.value)
</script>

<template>
  <div class="card-flip" :style="{ '--card-flip-duration': durationMs + 'ms' }">
    <div class="card-flip__inner" :class="{ 'is-flipped': flipped }">
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
   `visibility: hidden` also drops the face out of hit-testing, so a trade-chart
   tooltip can never fire over the Critical Minerals tab. */
.card-flip__face.is-hidden {
  visibility: hidden;
}

.card-flip__face--back {
  transform: rotateY(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .card-flip__inner,
  .card-flip__inner.is-flipped {
    transform: none;
    transition: none;
  }
  /* No rotation: faces un-mirror and cross-fade by opacity within the shared
     grid cell, so the hidden face still un-mirrors instead of relying on
     backface-visibility (which would blank a non-rotated face). */
  .card-flip__face {
    transition: opacity 200ms ease;
    transform: none;
    backface-visibility: visible;
    -webkit-backface-visibility: visible;
  }
  .card-flip__face--front {
    opacity: 1;
  }
  .card-flip__face--back {
    opacity: 0;
  }
  .card-flip__inner.is-flipped .card-flip__face--front {
    opacity: 0;
  }
  .card-flip__inner.is-flipped .card-flip__face--back {
    opacity: 1;
  }
}
</style>
