<script setup lang="ts">
import { ref } from 'vue'
import { scaleSqrt } from 'd3-scale'
import { min, max } from 'd3-array'
import straitsData from '~/data/straits/straits.json'
import type { Strait } from '~/types/strait'

const straits = straitsData.straits as Strait[]
const meta = straitsData.meta

// --- Circle scale ---
const RADIUS_MIN = 48
const RADIUS_MAX = 144

const minFlow = min(straits, (d) => d.flowScalar)
const maxFlow = max(straits, (d) => d.flowScalar)

if (minFlow == null || maxFlow == null) {
  throw new Error('straits.json must contain at least one entry with a numeric flowScalar')
}

const domain: [number, number] = [minFlow, maxFlow]

const radiusScale = scaleSqrt()
  .domain(domain)
  .range([RADIUS_MIN, RADIUS_MAX])
  .clamp(true)

// --- Color system ---
const CIRCLE_COLOR = { h: 0, s: 0, l: 100 }

function getColor(_id: string) {
  return CIRCLE_COLOR
}

// --- Interaction state ---
const hoveredStraitId = ref<string | null>(null)
const selectedStraitId = ref<string | null>(null)

function onHover(id: string | null) {
  hoveredStraitId.value = id
}

function onActivate(id: string) {
  selectedStraitId.value = selectedStraitId.value === id ? null : id
}

// --- Scale legend ---
const legendEntries = (() => {
  const lo = domain[0]
  const hi = domain[1]
  const mid = Math.round((lo + hi) / 2)
  return [lo, mid, hi].map((v) => ({
    value: v,
    r: radiusScale(v),
    label: v === hi ? 'High' : v === lo ? 'Low' : 'Med',
  }))
})()
</script>

<template>
  <div class="strait-map" :aria-label="meta.title">
    <img
      class="map-bg"
      src="/assets/map-indo-pacific-2x.webp"
      alt=""
      aria-hidden="true"
      loading="eager"
      width="2400"
      height="1350"
    />

    <StraitData
      v-for="strait in straits"
      :key="strait.id"
      :id="strait.id"
      :name="strait.name"
      :global-share-label="strait.globalShareLabel"
      :pos-x="strait.posX"
      :pos-y="strait.posY"
      :label-anchor="strait.labelAnchor"
      :radius="radiusScale(strait.flowScalar)"
      :color="getColor(strait.id)"
      :dimmed="!!hoveredStraitId && hoveredStraitId !== strait.id"
      :active="hoveredStraitId === strait.id"
      @hover="onHover"
      @activate="onActivate"
    />

    <ScaleLegend :entries="legendEntries" />
  </div>
</template>

<style scoped>
.strait-map {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0a1628;
}

.map-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
