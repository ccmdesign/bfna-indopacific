<!--
  BF-224: scale-to-fit stage behind every /embed/<slug> route that has a canvas.

  The infographics are composed for a desktop viewport: type and spacing are
  vw-based clamps and the grid is viewport-locked, so squeezing the page into a
  host iframe (Squarespace, 85vh, phone column...) reflows and clips it. Instead
  the infographic renders in an inner iframe at its design canvas — where every
  vw/svh/media query resolves as on desktop — and that frame is scaled uniformly
  to fit whatever frame the host gives us.

  - The canvas stretches along one axis to match the host frame's shape, within
    the infographic's min/max aspect, so most frames fill edge to edge; beyond
    those bounds the stage letterboxes.
  - When the fitted scale drops below MIN_READABLE_SCALE (phones, narrow columns)
    the stage shows a cover card that opens the full, mobile-ready page in a new
    tab instead of an unreadably small infographic.
  - `?mode=stage|cover` forces a mode (QA and the embed preview page).
-->
<script setup lang="ts">
import { findInfographic } from '~/data/infographics'

const props = defineProps<{ slug: string }>()

/** Below this the desktop composition is too small to read (16px type → <8px). */
const MIN_READABLE_SCALE = 0.5

const entry = findInfographic(props.slug)
if (!entry?.canvas) {
  throw createError({ statusCode: 500, statusMessage: `No embed canvas configured for "${props.slug}"` })
}
const canvas = entry.canvas

const route = useRoute()
const forcedMode = route.query.mode === 'cover' || route.query.mode === 'stage'
  ? route.query.mode
  : null

// Forward capture mode (BF-100) so a settled export of the stage stays settled inside.
const canvasSrc = `/embed/canvas/${props.slug}${route.query.capture !== undefined ? '?capture' : ''}`
const fullPageUrl = `/infographics/${props.slug}`

const frame = reactive({ w: 0, h: 0 })

function measure() {
  frame.w = window.innerWidth
  frame.h = window.innerHeight
}

onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
})

const fit = computed(() => {
  const { w, h } = frame
  if (!w || !h) return null

  const designAspect = canvas.width / canvas.height
  const aspect = Math.min(canvas.maxAspect, Math.max(canvas.minAspect, w / h))

  // Keep the design width for taller frames and the design height for wider
  // ones, so the type scale never drops below the composition it was built at.
  const cw = aspect >= designAspect ? Math.round(canvas.height * aspect) : canvas.width
  const ch = aspect >= designAspect ? canvas.height : Math.round(canvas.width / aspect)
  const scale = Math.min(w / cw, h / ch)

  return {
    cw,
    ch,
    scale,
    left: (w - cw * scale) / 2,
    top: (h - ch * scale) / 2
  }
})

const mode = computed<'pending' | 'stage' | 'cover'>(() => {
  if (!fit.value) return 'pending'
  if (forcedMode) return forcedMode
  return fit.value.scale < MIN_READABLE_SCALE ? 'cover' : 'stage'
})

const loaded = ref(false)
</script>

<template>
  <div class="embed-stage" :data-mode="mode">
    <template v-if="mode === 'stage' && fit">
      <iframe
        class="embed-stage__canvas"
        :class="{ 'is-loaded': loaded }"
        :src="canvasSrc"
        :width="fit.cw"
        :height="fit.ch"
        :title="entry!.embedTitle"
        :style="{
          left: `${fit.left}px`,
          top: `${fit.top}px`,
          transform: `scale(${fit.scale})`
        }"
        allowfullscreen
        @load="loaded = true"
      />
      <a
        class="embed-stage__open"
        :href="fullPageUrl"
        target="_blank"
        rel="noopener"
      >
        Open full screen
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M3 1h6v6M9 1 1 9" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </a>
    </template>

    <EmbedCoverCard v-else-if="mode === 'cover'" :entry="entry!" :href="fullPageUrl" />
  </div>
</template>

<style scoped>
.embed-stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(to bottom, #0D0D0D 5%, #022640 105%);
}

.embed-stage__canvas {
  position: absolute;
  border: 0;
  display: block;
  transform-origin: 0 0;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.embed-stage__canvas.is-loaded {
  opacity: 1;
}

.embed-stage__open {
  position: absolute;
  left: 10px;
  top: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-family: 'Encode Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: #fff;
  background: rgba(3, 12, 24, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(6px);
  opacity: 0.7;
  transition: opacity 0.2s ease, border-color 0.2s ease;
}

.embed-stage__open:hover,
.embed-stage__open:focus-visible {
  opacity: 1;
  border-color: rgba(255, 255, 255, 0.6);
}

@media (prefers-reduced-motion: reduce) {
  .embed-stage__canvas,
  .embed-stage__open {
    transition: none;
  }
}

:global(.is-capturing) .embed-stage__open {
  display: none;
}
</style>
