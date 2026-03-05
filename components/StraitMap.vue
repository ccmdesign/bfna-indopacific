<script setup lang="ts">
import { computed, useId } from 'vue'
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
      positions on the satellite image at all aspect ratios.  The plan
      suggested "meet", but that would cause misalignment with the cropped
      image.  Edge-circle visibility has been verified at 1440x900 and
      1920x1080 viewports.
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

      <g
        v-for="strait in mappedStraits"
        :key="strait.id"
        class="strait-circle-group"
        role="button"
        :tabindex="0"
        :aria-label="`${strait.name}: ${strait.globalShareLabel}`"
        @click="onStraitActivate(strait.id)"
        @keydown.enter="onStraitActivate(strait.id)"
        @keydown.space.prevent="onStraitActivate(strait.id)"
      >
        <!-- Focus ring — SVG <g> does not support CSS outline -->
        <circle
          :cx="strait.cx"
          :cy="strait.cy"
          :r="strait.r + 4"
          class="strait-focus-ring"
        />

        <!-- Data circle -->
        <circle
          :cx="strait.cx"
          :cy="strait.cy"
          :r="strait.r"
          class="strait-circle"
        />

        <!-- Label shadow (SVG text-shadow is not valid; use duplicate text with offset) -->
        <text
          :x="strait.labelX + 2"
          :y="strait.labelY + 2"
          :text-anchor="strait.textAnchor"
          class="strait-label-shadow"
        >
          {{ strait.name }}
        </text>

        <!-- Label foreground -->
        <text
          :x="strait.labelX"
          :y="strait.labelY"
          :text-anchor="strait.textAnchor"
          class="strait-label"
        >
          {{ strait.name }}
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
}

.strait-circle {
  fill: rgba(255, 255, 255, 0.15);
  stroke: rgba(255, 255, 255, 0.6);
  stroke-width: 1.5;
  transition: fill 0.2s ease, stroke 0.2s ease;
}

.strait-circle-group:hover .strait-circle,
.strait-circle-group:focus-visible .strait-circle {
  fill: rgba(255, 255, 255, 0.3);
  stroke: rgba(255, 255, 255, 0.9);
}

/* Focus ring — hidden by default, shown on keyboard focus */
.strait-focus-ring {
  fill: none;
  stroke: transparent;
  stroke-width: 2;
  transition: stroke 0.15s ease;
}

.strait-circle-group:focus-visible .strait-focus-ring {
  stroke: rgba(255, 255, 255, 0.7);
}

.strait-label-shadow {
  fill: rgba(0, 0, 0, 0.6);
  font-family: 'Encode Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
}

/*
 * Label font-size is in viewBox coordinate units (not CSS px) and scales
 * proportionally with the SVG. On viewports narrower than ~900px, labels
 * may overlap — this is a known limitation accepted for this ticket.
 * A future responsive pass (media query to hide labels or reduce font-size)
 * can address sub-900px viewports.
 */
.strait-label {
  fill: rgba(255, 255, 255, 0.9);
  font-family: 'Encode Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .strait-circle {
    transition: none;
  }

  .strait-focus-ring {
    transition: none;
  }
}
</style>
