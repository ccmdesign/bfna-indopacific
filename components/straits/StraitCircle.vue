<script setup lang="ts">
import { computed } from 'vue'
import { flowConfigs } from '~/data/straits/flow-configs'

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
    <img
      v-if="bgImageSrc"
      :src="bgImageSrc"
      width="1080"
      height="1080"
      alt=""
      aria-hidden="true"
      class="strait-bg-image"
      :class="{ 'strait-bg-image--visible': selected }"
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
