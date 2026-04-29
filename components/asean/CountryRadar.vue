<script setup lang="ts">
import type { RadarLayer } from '~/data/asean/placeholder-data'

const props = withDefaults(
  defineProps<{
    axes: string[]
    layers: RadarLayer[]
    size?: number
  }>(),
  {
    size: 320
  }
)

// Two-layer overlay: historic baseline (white alpha) + current (Meridian).
// Locked colors so the chart reads consistently across countries.
const LAYER_STYLES = [
  {
    fill: 'rgba(255, 255, 255, 0.08)',
    stroke: 'rgba(255, 255, 255, 0.55)',
    point: 'rgba(255, 255, 255, 0.85)'
  },
  {
    fill: 'hsla(218, 60%, 58%, 0.22)',
    stroke: 'hsl(218, 60%, 58%)',
    point: 'hsl(218, 60%, 58%)'
  }
]

const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)
const r = computed(() => props.size / 2 - 56)
const n = computed(() => props.axes.length)

function angle(i: number) {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n.value
}

function point(i: number, value: number) {
  const rr = r.value * value
  return [cx.value + rr * Math.cos(angle(i)), cy.value + rr * Math.sin(angle(i))]
}

function ringPoints(rv: number) {
  return props.axes
    .map((_, i) => {
      const rr = r.value * rv
      return [cx.value + rr * Math.cos(angle(i)), cy.value + rr * Math.sin(angle(i))].join(',')
    })
    .join(' ')
}

function polyPath(values: number[]) {
  return values.map((v, i) => point(i, v).join(',')).join(' ')
}

const RINGS = [0.25, 0.5, 0.75, 1]
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    class="country-radar"
    role="img"
    aria-label="Strategic posture radar, 2020 vs 2025"
  >
    <g class="country-radar__rings">
      <polygon
        v-for="(rv, i) in RINGS"
        :key="i"
        :points="ringPoints(rv)"
        fill="none"
        stroke="rgba(255, 255, 255, 0.08)"
        stroke-width="1"
      />
    </g>

    <g class="country-radar__spokes">
      <line
        v-for="(_, i) in axes"
        :key="i"
        :x1="cx"
        :y1="cy"
        :x2="point(i, 1)[0]"
        :y2="point(i, 1)[1]"
        stroke="rgba(255, 255, 255, 0.1)"
        stroke-width="1"
      />
    </g>

    <g
      v-for="(layer, li) in layers"
      :key="li"
      class="country-radar__layer"
    >
      <polygon
        :points="polyPath(layer.values)"
        :fill="LAYER_STYLES[li]?.fill"
        :stroke="LAYER_STYLES[li]?.stroke"
        stroke-width="1.5"
      />
      <circle
        v-for="(v, i) in layer.values"
        :key="i"
        :cx="point(i, v)[0]"
        :cy="point(i, v)[1]"
        r="3"
        :fill="LAYER_STYLES[li]?.point"
      />
    </g>

    <g class="country-radar__axis-labels">
      <text
        v-for="(label, i) in axes"
        :key="i"
        :x="point(i, 1.2)[0]"
        :y="point(i, 1.2)[1]"
        fill="rgba(255, 255, 255, 0.65)"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        {{ label }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.country-radar {
  display: block;
  font-family: 'Encode Sans', sans-serif;
}

.country-radar__axis-labels text {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>
