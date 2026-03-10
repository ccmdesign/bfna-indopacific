<script setup lang="ts">
/**
 * FisheyeLens — WebGL canvas wrapper with animated entrance.
 *
 * Renders a satellite image through the fisheye barrel distortion shader
 * with specular highlight, vignette, and an animated strength ramp.
 * Falls back gracefully when WebGL is unavailable.
 *
 * Note: No exit animation is implemented because the parent (StraitCircle)
 * uses v-if="selected" which removes this component from the DOM immediately
 * on deselect — any exit animation would be invisible. (See todo #133)
 */
import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import { useFisheyeCanvas } from '~/composables/useFisheyeCanvas'

const props = defineProps<{
  imageUrl: string
  active: boolean
}>()

const emit = defineEmits<{
  'webgl-status': [available: boolean]
  'texture-status': [loaded: boolean]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const imageUrlRef = computed(() => props.imageUrl) as Ref<string | undefined>
const distortion = ref(0.3)
const aberration = ref(0.015)
const strength = ref(0.0)
const specular = ref(0.6)
const vignette = ref(0.8)

const { webglAvailable, textureLoaded, render } = useFisheyeCanvas({
  canvasRef,
  imageUrl: imageUrlRef,
  distortion,
  aberration,
  strength,
  specular,
  vignette,
})

// Emit WebGL availability to parent for fallback logic.
// Using { immediate: true } ensures emission on initial value without
// relying on composable onMounted hook ordering. (See todo #137)
watch(webglAvailable, (available) => {
  emit('webgl-status', available)
}, { immediate: true })

// Forward texture load status so parent can show fallback on failure (see todo #140)
watch(textureLoaded, (loaded) => {
  emit('texture-status', loaded)
}, { immediate: true })

// ---------------------------------------------------------------------------
// Animated entrance via rAF (entrance only — no exit animation, see header)
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

watch(() => props.active, (isActive) => {
  if (isActive) {
    animateIn()
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
