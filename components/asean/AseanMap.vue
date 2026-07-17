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
  imageHref: '/assets/map-asean-wide-2x.webp',
  west: 5,
  east: 185,
  north: 55,
  south: -46.25
} as const

// =============================================================================
// FRAME TRANSFORM — manipulates the locked plate as a single unit.
// Defaults center SE Asia + southern China (~108°E, 14°N) in the viewBox:
// Myanmar comfortably in frame, Australia mostly out (BF-78 / A4 reframe).
// First-pass geometry-derived values — confirm in-browser before tweaking.
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
  /**
   * Suppress the in-map active-country name label. The active overlay (glow +
   * fill) still renders; only the text label is hidden. Used by the focused
   * infographic layout where the docked country sits in the top-left quadrant
   * and its rightward label would collide with the TR identity panel. Hover
   * labels are unaffected. Default false preserves standalone-map behavior.
   */
  suppressActiveLabel?: boolean
  /**
   * Externally-driven hover slug (BF-76 A1). Lets a parent (the floating
   * legend) highlight a country on the map, reusing the existing hover overlay
   * + typewriter label. Direct map hover takes precedence — when the pointer is
   * over a country on the map, that internal hover wins over this prop, so the
   * legend never overrides what the user is pointing at. Default null = no
   * external hover.
   */
  externalHoverSlug?: string | null
}>(), {
  frameTx: -962,
  frameTy: -293,
  frameScale: 1.75,
  activeSlug: null,
  suppressActiveLabel: false,
  externalHoverSlug: null
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

// Countries whose right-anchored label reads poorly on the right — it would run
// off the east edge or sit out over open ocean. Indonesia (Papua reaches
// ~141°E) already trips the width threshold below; the Philippines sits far east
// too, so we force its label to the left of the highlight to match.
const LEFT_LABEL_NAMES = new Set(['Indonesia', 'Philippines'])
// Left-anchored labels sit 16px west of the highlight by default, which leaves
// them far out over open ocean. Nudge them back ~40px toward the country.
const LEFT_LABEL_NUDGE = 40

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
    // Label sits to the right of the bbox by default. For a country whose right
    // edge is far enough east that a right-anchored label would run off the
    // viewport (currently only Indonesia, with Papua at ~141°E), flip it to the
    // left of the highlight (anchored at the bbox's west edge, text-anchor end).
    ...((right) => LEFT_LABEL_NAMES.has(f.properties.name) || right > VB_W * 0.72
      ? { labelX: r2(b[0][0] - 16 + LEFT_LABEL_NUDGE), labelAnchor: 'end' as const }
      : { labelX: r2(right), labelAnchor: 'start' as const })(b[1][0] + 16),
    labelY: r2((b[0][1] + b[1][1]) / 2)
  }
})

const interactiveFeatures = computed(() =>
  renderedFeatures.filter(f => f.properties.tier === 'inScope' || f.properties.tier === 'stretch')
)

// Fit the active country's bounding box into the top-left quadrant: PAD = how
// much of the quadrant the country may fill; MIN/MAX clamp keeps wide countries
// from zooming out too far and tiny ones from over-zooming. (Tunable.)
// BF-99: raised 4 -> 6.5. At the old cap, tiny/isolated countries (Timor-Leste,
// Singapore, Brunei) only filled ~14% of the quadrant width, so nearby
// landmasses with no relation to the docked country visually dominated the
// frame — reported for Timor-Leste specifically as "centered on Northern
// Australia" (client note, 2026-07-14). 6.5 roughly doubles their on-screen
// footprint while staying under the raster's native-resolution ceiling (image
// is oversampled ~3.1x relative to the viewBox at scale 1, so some softening
// above that is an existing, accepted trade-off — Singapore/Brunei/Cambodia/
// Laos already dock at the old 4x clamp).
const QUADRANT_PAD = 0.8
const MIN_DOCK_ZOOM = 1.2
const MAX_DOCK_ZOOM = 6.5

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

// Resolve hover slug: direct map hover wins over the external (legend) hover so
// pointing at a country on the map is never overridden by a legend highlight.
const resolvedHoverSlug = computed<string | null>(() =>
  hoverSlug.value ?? props.externalHoverSlug
)

const hoveredFeature = computed(() =>
  resolvedHoverSlug.value
    ? interactiveFeatures.value.find(f => f.properties.slug === resolvedHoverSlug.value) ?? null
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
  const shouldPause = resolvedHoverSlug.value !== null || activeSlug.value !== null
  if (shouldPause) svg.pauseAnimations()
  else svg.unpauseAnimations()
})

// Typewriter effect for hovered country name. The timing engine + caret state
// live in useTypewriter (BF-72 U1); this component owns only the <text>/<tspan>
// markup. Visible cadence (~40 ms/char) and caret semantics are unchanged.
const { displayText: typedName, isTyping, play: playType, stop: stopType } = useTypewriter()

watch(hoveredFeature, (f) => {
  if (!f) {
    stopType()
    return
  }
  // Left-anchored labels (end) type right-to-left so the word grows away from
  // the highlight, caret leading on the left.
  playType(f.properties.name, f.labelAnchor === 'end')
})

function onClick(slug: string) {
  const country = COUNTRIES[slug]
  if (!country) return
  const next = activeSlug.value === slug ? null : slug
  internalActiveSlug.value = next
  emit('update:activeSlug', next)
  emit('select', slug)
}

// Clicking the map outside any country deselects → back to the idle full map.
// Country clicks bubble here too, so ignore any click that originated inside a
// country group (its own handler runs); everything else (the ocean / raster,
// which is the svg root itself) deselects.
function onSvgClick(e: MouseEvent) {
  const t = e.target as Element | null
  if (t?.closest?.('.asean-map__country')) return
  if (activeSlug.value === null) return
  internalActiveSlug.value = null
  emit('update:activeSlug', null)
}
</script>

<template>
  <div class="asean-map">
    <svg
      ref="svgEl"
      class="asean-map__svg"
      :viewBox="`0 0 ${VB_W} ${VB_H}`"
      preserveAspectRatio="xMidYMid slice"
      @click="onSvgClick"
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

        <!-- Edge fades, anchored to the image (0,0 = top-left, 1,1 = bottom-right):
             transparent until 0.75, dark blue (#022640f2) at the edge. -->
        <linearGradient id="edge-fade-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.75" stop-color="#022640" stop-opacity="0" />
          <stop offset="1" stop-color="#022640" stop-opacity="0.949" />
        </linearGradient>
        <linearGradient id="edge-fade-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.75" stop-color="#022640" stop-opacity="0" />
          <stop offset="1" stop-color="#022640" stop-opacity="0.949" />
        </linearGradient>
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

        <!-- Edge fades over the image, riding with the plate transform. -->
        <rect :width="VB_W" :height="VB_H" fill="url(#edge-fade-v)" pointer-events="none" />
        <rect :width="VB_W" :height="VB_H" fill="url(#edge-fade-h)" pointer-events="none" />

        <!-- Masked reveal layer: diagonal sweep tracing country BORDERS only -->
        <g class="asean-map__reveal" mask="url(#reveal-mask)" filter="url(#country-glow)">
          <path
            v-for="f in interactiveFeatures"
            :key="'r' + f.id"
            :d="f.d"
            class="asean-map__border"
          />
        </g>

        <!-- Idle affordance (BF-85): a persistent, brand-tinted outline + faint
             fill on every member so the 11 clickable countries read as
             interactive regions at rest, before any hover. The border sweep
             above only shimmers transiently as the diagonal passes, so without
             this the map looks like a static image. Rides the plate transform;
             never intercepts pointer events (the hit layer below does). -->
        <g class="asean-map__idle" :class="{ 'asean-map__idle--docked': !!activeFeature }" pointer-events="none">
          <path
            v-for="f in interactiveFeatures"
            :key="'i' + f.id"
            :d="f.d"
            class="asean-map__idle-shape"
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
              v-if="!suppressActiveLabel"
              :x="activeFeature.labelX"
              :y="activeFeature.labelY"
              :style="{ textAnchor: activeFeature.labelAnchor }"
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
              :style="{ textAnchor: hoveredFeature.labelAnchor }"
              class="asean-map__label"
            ><tspan v-if="isTyping && hoveredFeature.labelAnchor === 'end'" class="asean-map__caret">▌</tspan>{{ typedName }}<tspan v-if="isTyping && hoveredFeature.labelAnchor !== 'end'" class="asean-map__caret">▌</tspan></text>
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
  background: #01243e;
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

/* Sweep-revealed BORDERS (visual only, no events). The diagonal mask sweep
   illuminates the country outlines only — interiors stay transparent so the
   base raster shows through. */
.asean-map__border {
  fill: none;
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 1.4;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

/* Idle interactive affordance (BF-85): subtle persistent tint so the 11
   members read as clickable before hover. Brand meridian-blue, kept well below
   hover/active intensity so those still pop. Present from load — the border
   sweep still shimmers on top. */
.asean-map__idle {
  transition: opacity 600ms ease;
}
.asean-map__idle-shape {
  fill: hsla(218, 60%, 58%, 0.05);
  stroke: hsla(218, 65%, 74%, 0.42);
  stroke-width: 0.9;
  vector-effect: non-scaling-stroke;
}
/* When a country is docked, fade the idle tint back so the selection leads;
   the other members stay faintly visible (still clickable). */
.asean-map__idle--docked {
  opacity: 0.4;
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
  .asean-map__border {
    transition: none;
  }
  .asean-map__plate {
    transition: none;
  }
}
</style>
