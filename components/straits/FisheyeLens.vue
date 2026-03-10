<script setup lang="ts">
/**
 * FisheyeLens — WebGL canvas wrapper with animated entrance.
 *
 * Renders a satellite image through the fisheye barrel distortion shader
 * with specular highlight, vignette, and an animated strength ramp.
 * Falls back gracefully when WebGL is unavailable.
 */
import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import { useFisheyeCanvas } from '~/composables/useFisheyeCanvas'

const props = defineProps<{
  imageUrl: string
  active: boolean
}>()

const emit = defineEmits<{
  'webgl-status': [available: boolean]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const imageUrlRef = computed(() => props.imageUrl) as Ref<string | undefined>
const distortion = ref(0.3)
const aberration = ref(0.015)
const strength = ref(0.0)
const specular = ref(0.6)
const vignette = ref(0.8)

const { webglAvailable, render } = useFisheyeCanvas(
  canvasRef,
  imageUrlRef,
  distortion,
  aberration,
  strength,
  specular,
  vignette,
)

// Emit WebGL availability to parent for fallback logic
watch(webglAvailable, (available) => {
  emit('webgl-status', available)
})

// Also emit on mount in case it resolves synchronously
onMounted(() => {
  if (webglAvailable.value) {
    emit('webgl-status', true)
  }
})

// ---------------------------------------------------------------------------
// Animated entrance via rAF
// ---------------------------------------------------------------------------

let animFrameId: number | null = null

function cancelAnimation() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function animateIn() {
  cancelAnimation()
  const start = performance.now()
  const duration = 600

  function tick(now: number) {
    const t = Math.min((now - start) / duration, 1.0)
    strength.value = easeOutCubic(t)
    render() // Direct call — bypass watcher lag during animation
    if (t < 1.0) {
      animFrameId = requestAnimationFrame(tick)
    } else {
      animFrameId = null
    }
  }
  animFrameId = requestAnimationFrame(tick)
}

function animateOut() {
  cancelAnimation()
  const start = performance.now()
  const duration = 200
  const fromStrength = strength.value

  function tick(now: number) {
    const t = Math.min((now - start) / duration, 1.0)
    // ease-in for exit: fast at end
    const eased = t * t
    strength.value = fromStrength * (1 - eased)
    render()
    if (t < 1.0) {
      animFrameId = requestAnimationFrame(tick)
    } else {
      animFrameId = null
    }
  }
  animFrameId = requestAnimationFrame(tick)
}

watch(() => props.active, (isActive) => {
  if (isActive) {
    animateIn()
  } else {
    animateOut()
  }
})

// If already active on mount, animate in
onMounted(() => {
  if (props.active) {
    animateIn()
  }
})

onUnmounted(() => {
  cancelAnimation()
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="fisheye-lens"
    aria-hidden="true"
  />
</template>

<style scoped>
.fisheye-lens {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
