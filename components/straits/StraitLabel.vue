<script setup lang="ts">
import type { LabelAnchor } from '~/types/strait'

defineProps<{
  text: string
  anchor: LabelAnchor
  radius: number
}>()
</script>

<template>
  <span
    class="strait-label"
    :class="`strait-label--${anchor}`"
    :style="{ '--offset': `${radius + 8}px` }"
  >
    {{ text }}
  </span>
</template>

<style scoped>
.strait-label {
  position: absolute;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Encode Sans', sans-serif;
  font-size: 14px;
  font-weight: 300;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.strait-label--below {
  top: calc(50% + var(--offset));
  left: 50%;
  transform: translateX(-50%);
}

.strait-label--above {
  bottom: calc(50% + var(--offset));
  left: 50%;
  transform: translateX(-50%);
}

.strait-label--right {
  left: calc(50% + var(--offset));
  top: 50%;
  transform: translateY(-50%);
}

.strait-label--left {
  right: calc(50% + var(--offset));
  top: 50%;
  transform: translateY(-50%);
}
</style>
