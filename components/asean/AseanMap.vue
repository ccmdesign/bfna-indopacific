<script setup lang="ts">
import * as d3 from 'd3'
import countriesGeo from '~/data/asean/countries.geo.json'
import { COUNTRIES, countryById } from '~/data/asean/country-tiers'
import type { CountryTier } from '~/data/asean/country-tiers'

const props = defineProps<{
  activeSlug: string | null
  hoverSlug: string | null
}>()

const emit = defineEmits<{
  (e: 'select', slug: string | null): void
  (e: 'hover', slug: string | null): void
}>()

interface CountryFeature {
  type: 'Feature'
  id: string
  properties: { id: string; name: string; slug: string; tier: CountryTier }
  geometry: any
}

const features = (countriesGeo as { features: CountryFeature[] }).features

// Build a fit-target subset that excludes context-tier neighbors so the
// projection frames ASEAN itself. Context countries still render, just bleed
// off-frame at the edges.
const FIT_TIERS = new Set<CountryTier>(['inScope', 'stretch', 'inert'])
const fitTarget = {
  type: 'FeatureCollection' as const,
  features: features.filter((f) => FIT_TIERS.has(f.properties.tier))
}

// Width and height get sized by ResizeObserver on mount; SSR uses a sensible
// default so the rendered HTML has stable paths.
const VIEWBOX_W = 1280
const VIEWBOX_H = 720

const projection = d3
  .geoMercator()
  .center([113, 5])
  // Slight inset so glow halos don't get clipped at the edges.
  .fitExtent(
    [
      [40, 40],
      [VIEWBOX_W - 40, VIEWBOX_H - 40]
    ],
    fitTarget
  )

const pathGen = d3.geoPath(projection)

// Round to 2 decimal places so SSR and client hydration agree on every numeric
// attribute. d3-geo's Mercator math gives slightly different last-digit float
// results in Node vs the browser; rounding to 0.01px is below sub-pixel
// resolution and eliminates the hydration mismatch warnings.
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

const groupedByTier = computed(() => {
  const groups: Record<CountryTier, typeof renderedFeatures> = {
    context: [],
    inert: [],
    stretch: [],
    inScope: []
  }
  for (const f of renderedFeatures) {
    groups[f.properties.tier].push(f)
  }
  return groups
})

function onSelect(slug: string, tier: CountryTier) {
  if (tier === 'inert' || tier === 'context') return
  if (props.activeSlug === slug) {
    emit('select', null)
  } else {
    emit('select', slug)
  }
}

function isInteractive(tier: CountryTier) {
  return tier === 'inScope' || tier === 'stretch'
}

function handleKey(e: KeyboardEvent, slug: string, tier: CountryTier) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    onSelect(slug, tier)
  } else if (e.key === 'Escape' && props.activeSlug) {
    emit('select', null)
  }
}
</script>

<template>
  <div class="asean-map">
    <svg
      class="asean-map__svg"
      :viewBox="`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`"
      preserveAspectRatio="xMidYMid slice"
      aria-labelledby="asean-map-title"
    >
      <title id="asean-map-title">Map of ASEAN member states</title>
      <defs>
        <radialGradient id="asean-sea" cx="55%" cy="55%" r="65%">
          <stop offset="0%" stop-color="#0e2740" stop-opacity="1" />
          <stop offset="65%" stop-color="#06121f" stop-opacity="1" />
          <stop offset="100%" stop-color="#02060c" stop-opacity="1" />
        </radialGradient>
        <filter id="asean-active-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="asean-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="rgba(255, 255, 255, 0.025)"
            stroke-width="0.5"
          />
        </pattern>
      </defs>

      <rect :width="VIEWBOX_W" :height="VIEWBOX_H" fill="url(#asean-sea)" />
      <rect :width="VIEWBOX_W" :height="VIEWBOX_H" fill="url(#asean-grid)" />

      <!-- Context: orientation-only ghost fills -->
      <g class="asean-map__tier asean-map__tier--context">
        <path
          v-for="f in groupedByTier.context"
          :key="f.id"
          :d="f.d"
          fill="rgba(255, 255, 255, 0.025)"
          stroke="rgba(255, 255, 255, 0.06)"
          stroke-width="0.6"
        />
      </g>

      <!-- Inert: visible but unselectable -->
      <g class="asean-map__tier asean-map__tier--inert">
        <path
          v-for="f in groupedByTier.inert"
          :key="f.id"
          :d="f.d"
          fill="rgba(255, 255, 255, 0.05)"
          stroke="rgba(255, 255, 255, 0.12)"
          stroke-width="0.6"
        />
      </g>

      <!-- Stretch: visible, low-fi panel on click. Click handler lives on the
           <path> so transparent areas of the group bbox don't capture clicks
           meant for an adjacent country. -->
      <g
        v-for="f in groupedByTier.stretch"
        :key="f.id"
        class="asean-map__country asean-map__country--stretch"
        :class="{ 'is-active': props.activeSlug === f.properties.slug }"
        role="button"
        tabindex="0"
        :aria-label="`${f.properties.name}, click to view profile`"
        :aria-pressed="props.activeSlug === f.properties.slug"
        @keydown="handleKey($event, f.properties.slug, f.properties.tier)"
        @focus="emit('hover', f.properties.slug)"
        @blur="emit('hover', null)"
      >
        <path
          :d="f.d"
          :fill="
            props.activeSlug === f.properties.slug
              ? 'hsla(218, 60%, 58%, 0.18)'
              : props.hoverSlug === f.properties.slug
                ? 'rgba(255, 255, 255, 0.16)'
                : 'rgba(255, 255, 255, 0.08)'
          "
          :stroke="
            props.activeSlug === f.properties.slug
              ? 'hsl(218, 60%, 58%)'
              : props.hoverSlug === f.properties.slug
                ? 'rgba(255, 255, 255, 0.45)'
                : 'rgba(255, 255, 255, 0.18)'
          "
          stroke-width="0.8"
          @click="onSelect(f.properties.slug, f.properties.tier)"
          @mouseenter="emit('hover', f.properties.slug)"
          @mouseleave="emit('hover', null)"
        />
        <text
          :x="f.centroid[0]"
          :y="f.centroid[1]"
          :dy="f.properties.slug === 'brunei' ? -12 : 0"
          :fill="props.activeSlug === f.properties.slug ? '#fff' : 'rgba(255, 255, 255, 0.72)'"
          :font-size="props.activeSlug === f.properties.slug ? 16 : 13"
          :font-weight="props.activeSlug === f.properties.slug ? 600 : 500"
          text-anchor="middle"
          dominant-baseline="middle"
          class="asean-map__label"
          pointer-events="none"
        >
          {{ f.properties.name }}
        </text>
      </g>

      <!-- In-scope: full interactive treatment with glow when active. Click
           handler lives on the foreground <path> so transparent areas of the
           bbox don't capture clicks. -->
      <g
        v-for="f in groupedByTier.inScope"
        :key="f.id"
        class="asean-map__country asean-map__country--inscope"
        :class="{ 'is-active': props.activeSlug === f.properties.slug }"
        role="button"
        tabindex="0"
        :aria-label="`${f.properties.name}, click to view profile`"
        :aria-pressed="props.activeSlug === f.properties.slug"
        @keydown="handleKey($event, f.properties.slug, f.properties.tier)"
        @focus="emit('hover', f.properties.slug)"
        @blur="emit('hover', null)"
      >
        <path
          v-if="props.activeSlug === f.properties.slug"
          :d="f.d"
          fill="hsla(218, 60%, 58%, 0.08)"
          stroke="hsla(218, 60%, 58%, 0.55)"
          stroke-width="3"
          filter="url(#asean-active-glow)"
          pointer-events="none"
        />
        <path
          :d="f.d"
          :fill="
            props.activeSlug === f.properties.slug
              ? 'hsla(218, 60%, 58%, 0.22)'
              : props.hoverSlug === f.properties.slug
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(255, 255, 255, 0.12)'
          "
          :stroke="
            props.activeSlug === f.properties.slug
              ? 'hsl(218, 60%, 58%)'
              : props.hoverSlug === f.properties.slug
                ? 'rgba(255, 255, 255, 0.65)'
                : 'rgba(255, 255, 255, 0.32)'
          "
          stroke-width="0.9"
          @click="onSelect(f.properties.slug, f.properties.tier)"
          @mouseenter="emit('hover', f.properties.slug)"
          @mouseleave="emit('hover', null)"
        />
        <text
          :x="f.centroid[0]"
          :y="f.centroid[1]"
          :fill="props.activeSlug === f.properties.slug ? '#fff' : 'rgba(255, 255, 255, 0.72)'"
          :font-size="props.activeSlug === f.properties.slug ? 16 : 13"
          :font-weight="props.activeSlug === f.properties.slug ? 600 : 500"
          text-anchor="middle"
          dominant-baseline="middle"
          class="asean-map__label"
          pointer-events="none"
        >
          {{ f.properties.name }}
        </text>
      </g>
    </svg>

    <!-- Vignette: gentle additive scrim, not stacked over the page mix-blend halo -->
    <div class="asean-map__vignette" aria-hidden="true" />
  </div>
</template>

<style scoped>
.asean-map {
  position: relative;
  width: 100%;
  height: 100%;
}

.asean-map__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.asean-map__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 70% 60% at 50% 50%,
    transparent 0%,
    transparent 55%,
    rgba(0, 0, 0, 0.5) 100%
  );
}

.asean-map__country {
  cursor: pointer;
  transition: filter 200ms ease;
}

.asean-map__country path {
  transition: fill 200ms ease, stroke 200ms ease, stroke-width 200ms ease;
}

.asean-map__country:focus-visible {
  outline: none;
}

.asean-map__country:focus-visible path {
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.6));
}

.asean-map__label {
  font-family: 'Encode Sans', sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  pointer-events: none;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.9);
  transition: font-size 200ms ease, font-weight 200ms ease, fill 200ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .asean-map__country path,
  .asean-map__label {
    transition: none;
  }
}
</style>
