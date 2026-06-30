<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { COUNTRIES } from '~/data/asean/country-tiers'

// Focused-state country switcher (BF-76 follow-up). A horizontal infinite reel of
// all 11 ASEAN country names: the active country is the large title, anchored at a
// fixed x (the sidebar content's left edge, where the old H1 sat) so it never
// moves between switches. Neighbours fan out + dim; clicking a name or arrowing
// docks it and the reel slides. The reel cycles infinitely in the direction of
// travel — three copies render and we re-home the focal slot into the middle copy
// (instantly, off-transition) after each slide, so advancing past the last item
// keeps going the same way instead of rewinding. Idle nav still lives in AseanLegend.
const props = defineProps<{
  /** Currently docked country slug. Marks its title active + anchors the reel. */
  activeSlug: string
}>()

const emit = defineEmits<{
  /** A country title was clicked / arrowed to — dock this slug. */
  (e: 'select', slug: string): void
}>()

interface Row {
  slug: string
  name: string
  interactive: boolean
}

// Registry insertion order is the designed order; tier gates interactivity
// (inScope | stretch clickable; inert dimmed/disabled — mirrors AseanLegend).
const rows = computed<Row[]>(() =>
  Object.values(COUNTRIES).map((c) => ({
    slug: c.slug,
    name: c.name,
    interactive: c.tier === 'inScope' || c.tier === 'stretch'
  }))
)

const N = computed(() => rows.value.length)
// Three copies (prev | main | next) so both sides of the focal point are always
// filled and the reel can cross a copy boundary before re-homing.
const COPIES = [0, 1, 2]

const SLIDE_MS = 500

const rootEl = ref<HTMLElement | null>(null)
const trackEl = ref<HTMLElement | null>(null)
const translateX = ref(0)
const noTransition = ref(false)
// Flat slot index (0 .. 3N-1) anchored at the focal x. Normalised into the middle
// copy [N, 2N) after each slide so it's a true infinite cycle.
const focalFlat = ref(0)
// When a click/arrow drives the change we want THAT instance (so the slide goes
// the way the user pointed); external/initial changes default to the middle copy.
let pendingFlat: number | null = null

// Focal x = the sidebar's content-left edge (the anchor the user asked for: the
// reel hangs off where the sidebar H1 used to be). Measured live so it tracks the
// responsive sidebar width; falls back to a ratio before the sidebar mounts.
function focalX(): number {
  const sb = document.querySelector('.asean-infographic__sidebar') as HTMLElement | null
  if (sb) {
    const r = sb.getBoundingClientRect()
    const pl = parseFloat(getComputedStyle(sb).paddingLeft) || 0
    return r.left + pl
  }
  return (rootEl.value?.clientWidth ?? 0) * 0.64
}

// Align the focal slot's LEFT edge to focalX. offsetLeft is relative to the
// positioned track, so it's independent of the current transform.
function applyTranslate() {
  const slot = trackEl.value?.querySelector(`[data-flat="${focalFlat.value}"]`) as HTMLElement | null
  if (!slot) return
  translateX.value = Math.round(focalX() - slot.offsetLeft)
}

// After the slide, re-home the focal slot into the middle copy without animating.
// Copies are identical and evenly spaced, so shifting by one copy width leaves the
// on-screen position byte-identical — the swap is invisible. ponytail: timer keyed
// to SLIDE_MS rather than transitionend (which never fires if translate is a no-op).
let snapTimer: ReturnType<typeof setTimeout> | null = null
function scheduleReHome() {
  if (snapTimer) clearTimeout(snapTimer)
  snapTimer = setTimeout(() => {
    const n = N.value
    let f = focalFlat.value
    if (f < n) f += n
    else if (f >= 2 * n) f -= n
    if (f === focalFlat.value) return
    focalFlat.value = f
    noTransition.value = true
    nextTick(() => {
      applyTranslate()
      requestAnimationFrame(() => requestAnimationFrame(() => { noTransition.value = false }))
    })
  }, SLIDE_MS + 30)
}

function selectFlat(flat: number) {
  const row = rows.value[((flat % N.value) + N.value) % N.value]
  if (!row.interactive) return
  pendingFlat = flat
  emit('select', row.slug)
}

// Arrow keys: advance to the next/prev INTERACTIVE slot, always continuing in the
// pressed direction (stepping across copies → infinite, never rewinds).
function step(dir: 1 | -1) {
  const n = N.value
  let f = focalFlat.value
  do { f += dir } while (!rows.value[((f % n) + n) % n].interactive)
  selectFlat(f)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
}

// Map the (parent-owned) activeSlug to a flat focal slot: the pending instance if
// the change came from here, else the middle-copy instance.
watch(
  () => props.activeSlug,
  (slug) => {
    if (!slug) return
    const i = rows.value.findIndex((r) => r.slug === slug)
    if (i === -1) return
    let flat: number
    if (pendingFlat != null && ((pendingFlat % N.value) + N.value) % N.value === i) {
      flat = pendingFlat
    } else {
      flat = N.value + i
    }
    pendingFlat = null
    focalFlat.value = flat
    nextTick(() => { applyTranslate(); scheduleReHome() })
  },
  { immediate: true }
)

let ro: ResizeObserver | null = null
onMounted(() => {
  nextTick(applyTranslate)
  ro = new ResizeObserver(() => applyTranslate())
  if (rootEl.value) ro.observe(rootEl.value)
  if (document.fonts?.ready) document.fonts.ready.then(applyTranslate)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  if (snapTimer) clearTimeout(snapTimer)
})
</script>

<template>
  <nav ref="rootEl" class="asean-switcher" aria-label="Switch country" @keydown="onKeydown">
    <div
      ref="trackEl"
      class="asean-switcher__track"
      :style="{ transform: `translateX(${translateX}px)`, transition: noTransition ? 'none' : undefined }"
    >
      <template v-for="copy in COPIES" :key="copy">
        <button
          v-for="(row, i) in rows"
          :key="`${copy}-${row.slug}`"
          type="button"
          class="asean-switcher__name"
          :class="{ 'is-active': copy * N + i === focalFlat, 'is-inert': !row.interactive }"
          :data-flat="copy * N + i"
          :disabled="!row.interactive"
          :aria-disabled="!row.interactive ? 'true' : undefined"
          :aria-current="copy === 1 && row.slug === activeSlug ? 'true' : undefined"
          :aria-hidden="copy !== 1 ? 'true' : undefined"
          :tabindex="copy === 1 && row.slug === activeSlug ? 0 : -1"
          @click="selectFlat(copy * N + i)"
        >{{ row.name }}</button>
      </template>
    </div>
  </nav>
</template>

<style scoped>
/* Full-width strip pinned to the top. Sits inside the infographic overlay (which
   is pointer-events:none), so the names opt pointer events back in. Overflow
   clips the carousel copies that run past the viewport edges. */
.asean-switcher {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 22;
  overflow: hidden;
  padding: clamp(16px, 3vh, 32px) 0;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%);
}

.asean-switcher__track {
  position: relative;
  display: flex;
  align-items: end;
  gap: 22.5px;
  width: max-content;
  will-change: transform;
  transition: transform 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

.asean-switcher__name {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  flex: 0 0 auto;
  white-space: nowrap;
  font-family: 'Encode Sans Condensed', 'Encode Sans', sans-serif;
  font-weight: 300;
  font-size: 28px;
  line-height: 34px;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.5);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
  cursor: pointer;
  pointer-events: auto;
  /* Colour only — size must NOT transition: the reel measures each title's
     offset right after a switch to anchor it, and an in-flight size animation
     would make that measurement (and the anchor) drift. The track slide carries
     the motion instead. */
  transition: color 0.2s ease;
}

.asean-switcher__name:hover {
  color: rgba(255, 255, 255, 0.85);
}

.asean-switcher__name.is-active {
  font-size: 52px;
  line-height: 52px;
  font-weight: 400;
  color: #fff;
  cursor: default;
}

.asean-switcher__name.is-inert {
  opacity: 0.3;
  cursor: default;
}

.asean-switcher__name.is-inert:hover {
  color: rgba(255, 255, 255, 0.5);
}

.asean-switcher__name:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 4px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .asean-switcher__track,
  .asean-switcher__name {
    transition: none;
  }
}
</style>
