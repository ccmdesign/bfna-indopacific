<script setup lang="ts">
/**
 * StraitParticleCanvas — thin wrapper around the useParticleSystem composable.
 *
 * Renders a <canvas> element inside .map-inner with absolute positioning.
 * The canvas shows animated particle dots along Bezier shipping-lane paths
 * when a strait is selected and zoomed.
 */
import { ref, toRef, onMounted } from 'vue'
import type { Strait } from '~/types/strait'
import { useParticleSystem } from '~/composables/useParticleSystem'

const props = defineProps<{
  straitId: string | null
  year: string
  innerSize: { w: number; h: number }
  zoomScale: number
  selectedStrait: Strait | null
  clipRadius: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const visible = ref(false)

useParticleSystem({
  canvasRef,
  straitId: toRef(props, 'straitId'),
  year: toRef(props, 'year'),
  innerSize: toRef(props, 'innerSize'),
  zoomScale: toRef(props, 'zoomScale'),
  selectedStrait: toRef(props, 'selectedStrait'),
  clipRadius: toRef(props, 'clipRadius'),
})

onMounted(() => {
  // Trigger CSS fade-in on next frame
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
