<script setup lang="ts">
import { computed } from 'vue'
import { scaleLinear, scalePoint } from 'd3-scale'
import { line } from 'd3-shape'
import { extent } from 'd3-array'

const props = withDefaults(defineProps<{
  historical: Record<string, { capacityMt: number; vessels: { total: number; container: number; dryBulk: number; tanker: number }; capacityByType: { container: number; dryBulk: number; tanker: number } }>
  width?: number
  height?: number
}>(), {
  width: 280,
  height: 140,
})

/** Clamp to sensible minimums so PAD calculations never produce NaN or negative ranges */
const W = computed(() => Math.max(props.width, 40))
const H = computed(() => Math.max(props.height, 40))
const PAD = computed(() => ({
  top: Math.round(H.value * 0.11),
  right: Math.round(W.value * 0.14),
  bottom: Math.round(H.value * 0.17),
  left: Math.round(W.value * 0.13),
}))

const years = computed(() => Object.keys(props.historical).sort())

const cargoData = computed(() => years.value.map(y => props.historical[y].capacityMt))
const vesselData = computed(() => years.value.map(y => props.historical[y].vessels.total))

const xScale = computed(() =>
  scalePoint<string>()
    .domain(years.value)
    .range([PAD.value.left, W.value - PAD.value.right])
)

const yScaleCargo = computed(() => {
  const [lo, hi] = extent(cargoData.value) as [number, number]
  const pad = (hi - lo) * 0.15 || 100
  return scaleLinear()
    .domain([Math.max(0, lo - pad), hi + pad])
    .range([H.value - PAD.value.bottom, PAD.value.top])
})

const yScaleVessels = computed(() => {
  const [lo, hi] = extent(vesselData.value) as [number, number]
  const pad = (hi - lo) * 0.15 || 1000
  return scaleLinear()
    .domain([Math.max(0, lo - pad), hi + pad])
    .range([H.value - PAD.value.bottom, PAD.value.top])
})

const cargoLine = computed(() => {
  const gen = line<number>()
    .x((_, i) => xScale.value(years.value[i])!)
    .y(d => yScaleCargo.value(d))
  return gen(cargoData.value) ?? ''
})

const vesselLine = computed(() => {
  const gen = line<number>()
    .x((_, i) => xScale.value(years.value[i])!)
    .y(d => yScaleVessels.value(d))
  return gen(vesselData.value) ?? ''
})

const cargoTicks = computed(() => {
  const scale = yScaleCargo.value
  const [lo, hi] = scale.domain()
  const mid = Math.round((lo + hi) / 2)
  return [lo, mid, hi].map(v => ({ v, y: scale(v) }))
})

const vesselTicks = computed(() => {
  const scale = yScaleVessels.value
  const [lo, hi] = scale.domain()
  const mid = Math.round((lo + hi) / 2)
  return [lo, mid, hi].map(v => ({ v, y: scale(v) }))
})

function fmtCargo(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
}

function fmtVessels(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))
}

const cargoColor = 'rgba(100, 180, 255, 0.9)'
const vesselColor = 'rgba(255, 180, 100, 0.9)'
</script>

<template>
  <div class="history-chart">
    <h3 class="history-chart__title">Historical Trends</h3>
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="xMidYMid meet" class="history-chart__svg">
      <!-- Grid lines -->
      <line
        v-for="tick in cargoTicks"
        :key="'grid-' + tick.v"
        :x1="PAD.left"
        :x2="W - PAD.right"
        :y1="tick.y"
        :y2="tick.y"
        class="history-chart__grid"
      />

      <!-- Cargo line -->
      <path :d="cargoLine" fill="none" :stroke="cargoColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <!-- Vessel line -->
      <path :d="vesselLine" fill="none" :stroke="vesselColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="4 3" />
      <!-- Left Y axis labels (Cargo) -->
      <text
        v-for="tick in cargoTicks"
        :key="'yl-' + tick.v"
        :x="PAD.left - 3"
        :y="tick.y"
        text-anchor="end"
        dominant-baseline="middle"
        class="history-chart__tick"
        :fill="cargoColor"
      >{{ fmtCargo(tick.v) }}</text>

      <!-- Right Y axis labels (Vessels) -->
      <text
        v-for="tick in vesselTicks"
        :key="'yr-' + tick.v"
        :x="W - PAD.right + 4"
        :y="tick.y"
        text-anchor="start"
        dominant-baseline="middle"
        class="history-chart__tick"
        :fill="vesselColor"
      >{{ fmtVessels(tick.v) }}</text>

      <!-- X axis labels -->
      <text
        v-for="year in years"
        :key="'x-' + year"
        :x="xScale(year)!"
        :y="H - PAD.bottom + 14"
        text-anchor="middle"
        class="history-chart__tick"
        fill="rgba(255,255,255,0.4)"
      >{{ year.slice(2) }}</text>
    </svg>

    <div class="history-chart__legend">
      <span class="history-chart__legend-item">
        <span class="history-chart__legend-line" :style="{ background: cargoColor }" />
        Cargo (Mt)
      </span>
      <span class="history-chart__legend-item">
        <span class="history-chart__legend-line history-chart__legend-line--dashed" :style="{ background: vesselColor }" />
        Vessels
      </span>
    </div>
  </div>
</template>

<style scoped>
.history-chart {
  margin-bottom: 16px;
}

.history-chart__title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 8px;
}

.history-chart__svg {
  width: 100%;
  height: auto;
  display: block;
}

.history-chart__grid {
  stroke: rgba(255, 255, 255, 0.06);
  stroke-width: 1;
}

.history-chart__tick {
  font-family: 'Encode Sans', sans-serif;
  font-size: 8px;
  font-variant-numeric: tabular-nums;
}

.history-chart__legend {
  display: flex;
  gap: 14px;
  margin-top: 6px;
}

.history-chart__legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.history-chart__legend-line {
  width: 14px;
  height: 2px;
  border-radius: 1px;
  flex-shrink: 0;
}

.history-chart__legend-line--dashed {
  background: none !important;
  border-top: 2px dashed rgba(255, 180, 100, 0.9);
  height: 0;
}
</style>
