<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFisheyeCanvas } from '~/composables/useFisheyeCanvas'

const props = defineProps<{
  radius: number
  color: { h: number; s: number; l: number }
  active: boolean
  imageUrl?: string
}>()

// --- Reduced motion (reactive, SSR-safe) ---
const prefersReducedMotion = ref(false)

onMounted(() => {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  prefersReducedMotion.value = mql.matches
  const handler = (e: MediaQueryListEvent) => {
    prefersReducedMotion.value = e.matches
  }
  mql.addEventListener('change', handler)
  onUnmounted(() => mql.removeEventListener('change', handler))
})

// --- Fisheye shader ---
const fisheyeCanvas = ref<HTMLCanvasElement | null>(null)
const imageUrlRef = computed(() => props.imageUrl)
const distortion = ref(0.65)
const aberration = ref(0.008)

const { webglAvailable } = useFisheyeCanvas(fisheyeCanvas, imageUrlRef, distortion, aberration)

// --- Rendering mode ---
const showCanvas = computed(() =>
  !!props.imageUrl && webglAvailable.value && !prefersReducedMotion.value,
)
const showFallbackImg = computed(() =>
  !!props.imageUrl && !showCanvas.value,
)
</script>

<template>
  <div
    class="strait-circle"
    :style="{
      '--diameter': `${radius * 2}px`,
      '--h': color.h,
      '--s': `${color.s}%`,
      '--l': `${color.l}%`,
    }"
    :class="{ 'strait-circle--active': active }"
  >
    <!-- Fisheye shader canvas (WebGL available, image provided, motion OK) -->
    <canvas
      v-if="showCanvas"
      ref="fisheyeCanvas"
      class="strait-circle__canvas"
      aria-hidden="true"
    />
    <!-- Fallback: plain image (WebGL unavailable or reduced motion) -->
    <img
      v-else-if="showFallbackImg"
      :src="imageUrl"
      class="strait-circle__img"
      alt=""
      aria-hidden="true"
    />
    <!-- No image: CSS-only circle (existing behavior) -->
  </div>
</template>

<style scoped>
.strait-circle {
  width: var(--diameter);
  height: var(--diameter);
  border-radius: 50%;
  background: hsla(var(--h), var(--s), var(--l), 0.12);
  border: 1.5px solid hsla(var(--h), var(--s), var(--l), 0.7);
  box-shadow:
    0 0 16px 4px hsla(var(--h), var(--s), var(--l), 0.25),
    inset 0 0 8px hsla(var(--h), var(--s), 70%, 0.08);
  transition: background 0.2s ease, border-color 0.2s ease;
  position: relative;
  overflow: hidden;
}

.strait-circle--active {
  background: hsla(var(--h), var(--s), var(--l), 0.25);
  border-color: hsla(var(--h), var(--s), var(--l), 1);
}

.strait-circle__canvas {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.strait-circle__img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

@media (prefers-reduced-motion: reduce) {
  .strait-circle {
    transition: none;
  }
}
</style>
