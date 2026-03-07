<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { scaleSqrt } from 'd3-scale'
import { min, max } from 'd3-array'
import straitsData from '~/data/straits/straits.json'
import type { Strait } from '~/types/strait'

const straits = straitsData.straits as Strait[]
const meta = straitsData.meta
const LATEST_YEAR = '2025'

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
  return (h * 0.9) / (radiusScale(s.flowScalar) * 2)
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
  return radiusScale(strait.flowScalar)
}

/** Clip radius for the particle canvas (matches the selected circle radius). */
const particleClipRadius = computed(() => {
  const s = selectedStrait.value
  if (!s) return 0
  return getZoomedRadius(s)
})

const OVERLAP_PAIRS = new Set(['taiwan', 'luzon'])

function isHidden(strait: Strait) {
  if (!selectedStraitId.value) return false
  return OVERLAP_PAIRS.has(strait.id) && OVERLAP_PAIRS.has(selectedStraitId.value) && strait.id !== selectedStraitId.value
}

function onBackgroundClick(event: MouseEvent) {
  const el = event.target as Element
  if (event.target === event.currentTarget || el.classList.contains('map-bg') || el.classList.contains('map-inner')) {
    selectedStraitId.value = null
  }
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
        @hover="onHover"
        @activate="onActivate"
      />

      <StraitParticleCanvas
        v-if="selectedStraitId"
        :strait-id="selectedStraitId"
        :year="LATEST_YEAR"
        :inner-size="innerSize"
        :zoom-scale="zoomScale"
        :selected-strait="selectedStrait"
        :clip-radius="particleClipRadius"
      />
    </div>

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

@media (prefers-reduced-motion: reduce) {
  .map-bg {
    transition: none;
  }
}
</style>
