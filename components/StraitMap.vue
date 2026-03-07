<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { scaleSqrt } from 'd3-scale'
import { min, max } from 'd3-array'
import straitsData from '~/data/straits/straits.json'
import type { Strait } from '~/types/strait'

const straits = straitsData.straits as Strait[]
const meta = straitsData.meta
const historical = straitsData.historical as Record<string, Record<string, { capacityMt: number; vessels: { total: number; container: number; dryBulk: number; tanker: number }; capacityByType: { container: number; dryBulk: number; tanker: number } }>>

// --- Size metric toggle ---
type SizeMetric = 'tonnage' | 'ships'
const sizeMetric = ref<SizeMetric>('tonnage')

const LATEST_YEAR = Object.keys(historical).sort().pop()!

function historicalByStrait(straitId: string) {
  const result: Record<string, (typeof historical)[string][string]> = {}
  for (const [year, yearData] of Object.entries(historical)) {
    if (yearData[straitId]) result[year] = yearData[straitId]
  }
  return result
}

function getMetricValue(straitId: string): number {
  const yearData = historical[LATEST_YEAR]?.[straitId]
  if (!yearData) return 0
  return sizeMetric.value === 'tonnage' ? yearData.capacityMt : yearData.vessels.total
}

// --- Circle scale ---
const RADIUS_MIN = 48
const RADIUS_MAX = 144

const radiusScale = computed(() => {
  const values = straits.map((s) => getMetricValue(s.id))
  const lo = min(values) ?? 0
  const hi = max(values) ?? 1
  return scaleSqrt()
    .domain([lo, hi])
    .range([RADIUS_MIN, RADIUS_MAX])
    .clamp(true)
})

// --- Color system ---
const CIRCLE_COLOR = { h: 0, s: 0, l: 100 }

function getColor(_id: string) {
  return CIRCLE_COLOR
}

// --- Interaction state ---
const hoveredStraitId = ref<string | null>(null)
const selectedStraitId = ref<string | null>(null)
const zoomingOut = ref(false)
const zoomOutFromId = ref<string | null>(null)
let zoomOutTimer: ReturnType<typeof setTimeout> | null = null

function onHover(id: string | null) {
  hoveredStraitId.value = id
}

function onActivate(id: string) {
  const wasSelected = selectedStraitId.value
  const next = wasSelected === id ? null : id

  if (wasSelected && !next) {
    // Zooming out — keep circles hidden until zoom animation finishes (0.6s)
    zoomingOut.value = true
    zoomOutFromId.value = wasSelected
    if (zoomOutTimer) clearTimeout(zoomOutTimer)
    zoomOutTimer = setTimeout(() => { zoomingOut.value = false; zoomOutFromId.value = null }, 600)
  } else if (zoomOutTimer) {
    // Zooming into a new strait, cancel any pending zoom-out
    clearTimeout(zoomOutTimer)
    zoomingOut.value = false
  }

  selectedStraitId.value = next
}

// --- Zoom ---
const mapRef = ref<HTMLElement | null>(null)

// --- Cover-fit inner wrapper (matches object-fit:cover for 2400x1350) ---
const MAP_RATIO = 2400 / 1350 // ~1.778 (16:9)
const containerW = ref(0)
const containerH = ref(0)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!mapRef.value) return
  const update = () => {
    containerW.value = mapRef.value!.offsetWidth
    containerH.value = mapRef.value!.offsetHeight
  }
  update()
  resizeObserver = new ResizeObserver(update)
  resizeObserver.observe(mapRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (zoomOutTimer) clearTimeout(zoomOutTimer)
})

const innerSize = computed(() => {
  const cw = containerW.value || 1
  const ch = containerH.value || 1
  const containerRatio = cw / ch
  let w: number, h: number
  if (containerRatio > MAP_RATIO) {
    w = cw
    h = cw / MAP_RATIO
  } else {
    h = ch
    w = ch * MAP_RATIO
  }
  return { w, h }
})

const mapInnerStyle = computed(() => {
  const { w, h } = innerSize.value
  const cw = containerW.value || 1
  const ch = containerH.value || 1
  return {
    width: `${w}px`,
    height: `${h}px`,
    left: `${(cw - w) / 2}px`,
    top: `${(ch - h) / 2}px`,
  }
})

const selectedStrait = computed(() =>
  straits.find((s) => s.id === selectedStraitId.value) ?? null
)

const zoomScale = computed(() => {
  const s = selectedStrait.value
  if (!s) return 1
  const h = innerSize.value.h
  return (h * 0.9) / (radiusScale.value(getMetricValue(s.id)) * 2)
})

const mapBgTransform = computed(() => {
  const s = selectedStrait.value
  if (!s) return undefined
  const { w, h } = innerSize.value
  const S = zoomScale.value
  const tx = w / 2 - (s.posX / 100) * w * S
  const ty = h / 2 - (s.posY / 100) * h * S
  return `translate(${tx}px, ${ty}px) scale(${S})`
})

function getZoomedPosX(strait: Strait) {
  const s = selectedStrait.value
  if (!s) return strait.posX
  return (strait.posX - s.posX) * zoomScale.value + 50
}

function getZoomedPosY(strait: Strait) {
  const s = selectedStrait.value
  if (!s) return strait.posY
  return (strait.posY - s.posY) * zoomScale.value + 50
}

function getZoomedRadius(strait: Strait) {
  if (strait.id === selectedStraitId.value) {
    return innerSize.value.h * 0.45
  }
  return radiusScale.value(getMetricValue(strait.id))
}

const OVERLAP_PAIRS = new Set(['taiwan', 'luzon'])

function isHidden(strait: Strait) {
  if (!selectedStraitId.value) return false
  return OVERLAP_PAIRS.has(strait.id) && OVERLAP_PAIRS.has(selectedStraitId.value) && strait.id !== selectedStraitId.value
}

function deselect() {
  if (!selectedStraitId.value) return
  zoomingOut.value = true
  zoomOutFromId.value = selectedStraitId.value
  if (zoomOutTimer) clearTimeout(zoomOutTimer)
  zoomOutTimer = setTimeout(() => { zoomingOut.value = false; zoomOutFromId.value = null }, 600)
  selectedStraitId.value = null
}

function onBackgroundClick(event: MouseEvent) {
  const el = event.target as Element
  if (event.target === event.currentTarget || el.classList.contains('map-bg') || el.classList.contains('map-inner')) {
    deselect()
  }
}

// --- Scale legend ---
const metricLabel = computed(() =>
  sizeMetric.value === 'tonnage' ? 'Cargo (Mt)' : 'Vessels'
)

const legendEntries = computed(() => {
  const scale = radiusScale.value
  const [lo, hi] = scale.domain() as [number, number]
  const mid = Math.round((lo + hi) / 2)
  return [lo, mid, hi].map((v) => ({
    value: v,
    r: scale(v),
    label: v === hi ? 'High' : v === lo ? 'Low' : 'Med',
  }))
})
</script>

<template>
  <div ref="mapRef" class="strait-map" :aria-label="meta.title" @click="onBackgroundClick">
    <div class="map-inner" :style="mapInnerStyle">
      <img
        class="map-bg"
        :style="{ transform: mapBgTransform }"
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
        :pos-x="getZoomedPosX(strait)"
        :pos-y="getZoomedPosY(strait)"
        :label-anchor="strait.labelAnchor"
        :radius="getZoomedRadius(strait)"
        :color="getColor(strait.id)"
        :hidden="isHidden(strait)"
        :dimmed="!!hoveredStraitId && hoveredStraitId !== strait.id"
        :active="hoveredStraitId === strait.id"
        :selected="selectedStraitId === strait.id"
        :zooming-out="zoomingOut && strait.id !== zoomOutFromId"
        @hover="onHover"
        @activate="onActivate"
      />
    </div>

    <Transition name="panel-fade">
      <StraitDetailPanel
        v-if="selectedStrait"
        :key="selectedStrait.id"
        :strait="selectedStrait"
        :historical="historicalByStrait(selectedStrait.id)"
        :year="LATEST_YEAR"
        class="strait-detail-position"
        @close="deselect"
      />
    </Transition>

    <ScaleLegend :entries="legendEntries" :title="metricLabel" />

    <div class="metric-toggle">
      <button
        :class="{ active: sizeMetric === 'tonnage' }"
        @click="sizeMetric = 'tonnage'"
      >
        Metric Tonnage
      </button>
      <button
        :class="{ active: sizeMetric === 'ships' }"
        @click="sizeMetric = 'ships'"
      >
        N. of Ships
      </button>
    </div>
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

.map-inner {
  position: absolute;
}

.map-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  transform-origin: 0 0;
  will-change: transform;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}


.strait-detail-position {
  position: absolute;
  position-anchor: --selected-strait;
  top: anchor(center);
  left: anchor(right);
  translate: 80px -50%;
  z-index: 2;
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.3s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.metric-toggle {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  gap: 0;
  z-index: 1;
}

.metric-toggle button {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-family: 'Encode Sans', sans-serif;
  font-size: 11px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.metric-toggle button:first-child {
  border-radius: 4px 0 0 4px;
}

.metric-toggle button:last-child {
  border-radius: 0 4px 4px 0;
  border-left: none;
}

.metric-toggle button.active {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

@media (prefers-reduced-motion: reduce) {
  .map-bg {
    transition: none;
  }
}
</style>
