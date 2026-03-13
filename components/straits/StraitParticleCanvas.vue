<!-- @deprecated BF-111: safe to remove once MarineTraffic embed is validated -->
<script setup lang="ts">
/**
 * StraitParticleCanvas — canvas overlay inside StraitCircle.
 *
 * Renders animated particle dots flowing through the strait's water polygon.
 * Sits absolutely positioned inside the circle, clipped by border-radius.
 * Uses the unified useParticleFlow composable with per-strait flow configs.
 */
import { ref, toRef, computed, onMounted, type Ref } from 'vue'
import { useParticleFlow } from '~/composables/useParticleFlow'
import { flowConfigs } from '~/data/straits/flow-configs'
import type { StraitFlowConfig } from '~/utils/particleEngine'

const props = defineProps<{
  straitId: string
  year: string
  circleSize: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const visible = ref(false)

const config = computed(() => {
  const c = flowConfigs[props.straitId]
  if (!c && import.meta.dev) {
    console.warn(`[StraitParticleCanvas] No flow config for: ${props.straitId}`)
  }
  return c ?? null
})

// Always call composable unconditionally (Vue composition API rules).
// The composable handles null config gracefully via the resolved config check.
useParticleFlow({
  canvasRef,
  config: config as Ref<StraitFlowConfig | null>,
  circleSize: toRef(props, 'circleSize'),
  straitId: toRef(props, 'straitId'),
  year: toRef(props, 'year'),
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
