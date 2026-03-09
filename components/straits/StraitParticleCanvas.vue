<script setup lang="ts">
/**
 * StraitParticleCanvas — canvas overlay inside StraitCircle.
 *
 * Renders animated particle dots flowing through the strait's water polygon.
 * Sits absolutely positioned inside the circle, clipped by border-radius.
 * Coordinate space is 1080x1080 (matching strait polygon SVG viewBox).
 */
import { ref, toRef, onMounted } from 'vue'
import { useParticleSystem } from '~/composables/useParticleSystem'

const props = defineProps<{
  straitId: string
  year: string
  circleSize: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const visible = ref(false)

useParticleSystem({
  canvasRef,
  straitId: toRef(props, 'straitId'),
  year: toRef(props, 'year'),
  circleSize: toRef(props, 'circleSize'),
})

onMounted(() => {
  requestAnimationFrame(() => {
    visible.value = true
  })
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="strait-particle-canvas"
    :class="{ visible }"
    aria-hidden="true"
  />
</template>

<style scoped>
.strait-particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.4s ease 0.3s;
}

.strait-particle-canvas.visible {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .strait-particle-canvas {
    transition: none;
  }
}
</style>
