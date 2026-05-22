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
  /**
   * Active country slug (controlled). When passed, the map shows the
   * persistent "active" overlay on this country and ignores its own internal
   * toggle state. Pair with `@update:activeSlug` for two-way binding, or just
   * read `@select` for one-shot click events.
   */
  activeSlug?: string | null
}>(), {
  frameTx: -893,
  frameTy: -270,
  frameScale: 1.25,
  activeSlug: null
})

const emit = defineEmits<{
  (e: 'select', slug: string): void
  (e: 'update:activeSlug', slug: string | null): void
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
  const b = pathGen.bounds(f as any) as [[number, number], [number, number]]
  return {
    ...f,
    d: roundPath(pathGen(f as any) ?? ''),
    centroid: [r2(c[0]), r2(c[1])] as [number, number],
    bbox: {
      cx: r2((b[0][0] + b[1][0]) / 2),
      cy: r2((b[0][1] + b[1][1]) / 2),
      w: r2(b[1][0] - b[0][0]),
      h: r2(b[1][1] - b[0][1])
    },
    labelX: r2(b[1][0] + 16),
    labelY: r2((b[0][1] + b[1][1]) / 2)
  }
})

const interactiveFeatures = computed(() =>
  renderedFeatures.filter(f => f.properties.tier === 'inScope' || f.properties.tier === 'stretch')
)

// Fit the active country's bounding box into the top-left quadrant: PAD = how
// much of the quadrant the country may fill; MIN/MAX clamp keeps wide countries
// from zooming out too far and tiny ones from over-zooming. (Tunable.)
const QUADRANT_PAD = 0.8
const MIN_DOCK_ZOOM = 1.2
const MAX_DOCK_ZOOM = 4

// Frame applied as a CSS transform (property, not SVG attribute) so it can be
// CSS-transitioned. Idle = the calibrated default frame from props; active =
// scale so the country's bbox fits the top-left quadrant, then center it there.
// The map stays fullscreen — only the framing moves, leaving the other three
// quadrants for chart overlays.
const frameStyle = computed(() => {
  const f = activeFeature.value
  if (!f) {
    return {
      transform: `translate(${props.frameTx}px, ${props.frameTy}px) scale(${props.frameScale})`
    }
  }
  const { cx, cy, w, h } = f.bbox
  const fit = Math.min(((VB_W / 2) * QUADRANT_PAD) / w, ((VB_H / 2) * QUADRANT_PAD) / h)
  const Z = Math.max(MIN_DOCK_ZOOM, Math.min(MAX_DOCK_ZOOM, fit))
  return {
    transform: `translate(${r2(VB_W / 4 - Z * cx)}px, ${r2(VB_H / 4 - Z * cy)}px) scale(${r2(Z)})`
  }
})

const hoverSlug = ref<string | null>(null)
const internalActiveSlug = ref<string | null>(null)
const svgEl = ref<SVGSVGElement | null>(null)

// Resolve active slug: parent-controlled prop wins, else internal toggle.
const activeSlug = computed<string | null>(() =>
  props.activeSlug ?? internalActiveSlug.value
)

const hoveredFeature = computed(() =>
  hoverSlug.value
    ? interactiveFeatures.value.find(f => f.properties.slug === hoverSlug.value) ?? null
    : null
)

const activeFeature = computed(() =>
  activeSlug.value
    ? interactiveFeatures.value.find(f => f.properties.slug === activeSlug.value) ?? null
    : null
)

watchEffect(() => {
  const svg = svgEl.value
  if (!svg) return
  const shouldPause = hoverSlug.value !== null || activeSlug.value !== null
  if (shouldPause) svg.pauseAnimations()
  else svg.unpauseAnimations()
})

// Typewriter effect for hovered country name
const typedName = ref('')
const isTyping = ref(false)
let typeTimer: ReturnType<typeof setInterval> | null = null

function clearTypeTimer() {
  if (typeTimer) {
    clearInterval(typeTimer)
    typeTimer = null
  }
}

watch(hoveredFeature, (f) => {
  clearTypeTimer()
  typedName.value = ''
  isTyping.value = false
  if (!f) return
  const name = f.properties.name
  let i = 0
  isTyping.value = true
  typeTimer = setInterval(() => {
    i++
    typedName.value = name.slice(0, i)
    if (i >= name.length) {
      clearTypeTimer()
      isTyping.value = false
    }
  }, 40)
})

onUnmounted(() => clearTypeTimer())

function onClick(slug: string) {
  const country = COUNTRIES[slug]
  if (!country) return
  const next = activeSlug.value === slug ? null : slug
  internalActiveSlug.value = next
  emit('update:activeSlug', next)
  emit('select', slug)
}
</script>

<template>
  <div class="asean-map">
    <svg
      ref="svgEl"
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

        <!-- Sweeping gradient that drives the reveal mask -->
        <linearGradient id="reveal-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#000" />
          <stop offset="0.38" stop-color="#000" />
          <stop offset="0.5" stop-color="#808080" />
          <stop offset="0.62" stop-color="#000" />
          <stop offset="1" stop-color="#000" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            values="-1.4 -1.4; 1.4 1.4; -1.4 -1.4"
            keyTimes="0; 0.5; 1"
            dur="16s"
            repeatCount="indefinite"
          />
        </linearGradient>

        <mask id="reveal-mask" maskUnits="userSpaceOnUse" :x="0" :y="0" :width="VB_W" :height="VB_H">
          <rect :width="VB_W" :height="VB_H" fill="url(#reveal-grad)" />
        </mask>
      </defs>

      <!-- Frame transform applies to entire locked plate as a single unit -->
      <g class="asean-map__plate" :style="frameStyle">
        <!-- Locked plate: image + svg paths share calibrated geographic bounds -->
        <image
          :href="PLATE.imageHref"
          :width="VB_W"
          :height="VB_H"
          preserveAspectRatio="none"
          pointer-events="none"
        />

        <!-- Masked reveal layer: subtle sweeping highlight of all countries -->
        <g class="asean-map__reveal" mask="url(#reveal-mask)">
          <path
            v-for="f in interactiveFeatures"
            :key="'r' + f.id"
            :d="f.d"
            class="asean-map__fill"
          />
        </g>

        <!-- Hit-test layer: invisible, captures hover/click for all countries -->
        <g class="asean-map__hits">
          <g
            v-for="f in interactiveFeatures"
            :key="'h' + f.id"
            class="asean-map__country"
            role="button"
            tabindex="0"
            :aria-label="`${f.properties.name}, click to view profile`"
            @keydown.enter.prevent="onClick(f.properties.slug)"
            @keydown.space.prevent="onClick(f.properties.slug)"
          >
            <path
              :d="f.d"
              class="asean-map__hit"
              @click="onClick(f.properties.slug)"
              @mouseenter="hoverSlug = f.properties.slug"
              @mouseleave="hoverSlug = null"
            />
          </g>
        </g>

        <!-- Active overlay: persistent highlight on the currently-selected
             country. Sits above the sweep mask but below hover so a hover on
             a different country still pops to the top. -->
        <Transition name="hov">
          <g
            v-if="activeFeature"
            :key="'a-' + activeFeature.id"
            class="asean-map__active-layer"
            pointer-events="none"
          >
            <path
              :d="activeFeature.d"
              class="asean-map__active-glow"
              filter="url(#country-glow)"
            />
            <path
              :d="activeFeature.d"
              class="asean-map__active-fill"
            />
            <text
              :x="activeFeature.labelX"
              :y="activeFeature.labelY"
              class="asean-map__label asean-map__label--active"
            >
              {{ activeFeature.properties.name }}
            </text>
          </g>
        </Transition>

        <!-- Hover overlay: hovered country always above active + mask -->
        <Transition name="hov">
          <g v-if="hoveredFeature && hoveredFeature.properties.slug !== activeSlug" :key="hoveredFeature.id" class="asean-map__hover-layer" pointer-events="none">
            <path
              :d="hoveredFeature.d"
              class="asean-map__hover-glow"
              filter="url(#country-glow)"
            />
            <path
              :d="hoveredFeature.d"
              class="asean-map__hover-fill"
            />
            <text
              :x="hoveredFeature.labelX"
              :y="hoveredFeature.labelY"
              class="asean-map__label"
            >
              {{ typedName }}<tspan v-if="isTyping" class="asean-map__caret">▌</tspan>
            </text>
          </g>
        </Transition>
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

/* Locked plate (bg raster + vectors): re-zooms when a country is docked.
   transform-box/origin make CSS px == viewBox user units, anchored at origin. */
.asean-map__plate {
  transform-box: view-box;
  transform-origin: 0 0;
  transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

.asean-map__country {
  cursor: pointer;
}

.asean-map__country:focus,
.asean-map__country:focus-visible {
  outline: none;
}

/* Sweep-revealed paths (visual only, no events) */
.asean-map__fill {
  fill: rgba(255, 255, 255, 0.55);
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

/* Hit-test layer: invisible to eyes, captures all pointer events */
.asean-map__hit {
  fill: transparent;
  stroke: transparent;
  stroke-width: 0;
  pointer-events: all;
}

/* Hover overlay: hovered country renders unmasked */
.asean-map__hover-fill {
  fill: rgba(255, 255, 255, 0.09);
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.asean-map__hover-glow {
  fill: rgba(255, 255, 255, 0.04);
  stroke: rgba(255, 255, 255, 0.25);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

/* Active overlay: persistent, brighter than hover. Uses meridian blue from
   the brand palette so it reads as "selected" rather than "hovered". */
.asean-map__active-fill {
  fill: hsla(218, 60%, 58%, 0.18);
  stroke: hsla(218, 70%, 80%, 0.95);
  stroke-width: 1.4;
  vector-effect: non-scaling-stroke;
}

.asean-map__active-glow {
  fill: hsla(218, 60%, 58%, 0.06);
  stroke: hsla(218, 60%, 70%, 0.45);
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}

.asean-map__label--active {
  fill: hsla(218, 70%, 88%, 0.98);
  font-weight: 600;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.6));
}

/* Fade in / out the whole hover overlay group */
.hov-enter-active,
.hov-leave-active {
  transition: opacity 250ms ease;
}
.hov-enter-from,
.hov-leave-to {
  opacity: 0;
}

/* Slide-right + fade the label when overlay appears */
.asean-map__hover-layer text {
  animation: label-slide 320ms ease forwards;
  transform-box: fill-box;
  transform-origin: left center;
}

.asean-map__caret {
  animation: caret-blink 600ms steps(1) infinite;
  fill: rgba(255, 255, 255, 0.85);
}

@keyframes caret-blink {
  0%, 50%   { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}

@keyframes label-slide {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}

.asean-map__label {
  font-family: 'Encode Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: capitalize;
  fill: #fff;
  text-anchor: start;
  dominant-baseline: middle;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .asean-map__fill {
    transition: none;
  }
  .asean-map__plate {
    transition: none;
  }
}
</style>
