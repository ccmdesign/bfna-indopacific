<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { LabelAnchor } from '~/types/strait'

const props = defineProps<{
  id: string
  name: string
  globalShareLabel: string
  valueUSD: number
  capacityMt: number
  vessels: number
  posX: number
  posY: number
  labelAnchor: LabelAnchor
  radius: number
  color: { h: number; s: number; l: number }
  hidden: boolean
  dimmed: boolean
  active: boolean
  selected: boolean
  zoomingOut: boolean
  anySelected: boolean
  sizeMetric: 'tonnage' | 'ships' | 'value'
  disabled?: boolean
  year?: string
  tiltX?: number
  tiltY?: number
}>()

const emit = defineEmits<{
  (e: 'hover', id: string | null): void
  (e: 'activate', id: string): void
}>()

const raised = ref(false)
let raiseTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.active, (isActive) => {
  if (raiseTimer) { clearTimeout(raiseTimer); raiseTimer = null }
  if (isActive) {
    raiseTimer = setTimeout(() => { raised.value = true }, 1000)
  } else {
    raised.value = false
  }
})

onBeforeUnmount(() => { if (raiseTimer) clearTimeout(raiseTimer) })

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
    :class="{ 'strait-data--active': raised, 'strait-data--dimmed': dimmed, 'strait-data--hidden': hidden, 'strait-data--selected': selected, 'strait-data--zooming-out': zoomingOut }"
    :style="{ left: `${posX}%`, top: `${posY}%`, anchorName: selected ? '--selected-strait' : 'none' }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-label="`${name}: ${globalShareLabel}`"
    @click="emit('activate', id)"
    @keydown.enter="emit('activate', id)"
    @keydown.space.prevent="emit('activate', id)"
    @mouseenter="emit('hover', id)"
    @mouseleave="emit('hover', null)"
    @focusin="emit('hover', id)"
    @focusout="onFocusOut($event)"
  >
    <StraitCircle
      :radius="radius"
      :color="color"
      :active="active"
      :selected="selected"
      :strait-id="id"
      :year="year"
      :value-u-s-d="valueUSD"
      :capacity-mt="capacityMt"
      :vessels="vessels"
      :any-selected="anySelected"
      :size-metric="sizeMetric"
      :tilt-x="tiltX"
      :tilt-y="tiltY"
    />
    <StraitLabel :text="name" :anchor="(id === 'taiwan' || id === 'luzon') ? 'right' : 'below'" :radius="radius" />
  </div>
</template>

<style scoped>
.strait-data {
  position: absolute;
  transform: translate(-50%, -50%);
  transform-origin: 0 0;
  cursor: pointer;
  z-index: 0;
  transition: opacity 0.4s ease, scale 0.6s cubic-bezier(0.4, 0, 0.2, 1), translate 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.strait-data--active {
  z-index: 1;
}

.strait-data--dimmed :deep(.strait-circle) {
  border-color: rgba(255, 255, 255, 0.3);
  transition: border-color 0.3s ease, transform 0.15s ease-out, width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.strait-data--dimmed :deep(.snapshot-overlay) {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.strait-data--dimmed :deep(.strait-label) {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.strait-data--hidden {
  opacity: 0;
  pointer-events: none;
}

.strait-data--zooming-out {
  opacity: 0;
  scale: 0;
  pointer-events: none;
  transition: none;
}

.strait-data--selected :deep(.strait-label) {
  opacity: 0;
  transition: opacity 0.3s ease;
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
