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

defineProps<{
  /** When true, show the back face. */
  flipped: boolean
  /** Override transition duration in ms. */
  durationMs?: number
}>()
</script>

<template>
  <div class="card-flip" :style="{ '--card-flip-duration': (durationMs ?? 700) + 'ms' }">
    <div class="card-flip__inner" :class="{ 'is-flipped': flipped }">
      <div class="card-flip__face card-flip__face--front" :aria-hidden="flipped">
        <slot name="front" />
      </div>
      <div class="card-flip__face card-flip__face--back" :aria-hidden="!flipped">
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
