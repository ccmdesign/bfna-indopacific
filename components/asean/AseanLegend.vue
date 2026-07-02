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
  <div class="asean-legend" :class="{ 'asean-legend--collapsed': collapsed }">
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

    <!-- Expanded: stacked country names, styled like the top reel (Encode Sans
         Condensed, thin, dim with hover-brighten). Right-aligned to read as one
         column under the right-aligned intro. -->
    <nav v-else class="asean-legend__menu" aria-label="ASEAN countries">
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
          >{{ row.name }}</button>
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
  /* Idle: docked under the top-right intro (title + subtitle + blurb) so the
     right edge reads top-down: title -> subtitle -> blurb -> country grid.
     The intro is capped at 50svh, so anchor just below that band (+ a gap) to
     clear it at any viewport. right matches the intro's right padding. */
  top: calc(50svh + clamp(16px, 3vh, 32px));
  right: clamp(24px, 3vw, 56px);
  z-index: 25;
  pointer-events: auto;
  font-family: 'Encode Sans', sans-serif;
}

/* Collapsed pill (shows when a country is docked): anchor bottom-left, clear of
   the right-hand focused sidebar that owns the right edge in that state. */
.asean-legend--collapsed {
  top: auto;
  right: auto;
  bottom: clamp(16px, 4vh, 40px);
  left: clamp(12px, 1.5vw, 28px);
}

/* Stacked list, no card chrome — names sit directly on the map (reel style),
   right-aligned, with a text-shadow for legibility. */
.asean-legend__menu {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  /* Same column as the intro block, so the grid's left edge lines up with it. */
  width: var(--intro-w, clamp(200px, 28vw, 384px));
  max-height: 56svh;
  overflow-y: auto;
}

/* Two balanced columns (6 / 5 for the 11 countries). grid-auto-flow:column with
   a fixed row count fills the first column top-to-bottom, then the second —
   matching the designed order — and stays balanced if the list grows. Uniform
   right-align keeps both columns on the intro's right axis. */
.asean-legend__list {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(6, auto);
  justify-items: start;
  gap: clamp(6px, 1vh, 10px) clamp(16px, 2vw, 32px);
}

/* Mirrors AseanCountrySwitcher: Encode Sans Condensed, thin, dim with
   hover-brighten. No background / pill chrome. */
.asean-legend__row {
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px 0;
  font-family: 'Encode Sans Condensed', 'Encode Sans', sans-serif;
  font-weight: 300;
  font-size: clamp(18px, 1.53vw, 22px);
  line-height: 1.15;
  letter-spacing: 0.01em;
  text-align: left;
  color: rgba(255, 255, 255, 0.75);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
  cursor: pointer;
  transition: color 0.2s ease;
}

.asean-legend__row:hover {
  color: rgba(255, 255, 255, 0.95);
}

.asean-legend__row.is-active {
  color: #fff;
  font-weight: 400;
}

.asean-legend__row:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Inert rows: visible but not interactive (no profile yet — A3 / BF-79–80). */
.asean-legend__row.is-inert {
  opacity: 0.3;
  cursor: default;
}

.asean-legend__row.is-inert:hover {
  color: rgba(255, 255, 255, 0.5);
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
