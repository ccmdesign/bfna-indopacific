<script setup lang="ts">
import { computed, ref } from 'vue'
import { flowConfigs } from '~/data/straits/flow-configs'
import { useReducedMotion } from '~/composables/useReducedMotion'

const props = defineProps<{
  radius: number
  color: { h: number; s: number; l: number }
  active: boolean
  straitId?: string
  year?: string
  selected?: boolean
}>()

const flowConfig = computed(() =>
  props.straitId ? flowConfigs[props.straitId] ?? null : null
)

const showParticles = computed(() =>
  props.selected && flowConfig.value
)

const bgImageSrc = computed(() => flowConfig.value?.backgroundImage ?? null)

// Shared composable for prefers-reduced-motion detection (see todo #138)
const prefersReducedMotion = useReducedMotion()

// ---------------------------------------------------------------------------
// WebGL + texture availability for fallback
// ---------------------------------------------------------------------------
const webglReady = ref(false)
const textureReady = ref(false)

function onWebGLStatus(available: boolean) {
  webglReady.value = available
}

function onTextureStatus(loaded: boolean) {
  textureReady.value = loaded
}

// Show fallback image when: no WebGL, reduced motion preferred,
// or texture failed to load (see todo #140)
const showFallbackImage = computed(() =>
  props.selected && (!webglReady.value || prefersReducedMotion.value || !textureReady.value)
)

const hideFallbackImage = computed(() =>
  props.selected && webglReady.value && !prefersReducedMotion.value && textureReady.value
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
    :class="{ 'strait-circle--active': active, 'strait-circle--selected': selected }"
  >
    <FisheyeLens
      v-if="selected && bgImageSrc && !prefersReducedMotion"
      :image-url="bgImageSrc"
      :active="selected"
      @webgl-status="onWebGLStatus"
      @texture-status="onTextureStatus"
    />
    <img
      v-if="bgImageSrc"
      :src="bgImageSrc"
      width="1080"
      height="1080"
      alt=""
      aria-hidden="true"
      class="strait-bg-image"
      :class="{
        'strait-bg-image--visible': showFallbackImage,
        'strait-bg-image--hidden': hideFallbackImage,
      }"
    />
    <StraitParticles
      v-if="showParticles"
      :config="flowConfig as any"
    />
  </div>
</template>

<style scoped>
.strait-circle {
  width: var(--diameter);
  height: var(--diameter);
  border-radius: 50%;
  background: hsla(var(--h), var(--s), var(--l), 0.12);
  border: none;
  box-shadow: none;
  transition: background 0.2s ease;
}

/*
 * position:relative is required here so FisheyeLens (position:absolute; inset:0)
 * is positioned within the circle. This class is only applied when `selected`
 * is true, which aligns with FisheyeLens being rendered via v-if="selected".
 * If the v-if condition ever diverges from the --selected class, FisheyeLens
 * will not be positioned correctly. (See todo #141)
 */
.strait-circle--selected {
  position: relative;
  overflow: hidden;
}

.strait-bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  scale: 1.5;
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), scale 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.strait-bg-image--visible {
  opacity: 1;
  scale: 1;
}

.strait-bg-image--hidden {
  opacity: 0;
  scale: 1;
}

.strait-circle--active {
  background: hsla(var(--h), var(--s), var(--l), 0.25);
}

@media (prefers-reduced-motion: reduce) {
  .strait-circle,
  .strait-bg-image {
    transition: none;
  }
}
</style>
