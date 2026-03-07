<script setup lang="ts">
import type { LabelAnchor } from '~/types/strait'

const props = defineProps<{
  id: string
  name: string
  globalShareLabel: string
  posX: number
  posY: number
  labelAnchor: LabelAnchor
  radius: number
  color: { h: number; s: number; l: number }
  hidden: boolean
  dimmed: boolean
  active: boolean
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'hover', id: string | null): void
  (e: 'activate', id: string): void
}>()

function displayLabel(): string {
  if (props.labelAnchor === 'left' && props.posX < 30) {
    const shortShare = props.globalShareLabel
      .replace('of global ', '')
      .replace('by volume', '')
      .trim()
    return `${props.name} | ${shortShare}`
  }
  return `${props.name} | ${props.globalShareLabel}`
}

function onFocusOut(event: FocusEvent) {
  const currentTarget = event.currentTarget as Element
  if (!currentTarget.contains(event.relatedTarget as Node)) {
    emit('hover', null)
  }
}
</script>

<template>
  <div
    class="strait-data"
    :class="{ 'strait-data--dimmed': dimmed, 'strait-data--hidden': hidden }"
    :style="{ left: `${posX}%`, top: `${posY}%` }"
    role="button"
    :tabindex="0"
    :aria-label="`${name}: ${globalShareLabel}`"
    @click="emit('activate', id)"
    @keydown.enter="emit('activate', id)"
    @keydown.space.prevent="emit('activate', id)"
    @mouseenter="emit('hover', id)"
    @mouseleave="emit('hover', null)"
    @focusin="emit('hover', id)"
    @focusout="onFocusOut($event)"
  >
    <StraitCircle :radius="radius" :color="color" :active="active" :image-url="selected ? `/assets/images/straits/${id}.jpg` : undefined" />
    <StraitLabel :text="name" :anchor="(id === 'taiwan' || id === 'luzon') ? 'right' : 'below'" :radius="radius" />
  </div>
</template>

<style scoped>
.strait-data {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: opacity 0.15s ease, left 0.6s cubic-bezier(0.4, 0, 0.2, 1), top 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.strait-data--dimmed {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.strait-data--hidden {
  opacity: 0;
  pointer-events: none;
}

.strait-data:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 4px;
  border-radius: 50%;
}

@media (prefers-reduced-motion: reduce) {
  .strait-data,
  .strait-data--dimmed {
    transition: none !important;
  }
}
</style>
