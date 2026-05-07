<script setup lang="ts">
import * as d3 from 'd3'
import countriesGeo from '~/data/asean/countries.geo.json'
import { COUNTRIES } from '~/data/asean/country-tiers'
import type { CountryTier } from '~/data/asean/country-tiers'

// =============================================================================
// LOCKED PLATE — image + geographic bounds calibrated together.
// Do NOT edit individual values without re-calibrating via /test/asean-calibrate.
// The image is equirectangular (plate carrée): lon→x, lat→y are linear.
// =============================================================================
const PLATE = {
  imageHref: '/assets/map-asean-2x.webp',
  west: 23.27,
  east: 155.55,
  north: 43.61,
  south: -31.33
} as const

// =============================================================================
// FRAME TRANSFORM — manipulates the locked plate as a single unit.
// Defaults center Malaysia (~109.5°E, 4.2°N) in the viewBox.
// Override via props to re-frame from parent.
// =============================================================================
const props = withDefaults(defineProps<{
  frameTx?: number
  frameTy?: number
  frameScale?: number
}>(), {
  frameTx: -893,
  frameTy: -270,
  frameScale: 1.25
})

const emit = defineEmits<{
  (e: 'select', slug: string): void
}>()

interface CountryFeature {
  type: 'Feature'
  id: string
  properties: { id: string; name: string; slug: string; tier: CountryTier }
  geometry: any
}

const features = (countriesGeo as { features: CountryFeature[] }).features

const VB_W = 1920
const VB_H = 1080

const projection = d3.geoTransform({
  point(lon: number, lat: number) {
    this.stream.point(
      ((lon - PLATE.west) / (PLATE.east - PLATE.west)) * VB_W,
      ((PLATE.north - lat) / (PLATE.north - PLATE.south)) * VB_H
    )
  }
})

const pathGen = d3.geoPath(projection as any)

function r2(n: number) {
  return Math.round(n * 100) / 100
}
function roundPath(d: string) {
  return d.replace(/-?\d+\.\d+/g, (m) => r2(Number(m)).toString())
}

const renderedFeatures = features.map((f) => {
  const c = pathGen.centroid(f as any) as [number, number]
  return {
    ...f,
    d: roundPath(pathGen(f as any) ?? ''),
    centroid: [r2(c[0]), r2(c[1])] as [number, number]
  }
})

const interactiveFeatures = computed(() =>
  renderedFeatures.filter(f => f.properties.tier === 'inScope' || f.properties.tier === 'stretch')
)

const frameTransform = computed(() =>
  `translate(${props.frameTx},${props.frameTy}) scale(${props.frameScale})`
)

const hoverSlug = ref<string | null>(null)

function onClick(slug: string) {
  const country = COUNTRIES[slug]
  if (country) {
    emit('select', slug)
  }
}
</script>

<template>
  <div class="asean-map">
    <svg
      class="asean-map__svg"
      :viewBox="`0 0 ${VB_W} ${VB_H}`"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter id="country-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Frame transform applies to entire locked plate as a single unit -->
      <g :transform="frameTransform">
        <!-- Locked plate: image + svg paths share calibrated geographic bounds -->
        <image
          :href="PLATE.imageHref"
          :width="VB_W"
          :height="VB_H"
          preserveAspectRatio="none"
          pointer-events="none"
        />

        <g
          v-for="f in interactiveFeatures"
          :key="f.id"
          class="asean-map__country"
          :class="{
            'is-hovered': hoverSlug === f.properties.slug,
            'is-inscope': f.properties.tier === 'inScope',
            'is-stretch': f.properties.tier === 'stretch'
          }"
          role="button"
          tabindex="0"
          :aria-label="`${f.properties.name}, click to view profile`"
          @keydown.enter.prevent="onClick(f.properties.slug)"
          @keydown.space.prevent="onClick(f.properties.slug)"
        >
          <path
            v-if="hoverSlug === f.properties.slug"
            :d="f.d"
            class="asean-map__glow"
            filter="url(#country-glow)"
          />
          <path
            :d="f.d"
            class="asean-map__fill"
            @click="onClick(f.properties.slug)"
            @mouseenter="hoverSlug = f.properties.slug"
            @mouseleave="hoverSlug = null"
          />
          <text
            v-if="hoverSlug === f.properties.slug"
            :x="f.centroid[0]"
            :y="f.centroid[1]"
            class="asean-map__label"
          >
            {{ f.properties.name }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.asean-map {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #020a14;
}

.asean-map__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.asean-map__country {
  cursor: pointer;
}

.asean-map__country:focus-visible {
  outline: none;
}

.asean-map__country:focus-visible .asean-map__fill {
  stroke: rgba(255, 255, 255, 0.6);
  stroke-width: 1.5;
}

.asean-map__fill {
  fill: rgba(255, 255, 255, 0.1);
  stroke: rgba(255, 255, 255, 0.25);
  stroke-width: 1;
  pointer-events: all;
  transition: fill 300ms ease, stroke 300ms ease;
}

.asean-map__country.is-hovered .asean-map__fill {
  fill: rgba(255, 255, 255, 0.12);
  stroke: rgba(255, 255, 255, 0.4);
  stroke-width: 1;
}

.asean-map__glow {
  fill: rgba(255, 255, 255, 0.06);
  stroke: rgba(255, 255, 255, 0.25);
  stroke-width: 2;
  pointer-events: none;
}

.asean-map__label {
  font-family: 'Encode Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  fill: #fff;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .asean-map__fill {
    transition: none;
  }
}
</style>
