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
  sizeMetric?: 'tonnage' | 'ships' | 'value'
}>(), {
  selectedStraitId: undefined,
  sizeMetric: 'tonnage'
})

const emit = defineEmits<{
  (e: 'select', id: string | null): void
  (e: 'hover', id: string | null): void
}>()

// --- Animation timing constants (must stay in sync with CSS transition durations) ---
/** Duration of the zoom-out CSS transition on .map-bg (matches `transition: transform 0.6s`) */
const ZOOM_OUT_DURATION_MS = 600
/** Delay before showing panels after zoom-in completes */
const PANEL_SHOW_DELAY_MS = 650

// --- Size metric ---
function getMetricValue(straitId: string): number {
  if (props.sizeMetric === 'value') {
    const strait = straits.find((s) => s.id === straitId)
    return strait?.valueUSD ?? 0
  }
  const yearData = historical[LATEST_YEAR]?.[straitId]
  if (!yearData) return 0
  return props.sizeMetric === 'tonnage' ? yearData.capacityMt : yearData.vessels.total
}

// --- Container dimensions (needed by radiusScale below) ---
const containerW = ref(0)
const containerH = ref(0)

// --- Circle scale (vw-relative, based on design width 1280px) ---
const DESIGN_WIDTH = 1280

const radiusScale = computed(() => {
  const vw = containerW.value || DESIGN_WIDTH
  const rMin = Math.max(24, Math.round(vw * 48 / DESIGN_WIDTH))
  const rMax = Math.max(72, Math.round(vw * 144 / DESIGN_WIDTH))
  const values = straits.map((s) => getMetricValue(s.id))
  const lo = min(values) ?? 0
  const hi = max(values) ?? 1
  return scaleSqrt()
    .domain([lo, hi])
    .range([rMin, rMax])
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
  emit('hover', id)
}

function onActivate(id: string) {
  // While a strait is selected, other strait clicks are suppressed
  if (effectiveSelectedId.value && effectiveSelectedId.value !== id) return

  const wasSelected = effectiveSelectedId.value
  const next = wasSelected === id ? null : id

  // Set data-strait on map element and body for CSS targeting
  if (next) {
    mapRef.value?.setAttribute('data-strait', next)
    document.body.dataset.strait = next
  } else {
    mapRef.value?.removeAttribute('data-strait')
    delete document.body.dataset.strait
  }

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

  // Sync data-strait attribute
  if (newId) {
    mapRef.value?.setAttribute('data-strait', newId)
    document.body.dataset.strait = newId
  } else {
    mapRef.value?.removeAttribute('data-strait')
    delete document.body.dataset.strait
  }

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

function isHidden(strait: Strait) {
  if (!effectiveSelectedId.value) return false
  return strait.id !== effectiveSelectedId.value
}

function deselect() {
  if (!effectiveSelectedId.value) return

  // Clear data-strait immediately so CSS reacts without waiting for route
  mapRef.value?.removeAttribute('data-strait')
  delete document.body.dataset.strait

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
        :value-u-s-d="strait.valueUSD"
        :capacity-mt="historical[LATEST_YEAR]?.[strait.id]?.capacityMt ?? 0"
        :vessels="historical[LATEST_YEAR]?.[strait.id]?.vessels.total ?? 0"
        :pos-x="strait.posX"
        :pos-y="strait.posY"
        :label-anchor="strait.labelAnchor"
        :radius="getBaseRadius(strait)"
        :color="getColor(strait.id)"
        :hidden="isHidden(strait)"
        :dimmed="!!hoveredStraitId && hoveredStraitId !== strait.id"
        :active="hoveredStraitId === strait.id"
        :selected="effectiveSelectedId === strait.id"
        :any-selected="!!effectiveSelectedId"
        :size-metric="sizeMetric"
        :disabled="!!effectiveSelectedId && effectiveSelectedId !== strait.id"
        :zooming-out="zoomingOut && strait.id !== zoomOutFromId"
        :year="LATEST_YEAR"
        :tilt-x="tiltX"
        :tilt-y="tiltY"
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
        @close="deselect"
      />
    </Transition>

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

/* Invisible slot that defines the 1:1 circle area in columns 4-10 (6 cols between panels) */
.circle-slot {
  grid-column: 4 / 10;
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


/* Panels occupy fixed outer columns, sitting above the full-bleed map */
.strait-panel-left {
  grid-column: 1 / 4;
  grid-row: 1 / -1;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow-y: auto;
  padding-block: var(--space-xl);
  box-sizing: border-box;
  justify-self: end;
}

.strait-panel-right {
  grid-column: 10 / 13;
  grid-row: 1 / -1;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  justify-self: start;
  overflow-y: auto;
  padding-block: var(--space-xl);
  box-sizing: border-box;
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

@media (prefers-reduced-motion: reduce) {
  .map-bg {
    transition: none;
  }
}
</style>
