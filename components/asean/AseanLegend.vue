<script setup lang="ts">
import { computed } from 'vue'
import { COUNTRIES } from '~/data/asean/country-tiers'

// Floating country legend (BF-76 A1). Lists all 11 ASEAN countries from the
// COUNTRIES registry over the left-edge ocean band. Each interactive row docks
// its country on click and highlights it on the map on hover; inert rows render
// disabled until their profiles land (A3 / BF-79–80). An "Overview / Full map"
// entry is pinned at the top (BF-76 A2). When `collapsed` is true the whole
// menu shrinks to a single "Legend" pill that re-expands the list on click —
// the collapse decision (overlap heuristic) is owned by the parent.
const props = defineProps<{
  /** Currently docked country slug (null = idle full map). Marks its row active. */
  activeSlug: string | null
  /** Parent-owned collapse flag: true renders the "Legend" pill, false the list. */
  collapsed: boolean
}>()

const emit = defineEmits<{
  /** An interactive country row was clicked — dock this slug. */
  (e: 'select', slug: string): void
  /** The "Overview / Full map" entry was clicked — return to the idle map. */
  (e: 'overview'): void
  /** Hover changed: an interactive slug, or null on leave. */
  (e: 'hover', slug: string | null): void
  /** The collapsed "Legend" pill was clicked — reopen the full list. */
  (e: 'expand'): void
}>()

interface LegendRow {
  slug: string
  name: string
  flag: string
  interactive: boolean
}

// Registry insertion order is the designed order; only the tier gates
// interactivity (inScope | stretch are clickable; inert is disabled).
const rows = computed<LegendRow[]>(() =>
  Object.values(COUNTRIES).map((c) => ({
    slug: c.slug,
    name: c.name,
    flag: c.flag,
    interactive: c.tier === 'inScope' || c.tier === 'stretch'
  }))
)

function onSelect(row: LegendRow) {
  if (!row.interactive) return
  emit('select', row.slug)
}

function onEnter(row: LegendRow) {
  if (!row.interactive) return
  emit('hover', row.slug)
}

function onLeave() {
  emit('hover', null)
}
</script>

<template>
  <div class="asean-legend">
    <!-- Collapsed: a single pill that reopens the list (Overview lives inside
         the reopened list, one click away per BF-76). -->
    <button
      v-if="collapsed"
      type="button"
      class="asean-legend__pill"
      aria-label="Show country legend"
      @click="emit('expand')"
    >
      <span class="asean-legend__pill-glyph" aria-hidden="true">☰</span>
      Legend
    </button>

    <!-- Expanded: Overview entry pinned on top, then all 11 country rows. -->
    <nav v-else class="asean-legend__menu" aria-label="ASEAN countries">
      <button
        type="button"
        class="asean-legend__row asean-legend__row--overview"
        :class="{ 'is-active': activeSlug === null }"
        :aria-current="activeSlug === null ? 'true' : undefined"
        @click="emit('overview')"
      >
        <span class="asean-legend__flag" aria-hidden="true">⌂</span>
        <span class="asean-legend__name">Overview · Full map</span>
      </button>

      <ul class="asean-legend__list">
        <li v-for="row in rows" :key="row.slug">
          <button
            type="button"
            class="asean-legend__row"
            :class="{ 'is-active': activeSlug === row.slug, 'is-inert': !row.interactive }"
            :disabled="!row.interactive"
            :aria-disabled="!row.interactive ? 'true' : undefined"
            :aria-current="activeSlug === row.slug ? 'true' : undefined"
            @click="onSelect(row)"
            @mouseenter="onEnter(row)"
            @mouseleave="onLeave"
            @focus="onEnter(row)"
            @blur="onLeave"
          >
            <span class="asean-legend__flag" aria-hidden="true">{{ row.flag }}</span>
            <span class="asean-legend__name">{{ row.name }}</span>
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style scoped>
/* Anchored over the left-edge ocean band, vertically centered. Sits inside the
   infographic's pointer-events:none overlay, so it opts pointer events back in
   (mirrors .asean-infographic__tabs). */
.asean-legend {
  position: absolute;
  top: 50%;
  left: clamp(12px, 1.5vw, 28px);
  transform: translateY(-50%);
  z-index: 25;
  pointer-events: auto;
  font-family: 'Encode Sans', sans-serif;
}

.asean-legend__menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  max-height: 80svh;
  overflow-y: auto;
  background: rgba(2, 38, 64, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.asean-legend__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.asean-legend__row {
  appearance: none;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px 7px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.78);
  font-family: inherit;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.asean-legend__row:hover {
  color: rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.06);
}

.asean-legend__row.is-active {
  background: hsla(218, 60%, 58%, 0.25);
  color: hsl(218, 70%, 88%);
  font-weight: 500;
}

.asean-legend__row:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 1px;
}

.asean-legend__row--overview {
  margin-bottom: 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

/* Inert rows: visible but not interactive (no profile yet — A3 / BF-79–80). */
.asean-legend__row.is-inert {
  opacity: 0.4;
  cursor: default;
}

.asean-legend__row.is-inert:hover {
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
}

.asean-legend__flag {
  flex: 0 0 auto;
  width: 1.4em;
  text-align: center;
  font-size: 15px;
  line-height: 1;
}

.asean-legend__name {
  flex: 1 1 auto;
  min-width: 0;
}

/* Collapsed pill */
.asean-legend__pill {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(2, 38, 64, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.9);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.asean-legend__pill:hover {
  background: rgba(2, 38, 64, 0.7);
  color: #fff;
}

.asean-legend__pill:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 1px;
}

.asean-legend__pill-glyph {
  font-size: 14px;
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .asean-legend__row,
  .asean-legend__pill {
    transition: none;
  }
}
</style>
