<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { scaleSqrt } from 'd3-scale'
import { min, max } from 'd3-array'
import straitsData from '~/data/straits/straits.json'
import type { Strait, LabelAnchor } from '~/types/strait'

const straits = straitsData.straits as Strait[]
const meta = straitsData.meta

// --- Unique IDs for SVG accessibility (safe for multi-instance rendering) ---
const uid = useId()
const titleId = `map-title-${uid}`
const descId = `map-desc-${uid}`

// --- SVG viewBox dimensions (matches satellite image aspect ratio) ---
const VB_WIDTH = 1200
const VB_HEIGHT = 675

// --- Circle scale ---
// Using scaleSqrt so that circle *area* is proportional to the data value.
// Domain is [min flowScalar, max flowScalar] rather than [0, max], which
// provides better visual differentiation at the cost of strict area
// proportionality. This trade-off is acceptable for a qualitative overview.
const RADIUS_MIN = 24 // viewBox units — smallest circle (Hormuz, flowScalar=25)
const RADIUS_MAX = 72 // viewBox units — largest circle  (Malacca, flowScalar=100)

const minFlow = min(straits, (d) => d.flowScalar)
const maxFlow = max(straits, (d) => d.flowScalar)

if (minFlow == null || maxFlow == null) {
  throw new Error('straits.json must contain at least one entry with a numeric flowScalar')
}

const domain: [number, number] = [minFlow, maxFlow]

const radiusScale = scaleSqrt()
  .domain(domain)
  .range([RADIUS_MIN, RADIUS_MAX])
  .clamp(true) // guard against future data values outside the domain

// --- Color system ---
// Per-strait accent colors using the shared HSL 60% saturation palette
// from the renewables infographic. Kept in code (not data) because
// colors are a presentation concern.
const DEFAULT_COLOR = { h: 0, s: 0, l: 70 } // neutral grey fallback

const STRAIT_COLORS: Record<string, { h: number; s: number; l: number }> = {
  'malacca':       { h: 186, s: 60, l: 50 },
  'taiwan':        { h: 218, s: 60, l: 58 },
  'bab-el-mandeb': { h: 34,  s: 60, l: 50 },
  'luzon':         { h: 291, s: 60, l: 49 },
  'lombok':        { h: 151, s: 60, l: 45 },
  'hormuz':        { h: 340, s: 60, l: 63 },
}

function getStraitColor(id: string) {
  return STRAIT_COLORS[id] ?? DEFAULT_COLOR
}

function straitFill(id: string): string {
  const c = getStraitColor(id)
  return `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.12)`
}

function straitStroke(id: string): string {
  const c = getStraitColor(id)
  return `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.7)`
}

function straitGlowFill(id: string): string {
  const c = getStraitColor(id)
  return `hsla(${c.h}, ${c.s}%, 70%, 0.08)`
}

function straitActiveFill(id: string): string {
  const c = getStraitColor(id)
  return `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.25)`
}

function straitGlowColor(id: string): string {
  const c = getStraitColor(id)
  return `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.25)`
}

// --- Hover state ---
const hoveredStraitId = ref<string | null>(null)

function onStraitHover(id: string | null) {
  hoveredStraitId.value = id
}

function onStraitFocusOut(event: FocusEvent) {
  // Only clear if focus is leaving the group entirely (prevents flicker
  // when focus moves between child elements within the same <g>)
  const currentTarget = event.currentTarget as Element
  if (!currentTarget.contains(event.relatedTarget as Node)) {
    hoveredStraitId.value = null
  }
}

// --- Computed style for data circles ---
// Handles both default and active (hovered) states via inline style,
// avoiding CSS specificity issues since base colors are per-strait inline.
function circleStyle(id: string) {
  const isActive = hoveredStraitId.value === id
  return {
    fill: isActive ? straitActiveFill(id) : straitFill(id),
    stroke: isActive ? straitStroke(id).replace('0.7)', '1)') : straitStroke(id),
    strokeWidth: 1.5,
  }
}

// --- Label display ---
// Truncates globalShareLabel for left-anchored straits near the left
// edge of the viewBox to prevent clipping outside bounds.
function displayLabel(strait: { name: string; globalShareLabel: string; labelAnchor: LabelAnchor; posX: number }): string {
  if (strait.labelAnchor === 'left' && strait.posX < 30) {
    // Use a shorter form to avoid clipping
    const shortShare = strait.globalShareLabel
      .replace('of global ', '')
      .replace('by volume', '')
      .trim()
    return `${strait.name} | ${shortShare}`
  }
  return `${strait.name} | ${strait.globalShareLabel}`
}

// --- Map each strait to viewBox coordinates + computed radius ---
const mappedStraits = computed(() =>
  straits.map((s) => {
    const r = radiusScale(s.flowScalar)
    const cx = (s.posX / 100) * VB_WIDTH
    const cy = (s.posY / 100) * VB_HEIGHT

    // Label offset based on labelAnchor
    let labelX = cx
    let labelY = cy
    let textAnchor = 'middle' as 'middle' | 'start' | 'end'

    const anchor: LabelAnchor = s.labelAnchor
    switch (anchor) {
      case 'below':
        labelY = cy + r + 16
        textAnchor = 'middle'
        break
      case 'above':
        labelY = cy - r - 8
        textAnchor = 'middle'
        break
      case 'right':
        labelX = cx + r + 8
        textAnchor = 'start'
        break
      case 'left':
        labelX = cx - r - 8
        textAnchor = 'end'
        break
      default: {
        // Exhaustive check — if a new anchor value is added to the type,
        // TypeScript will error here until this switch is updated.
        const _exhaustive: never = anchor
        console.warn(`Unknown labelAnchor: "${_exhaustive}", defaulting to center`)
      }
    }

    return {
      ...s,
      cx,
      cy,
      r,
      labelX,
      labelY,
      textAnchor,
    }
  })
)

// --- Scale legend ---
const legendEntries = computed(() => {
  const values = [25, 50, 100]
  return values.map((v) => ({
    value: v,
    r: radiusScale(v),
  }))
})

// Legend position in viewBox coordinates
const LEGEND_X = 1080
const LEGEND_BASE_Y = 610

// --- Click handler ---
// Emits strait id for future Lens State wiring. Currently no page-level
// consumer exists; this is intentional scaffolding so the event chain is
// ready when the Lens feature is implemented (see BF-39 / BF-76 plans).
const emit = defineEmits<{ (e: 'select-strait', id: string): void }>()

function onStraitActivate(id: string) {
  emit('select-strait', id)
}
</script>

<template>
  <div class="strait-map-container" :aria-label="meta.title">
    <!-- Dark fallback background visible when the satellite image is missing or loading -->
    <img
      class="map-bg"
      src="/assets/map-indo-pacific-2x.webp"
      alt=""
      aria-hidden="true"
      loading="eager"
      width="2400"
      height="1350"
    />

    <!--
      preserveAspectRatio="xMidYMid slice" is intentional: the background
      <img> uses object-fit:cover (CSS equivalent of "slice"), so the SVG
      must also use "slice" to keep circles aligned with their geographic
      positions on the satellite image at all aspect ratios.
    -->
    <svg
      class="circle-overlay"
      :viewBox="`0 0 ${VB_WIDTH} ${VB_HEIGHT}`"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      :aria-labelledby="`${titleId} ${descId}`"
      aria-roledescription="interactive map"
    >
      <title :id="titleId">{{ meta.title }}</title>
      <desc :id="descId">
        Interactive map showing six major maritime straits sized by trade
        volume. Malacca is the largest, Hormuz the smallest.
      </desc>

      <!-- SVG filter definitions -->
      <defs>
        <!-- Shared glow blur filter (single filter for all straits) -->
        <filter id="glow-shared" color-interpolation-filters="sRGB"
                x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        </filter>

        <!-- Label shadow using SVG1.1 primitives for Safari compatibility -->
        <filter id="label-shadow" color-interpolation-filters="sRGB"
                x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
          <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
          <feFlood flood-color="#000" flood-opacity="0.6" result="color" />
          <feComposite in="color" in2="offsetBlur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        v-for="strait in mappedStraits"
        :key="strait.id"
        class="strait-circle-group"
        :class="{
          'strait-dimmed': hoveredStraitId && hoveredStraitId !== strait.id,
          'strait-active': hoveredStraitId === strait.id,
        }"
        role="button"
        :tabindex="0"
        :aria-label="`${strait.name}: ${strait.globalShareLabel}`"
        @click="onStraitActivate(strait.id)"
        @keydown.enter="onStraitActivate(strait.id)"
        @keydown.space.prevent="onStraitActivate(strait.id)"
        @mouseenter="onStraitHover(strait.id)"
        @mouseleave="onStraitHover(null)"
        @focusin="onStraitHover(strait.id)"
        @focusout="onStraitFocusOut($event)"
      >
        <!-- Glow background circle — blurred accent behind data circle -->
        <circle
          :cx="strait.cx"
          :cy="strait.cy"
          :r="strait.r"
          :fill="straitGlowColor(strait.id)"
          filter="url(#glow-shared)"
          class="strait-glow"
        />

        <!-- Data circle — per-strait color via inline style -->
        <circle
          :cx="strait.cx"
          :cy="strait.cy"
          :r="strait.r"
          :style="circleStyle(strait.id)"
          class="strait-circle"
        />

        <!-- Inner glow circle — subtle depth effect -->
        <circle
          :cx="strait.cx"
          :cy="strait.cy"
          :r="Math.max(strait.r - 3, 0)"
          :fill="straitGlowFill(strait.id)"
          class="strait-inner-glow"
        />

        <!-- Focus ring — SVG <g> does not support CSS outline -->
        <circle
          :cx="strait.cx"
          :cy="strait.cy"
          :r="strait.r + 4"
          class="strait-focus-ring"
        />

        <!-- Label with SVG filter shadow -->
        <text
          :x="strait.labelX"
          :y="strait.labelY"
          :text-anchor="strait.textAnchor"
          filter="url(#label-shadow)"
          class="strait-label"
        >
          {{ displayLabel(strait) }}
        </text>
      </g>

      <!-- Scale legend -->
      <g class="scale-legend"
         role="img"
         aria-label="Scale legend: circle size represents relative trade volume">
        <!-- Legend circles — bottom-aligned at LEGEND_BASE_Y -->
        <circle
          v-for="entry in legendEntries"
          :key="'legend-' + entry.value"
          :cx="LEGEND_X"
          :cy="LEGEND_BASE_Y - entry.r"
          :r="entry.r"
          class="legend-circle"
        />

        <!-- Connecting lines and labels -->
        <template v-for="entry in legendEntries" :key="'legend-line-' + entry.value">
          <line
            :x1="LEGEND_X"
            :y1="LEGEND_BASE_Y - entry.r * 2"
            :x2="LEGEND_X + entry.r + 12"
            :y2="LEGEND_BASE_Y - entry.r * 2"
            class="legend-line"
            aria-hidden="true"
          />
          <text
            :x="LEGEND_X + entry.r + 16"
            :y="LEGEND_BASE_Y - entry.r * 2 + 4"
            class="legend-label"
          >
            {{ entry.value === 100 ? 'High' : entry.value === 50 ? 'Med' : 'Low' }}
          </text>
        </template>

        <!-- Legend title -->
        <text
          :x="LEGEND_X"
          :y="LEGEND_BASE_Y + 18"
          text-anchor="middle"
          class="legend-title"
        >
          Trade Volume
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.strait-map-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0a1628; /* fallback when image is missing */
}

.map-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.circle-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* let clicks pass through, except on circles */
}

.strait-circle-group {
  pointer-events: all;
  cursor: pointer;
  transition: opacity 0.15s ease; /* fast recovery from dimmed state */
}

/* Dimmed siblings when one circle is hovered/focused */
.strait-dimmed {
  opacity: 0.3;
  transition: opacity 0.3s ease; /* slower dim for smoother feel */
}

/* Data circle — base styles; fill/stroke/strokeWidth set via inline :style */
.strait-circle {
  transition: fill 0.2s ease, stroke 0.2s ease;
}

/* Glow and inner glow are decorative — no pointer events */
.strait-glow,
.strait-inner-glow {
  pointer-events: none;
}

.strait-inner-glow {
  stroke: none;
}

/* Focus ring — hidden by default, shown on keyboard focus */
.strait-focus-ring {
  fill: none;
  stroke: transparent;
  stroke-width: 2;
  pointer-events: none;
  transition: stroke 0.15s ease;
}

.strait-circle-group:focus-visible .strait-focus-ring {
  stroke: rgba(255, 255, 255, 0.7);
}

/* Label — Encode Sans 14px weight 300 matching renewables style */
.strait-label {
  fill: rgba(255, 255, 255, 0.9);
  font-family: 'Encode Sans', sans-serif;
  font-size: 14px;
  font-weight: 300;
  pointer-events: none;
}

/* --- Scale legend --- */
.scale-legend {
  pointer-events: none;
}

.legend-circle {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 1;
}

.legend-line {
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 0.5;
  stroke-dasharray: 2 2;
}

.legend-label {
  fill: rgba(255, 255, 255, 0.5);
  font-family: 'Encode Sans', sans-serif;
  font-size: 12px;
  font-weight: 300;
}

.legend-title {
  fill: rgba(255, 255, 255, 0.5);
  font-family: 'Encode Sans', sans-serif;
  font-size: 11px;
  font-weight: 300;
  text-anchor: middle;
}

/* --- Reduced motion --- */
@media (prefers-reduced-motion: reduce) {
  .strait-circle {
    transition: none;
  }

  .strait-focus-ring {
    transition: none;
  }

  .strait-circle-group {
    transition: none;
  }

  .strait-dimmed {
    transition: none;
  }
}
</style>
