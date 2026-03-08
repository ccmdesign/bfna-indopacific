<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { select } from 'd3-selection'
import { useCorridor } from '~/composables/useCorridor'
import { useShipSimulation } from '~/composables/useShipSimulation'
import type { Ship, VesselType } from '~/types/strait'
import type { TrafficConfig } from '~/composables/useShipSimulation'

const props = defineProps<{
  radius: number
  color: { h: number; s: number; l: number }
  active: boolean
  imageUrl?: string
  straitId?: string | null
  showShips?: boolean
  trafficConfig?: TrafficConfig | null
}>()

// --- Ship simulation wiring ---

const corridorId = computed(() => props.showShips ? (props.straitId ?? null) : null)
const { geometry, corridor } = useCorridor(corridorId)

const corridorViewBox = computed(() => {
  const vb = corridor.value?.viewBox
  return vb ? `${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}` : '0 0 1080 1080'
})

const trafficConfigRef = computed(() => props.trafficConfig ?? null)

const { ships } = useShipSimulation({ geometry, trafficConfig: trafficConfigRef })

const svgRef = ref<SVGSVGElement | null>(null)

const SHIP_COLORS: Record<VesselType, string> = {
  container: 'hsl(218, 60%, 58%)',
  dryBulk: 'hsl(34, 60%, 50%)',
  tanker: 'hsl(350, 60%, 55%)',
}

const SHIP_RADIUS = 6

// IMPORTANT: watch(ships, ...) must use the ref directly — NOT watch(() => ships.value, ...).
// triggerRef(ships) only fires watchers that watch the ref object. See vuejs/core#9579.
watch(ships, (allShips) => {
  if (!svgRef.value) return
  const svg = select(svgRef.value)
  const active = allShips.filter(s => s.active)

  svg.selectAll<SVGCircleElement, Ship>('circle.ship')
    .data(active, d => String(d.id))
    .join(
      enter => enter.append('circle')
        .attr('class', 'ship')
        .attr('r', SHIP_RADIUS)
        .attr('fill', d => SHIP_COLORS[d.vesselType])
        .attr('cx', d => d.x)
        .attr('cy', d => d.y),
      update => update
        .attr('cx', d => d.x)
        .attr('cy', d => d.y),
      exit => exit.remove(),
    )
}, { flush: 'post' })
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
    :class="{ 'strait-circle--active': active }"
  >
    <img
      v-if="imageUrl"
      class="strait-circle__image"
      :src="imageUrl"
      alt=""
      aria-hidden="true"
    />
    <svg
      v-if="showShips"
      ref="svgRef"
      class="strait-circle__ships"
      :viewBox="corridorViewBox"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <!-- D3 manages children -->
    </svg>
  </div>
</template>

<style scoped>
.strait-circle {
  width: var(--diameter);
  height: var(--diameter);
  border-radius: 50%;
  background: hsla(var(--h), var(--s), var(--l), 0.12);
  border: 1.5px solid hsla(var(--h), var(--s), var(--l), 0.7);
  box-shadow:
    0 0 16px 4px hsla(var(--h), var(--s), var(--l), 0.25),
    inset 0 0 8px hsla(var(--h), var(--s), 70%, 0.08);
  transition: background 0.2s ease, border-color 0.2s ease, width 0.6s cubic-bezier(0.4, 0, 0.2, 1), height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.strait-circle__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.4s ease 0.2s;
}

.strait-circle:has(.strait-circle__image, .strait-circle__ships) {
  position: relative;
  overflow: hidden;
}

.strait-circle:has(.strait-circle__image) .strait-circle__image {
  opacity: 1;
}

.strait-circle__ships {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.strait-circle__ships :deep(circle.ship) {
  opacity: 0.85;
  transition: none; /* no CSS transitions — D3 handles position updates */
}

.strait-circle--active {
  background: hsla(var(--h), var(--s), var(--l), 0.25);
  border-color: hsla(var(--h), var(--s), var(--l), 1);
}

@media (prefers-reduced-motion: reduce) {
  .strait-circle {
    transition: none;
  }
}
</style>
