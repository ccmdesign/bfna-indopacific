<script setup lang="ts">
import { computed } from 'vue'
import { scaleSqrt } from 'd3-scale'
import { min, max } from 'd3-array'
import straitsData from '~/data/straits/straits.json'

const straits = straitsData.straits
const meta = straitsData.meta

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

const domain: [number, number] = [
  min(straits, (d) => d.flowScalar)!,
  max(straits, (d) => d.flowScalar)!,
]

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

    switch (s.labelAnchor) {
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

// --- Click handler — emit strait id for future Lens wiring ---
const emit = defineEmits<{ (e: 'select-strait', id: string): void }>()

function onStraitActivate(id: string) {
  emit('select-strait', id)
}
</script>

<template>
  <div class="strait-map-container" :aria-label="meta.title">
    <!-- Dark fallback background visible when the satellite image is missing or loading -->
    <picture>
      <img
        class="map-bg"
        src="/assets/map-indo-pacific-2x.webp"
        alt=""
        aria-hidden="true"
        loading="eager"
        width="2400"
        height="1350"
      />
    </picture>

    <svg
      class="circle-overlay"
      :viewBox="`0 0 ${VB_WIDTH} ${VB_HEIGHT}`"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-labelledby="map-title map-desc"
      aria-roledescription="interactive map"
    >
      <title id="map-title">{{ meta.title }}</title>
      <desc id="map-desc">
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

        <!-- Label shadow (SVG text-shadow is not valid; use duplicate text) -->
        <text
          :x="strait.labelX + 1"
          :y="strait.labelY + 1"
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
