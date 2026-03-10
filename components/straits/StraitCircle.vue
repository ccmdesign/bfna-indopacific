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
  valueUSD?: number
  capacityMt?: number
  vessels?: number
  anySelected?: boolean
  sizeMetric?: 'tonnage' | 'ships' | 'value'
  tiltX?: number
  tiltY?: number
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
      transform: selected ? 'none' : `perspective(600px) rotateX(${tiltX ?? 0}deg) rotateY(${tiltY ?? 0}deg)`,
    }"
    :class="{ 'strait-circle--active': active, 'strait-circle--selected': selected }"
  >
    <!-- <div class="glow-ring" aria-hidden="true" /> -->
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
    <StraitSnapshot
      v-if="valueUSD != null && !anySelected"
      :value-u-s-d="valueUSD"
      :capacity-mt="capacityMt ?? 0"
      :vessels="vessels ?? 0"
      :size-metric="sizeMetric ?? 'tonnage'"
    />
  </div>
</template>

<style scoped>
.strait-circle {
  width: var(--diameter);
  height: var(--diameter);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  box-shadow: none;
  position: relative;
  border: calc(2px / var(--zoom-scale, 1)) solid white;
  transform-style: preserve-3d;
  transition: transform 0.15s ease-out;
}

/* Glow ring — real DOM element so it stacks reliably */
.glow-ring {
  position: absolute;
  top: -4px;
  left: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  border-radius: 50%;
  
  background: conic-gradient(
    from 0deg,
    rgba(255, 255, 255, 0.8),
    rgba(0, 200, 200, 0.6),
    rgba(30, 90, 200, 0.7),
    rgba(0, 180, 220, 0.6),
    rgba(255, 255, 255, 0.8),
    rgba(50, 130, 220, 0.7),
    rgba(0, 200, 200, 0.6),
    rgba(255, 255, 255, 0.8)
  );
  filter: blur(24px);
  animation: glow-spin 8s linear infinite;
  opacity: 0.75;
  transition: opacity 0.3s ease-in-out, filter 0.3s ease-in-out;
  pointer-events: none;
  /* Mask out the interior — only a ~4px ring is visible */
  -webkit-mask: radial-gradient(circle, transparent calc(65% - 4px), black 35%);
  mask: radial-gradient(circle, transparent calc(65% - 4px), black 35%);
  outline: 4px solid white;
}

/* Hover: intensify the glow */
.strait-circle--active .glow-ring {
  opacity: 0.85;
  filter: blur(24px);
}

.strait-circle--selected {
  overflow: hidden;
}

/* Selected: keep glow visible, fit inside the clipped area */
.strait-circle--selected .glow-ring {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.85;
  filter: blur(24px);
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

@keyframes glow-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .glow-ring {
    animation: none;
  }
  .strait-circle,
  .strait-bg-image {
    transition: none;
  }
}
</style>
