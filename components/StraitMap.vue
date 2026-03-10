<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { scaleSqrt } from 'd3-scale'
import { min, max } from 'd3-array'
import { straits, meta, historical, LATEST_YEAR, historicalByStrait } from '~/utils/straitsData'
import { flowConfigs } from '~/data/straits/flow-configs'
import { useTiltOnMouse } from '~/composables/useTiltOnMouse'
import type { Strait } from '~/types/strait'

// Preload strait background images so they're cached before click
useHead({
  link: Object.values(flowConfigs)
    .map((c) => c.backgroundImage)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    .map((href) => ({ rel: 'preload', as: 'image', href })),
})

// --- Props & Emits (dual-mode: route-driven vs local-state for embeds) ---
const props = withDefaults(defineProps<{
  selectedStraitId?: string | null
}>(), {
  selectedStraitId: undefined
})

const emit = defineEmits<{
  (e: 'select', id: string | null): void
}>()

// --- Animation timing constants (must stay in sync with CSS transition durations) ---
/** Duration of the zoom-out CSS transition on .map-bg (matches `transition: transform 0.6s`) */
const ZOOM_OUT_DURATION_MS = 600
/** Delay before showing panels after zoom-in completes */
const PANEL_SHOW_DELAY_MS = 650

// --- Size metric toggle ---
type SizeMetric = 'tonnage' | 'ships'
const sizeMetric = ref<SizeMetric>('tonnage')

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

// --- Interaction state (dual-mode: route-driven or local) ---
const hoveredStraitId = ref<string | null>(null)
const _localSelectedId = ref<string | null>(null)

// Route-controlled mode: prop is provided (not undefined)
const isRouteControlled = computed(() => props.selectedStraitId !== undefined)

// Effective selected ID: prop wins if provided
const effectiveSelectedId = computed(() =>
  isRouteControlled.value ? (props.selectedStraitId ?? null) : _localSelectedId.value
)

const zoomingOut = ref(false)
const zoomOutFromId = ref<string | null>(null)

// Detect prefers-reduced-motion for timer delays
const prefersReducedMotion = ref(false)
onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

// Initialize panelsVisible based on whether we have a deep-link selection
const panelsVisible = ref(!!props.selectedStraitId)
let zoomOutTimer: ReturnType<typeof setTimeout> | null = null
let panelTimer: ReturnType<typeof setTimeout> | null = null

function onHover(id: string | null) {
  hoveredStraitId.value = id
}

function onActivate(id: string) {
  // While a strait is selected, other strait clicks are suppressed
  if (effectiveSelectedId.value && effectiveSelectedId.value !== id) return

  const wasSelected = effectiveSelectedId.value
  const next = wasSelected === id ? null : id

  if (isRouteControlled.value) {
    // Route-driven mode: emit event, let parent handle navigation
    emit('select', next)
  } else {
    // Local-state mode (embed): handle locally with animation
    panelsVisible.value = false
    if (panelTimer) clearTimeout(panelTimer)

    if (wasSelected && !next) {
      zoomingOut.value = true
      zoomOutFromId.value = wasSelected
      if (zoomOutTimer) clearTimeout(zoomOutTimer)
      zoomOutTimer = setTimeout(() => { zoomingOut.value = false; zoomOutFromId.value = null }, prefersReducedMotion.value ? 0 : ZOOM_OUT_DURATION_MS)
    } else if (zoomOutTimer) {
      clearTimeout(zoomOutTimer)
      zoomingOut.value = false
    }

    _localSelectedId.value = next

    if (next) {
      const delay = prefersReducedMotion.value ? 0 : PANEL_SHOW_DELAY_MS
      panelTimer = setTimeout(() => { panelsVisible.value = true }, delay)
    }
  }
}

// --- Route-driven animation watcher (only in route-controlled mode) ---
watch(() => props.selectedStraitId, (newId, oldId) => {
  if (!isRouteControlled.value) return

  // Clear ALL pending timers on ANY param change (prevents race conditions on rapid nav)
  if (zoomOutTimer) { clearTimeout(zoomOutTimer); zoomOutTimer = null }
  if (panelTimer) { clearTimeout(panelTimer); panelTimer = null }
  panelsVisible.value = false

  const zoomOutDelay = prefersReducedMotion.value ? 0 : ZOOM_OUT_DURATION_MS
  const panelDelay = prefersReducedMotion.value ? 0 : PANEL_SHOW_DELAY_MS

  if (oldId && !newId) {
    // Zoom out
    zoomingOut.value = true
    zoomOutFromId.value = oldId
    zoomOutTimer = setTimeout(() => {
      zoomingOut.value = false
      zoomOutFromId.value = null
    }, zoomOutDelay)
  } else if (newId && !oldId) {
    // Zoom in
    zoomingOut.value = false
    zoomOutFromId.value = null
    panelTimer = setTimeout(() => { panelsVisible.value = true }, panelDelay)
  } else if (newId && oldId && newId !== oldId) {
    // Direct strait-to-strait transition (defensive)
    zoomingOut.value = false
    zoomOutFromId.value = null
    panelTimer = setTimeout(() => { panelsVisible.value = true }, panelDelay)
  }
})

// --- Zoom ---
const mapRef = ref<HTMLElement | null>(null)
const circleSlotRef = ref<HTMLElement | null>(null)
const circleSlotSize = ref(0)
const circleSlotCenter = ref({ x: 0, y: 0 }) // center relative to map-inner, as %
const { rotateX: tiltX, rotateY: tiltY } = useTiltOnMouse(mapRef)

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
    if (circleSlotRef.value) {
      const slotRect = circleSlotRef.value.getBoundingClientRect()
      circleSlotSize.value = slotRect.width
      // Compute slot center as % of map-inner (the cover-fit container)
      const mapRect = mapRef.value!.getBoundingClientRect()
      const { w, h } = innerSize.value
      const innerLeft = (mapRect.width - w) / 2
      const innerTop = (mapRect.height - h) / 2
      circleSlotCenter.value = {
        x: ((slotRect.left - mapRect.left - innerLeft) + slotRect.width / 2) / w * 100,
        y: ((slotRect.top - mapRect.top - innerTop) + slotRect.height / 2) / h * 100,
      }
    }
  }
  update()
  resizeObserver = new ResizeObserver(update)
  resizeObserver.observe(mapRef.value)

  // Deep link: if a strait is already selected on mount, show panels immediately
  if (effectiveSelectedId.value) {
    panelsVisible.value = true
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (zoomOutTimer) clearTimeout(zoomOutTimer)
  if (panelTimer) clearTimeout(panelTimer)
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
  straits.find((s) => s.id === effectiveSelectedId.value) ?? null
)

const zoomScale = computed(() => {
  const s = selectedStrait.value
  if (!s) return 1
  // Target diameter comes from the CSS grid slot (columns 4-10, aspect-ratio 1:1)
  const targetDiameter = circleSlotSize.value || 1
  return targetDiameter / (radiusScale.value(getMetricValue(s.id)) * 2)
})

const mapBgTransform = computed(() => {
  const s = selectedStrait.value
  if (!s) return undefined
  const { w, h } = innerSize.value
  const S = zoomScale.value
  const cx = (circleSlotCenter.value.x / 100) * w
  const cy = (circleSlotCenter.value.y / 100) * h
  const tx = cx - (s.posX / 100) * w * S
  const ty = cy - (s.posY / 100) * h * S
  return `translate(${tx}px, ${ty}px) scale(${S})`
})

function getZoomedPosX(strait: Strait) {
  const s = selectedStrait.value
  if (!s) return strait.posX
  return (strait.posX - s.posX) * zoomScale.value + circleSlotCenter.value.x
}

function getZoomedPosY(strait: Strait) {
  const s = selectedStrait.value
  if (!s) return strait.posY
  return (strait.posY - s.posY) * zoomScale.value + circleSlotCenter.value.y
}

function getBaseRadius(strait: Strait) {
  return radiusScale.value(getMetricValue(strait.id))
}

function straitZoomStyle(strait: Strait) {
  const dx = ((getZoomedPosX(strait) - strait.posX) / 100) * innerSize.value.w
  const dy = ((getZoomedPosY(strait) - strait.posY) / 100) * innerSize.value.h
  const style: Record<string, string | number> = { translate: `${dx}px ${dy}px` }

  if (strait.id === effectiveSelectedId.value) {
    const baseR = getBaseRadius(strait)
    const targetDiameter = circleSlotSize.value || 1
    const s = targetDiameter / (baseR * 2)
    style.scale = s
    style['--zoom-scale'] = s
  }

  return style
}

const OVERLAP_PAIRS = new Set(['taiwan', 'luzon'])

function isHidden(strait: Strait) {
  if (!effectiveSelectedId.value) return false
  return OVERLAP_PAIRS.has(strait.id) && OVERLAP_PAIRS.has(effectiveSelectedId.value) && strait.id !== effectiveSelectedId.value
}

function deselect() {
  if (!effectiveSelectedId.value) return

  if (isRouteControlled.value) {
    // Route-driven mode: emit event, let parent handle navigation
    emit('select', null)
  } else {
    // Local-state mode (embed): handle locally
    panelsVisible.value = false
    if (panelTimer) clearTimeout(panelTimer)
    zoomingOut.value = true
    zoomOutFromId.value = effectiveSelectedId.value
    if (zoomOutTimer) clearTimeout(zoomOutTimer)
    const delay = prefersReducedMotion.value ? 0 : ZOOM_OUT_DURATION_MS
    zoomOutTimer = setTimeout(() => { zoomingOut.value = false; zoomOutFromId.value = null }, delay)
    _localSelectedId.value = null
  }
}

function onBackgroundClick(event: MouseEvent) {
  const el = event.target as Element
  if (event.target === event.currentTarget || el.hasAttribute('data-map-bg')) {
    deselect()
  }
}

// --- Panel fallback positioning (for browsers without CSS Anchor Positioning) ---
const supportsAnchor = ref(false)
onMounted(() => {
  supportsAnchor.value = CSS.supports('anchor-name', '--x')
})

const panelFallbackLeft = computed(() => {
  if (supportsAnchor.value || !selectedStrait.value) return undefined
  const s = selectedStrait.value
  const x = getZoomedPosX(s)
  const y = getZoomedPosY(s)
  const visualR = (circleSlotSize.value || 0) / 2
  const rPct = (visualR / innerSize.value.w) * 100
  return {
    top: `${y}%`,
    right: `${100 - x + rPct}%`,
    translate: '-2rem -50%',
  }
})

const panelFallbackRight = computed(() => {
  if (supportsAnchor.value || !selectedStrait.value) return undefined
  const s = selectedStrait.value
  const x = getZoomedPosX(s)
  const y = getZoomedPosY(s)
  const visualR = (circleSlotSize.value || 0) / 2
  const rPct = (visualR / innerSize.value.w) * 100
  return {
    top: `${y}%`,
    left: `${x + rPct}%`,
    translate: '2rem -50%',
  }
})

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
    <!-- Invisible grid slot: defines 1:1 circle area at columns 4-10 -->
    <div ref="circleSlotRef" class="circle-slot" />

    <div class="map-inner" data-map-bg :style="mapInnerStyle">
      <img
        class="map-bg"
        data-map-bg
        :style="{ transform: mapBgTransform }"
        src="/assets/map-indo-pacific-2x.webp"
        alt=""
        aria-hidden="true"
        loading="eager"
        width="2400"
        height="1350"
      />
      <div
        class="map-dim-overlay"
        :class="{ active: !!effectiveSelectedId }"
        :style="{ transform: mapBgTransform }"
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
        :radius="getBaseRadius(strait)"
        :color="getColor(strait.id)"
        :hidden="isHidden(strait)"
        :dimmed="!!hoveredStraitId && hoveredStraitId !== strait.id"
        :active="hoveredStraitId === strait.id"
        :selected="effectiveSelectedId === strait.id"
        :disabled="!!effectiveSelectedId && effectiveSelectedId !== strait.id"
        :zooming-out="zoomingOut && strait.id !== zoomOutFromId"
        :year="LATEST_YEAR"
        :style="straitZoomStyle(strait)"
        @hover="onHover"
        @activate="onActivate"
      />
    </div>

    <Transition name="panel-fade">
      <StraitQuantPanel
        v-if="panelsVisible && selectedStrait"
        :key="'quant-' + selectedStrait.id"
        :strait="selectedStrait"
        :historical="historicalByStrait(selectedStrait.id)"
        :year="LATEST_YEAR"
        :tilt-x="tiltX"
        :tilt-y="tiltY"
        class="strait-panel-left"
        :style="panelFallbackLeft"
      />
    </Transition>

    <Transition name="panel-fade">
      <StraitQualPanel
        v-if="panelsVisible && selectedStrait"
        :key="'qual-' + selectedStrait.id"
        :strait="selectedStrait"
        :tilt-x="tiltX"
        :tilt-y="tiltY"
        class="strait-panel-right"
        :style="panelFallbackRight"
        @close="deselect"
      />
    </Transition>

    <ScaleLegend :entries="legendEntries" :title="metricLabel" :class="{ 'controls-hidden': !!effectiveSelectedId }" />

    <div class="metric-toggle" :class="{ 'controls-hidden': !!effectiveSelectedId }">
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

  /* Inherit parent grid columns so children can use column placement */
  display: grid;
  grid-template-columns: subgrid;
  grid-template-rows: subgrid;
}

/* Invisible slot that defines the 1:1 circle area in columns 4-9 */
.circle-slot {
  grid-column: 4 / 9;
  grid-row: 1 / -1;
  place-self: center;
  aspect-ratio: 1;
  width: 100%;
  max-height: 100%;
  pointer-events: none;
}

.map-inner {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  position: relative;
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

.map-dim-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0);
  transform-origin: 0 0;
  will-change: transform;
  transition: background 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.map-dim-overlay.active {
  background: rgba(0, 0, 0, 0.5);
}


.strait-panel-left {
  position: absolute;
  z-index: 2;
}

.strait-panel-right {
  position: absolute;
  z-index: 2;
}

/* CSS Anchor Positioning (Chromium 125+). Fallback for Firefox/Safari uses
   JS-computed inline styles via panelFallbackLeft / panelFallbackRight. */
@supports (anchor-name: --x) {
  .strait-panel-left {
    position-anchor: --selected-strait;
    top: anchor(center);
    right: anchor(left);
    translate: -2rem -50%;
  }

  .strait-panel-right {
    position-anchor: --selected-strait;
    top: anchor(center);
    left: anchor(right);
    translate: 2rem -50%;
  }
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.3s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.controls-hidden {
  opacity: 0;
  pointer-events: none;
}

.metric-toggle {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  gap: 0;
  z-index: 1;
  transition: opacity 0.3s ease;
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
