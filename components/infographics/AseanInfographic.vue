<script setup lang="ts">
import { computed, ref } from 'vue'
import { profileBySlug, PROFILES } from '~/data/asean/country-profiles'
import { tradeStackedBySlug } from '~/data/asean/trade-stacked'
import { MINERALS_BY_SLUG } from '~/data/asean/minerals.generated'

// Active country state. Idle (null) = fullscreen map, no selection; clicking a
// country docks the map to the top-left quadrant (see AseanMap re-zoom).
const activeSlug = ref<string | null>(null)

// Title + chart dock are deferred to the quadrant-content spec
// (docs/plans/2026-05-22-001-feat-asean-map-quadrant-dock-spec.md). The three
// freed quadrants stay empty for now; flip to re-enable the legacy overlays.
const SHOW_LEGACY_PANELS = false

const activeProfile = computed(() =>
  activeSlug.value ? profileBySlug(activeSlug.value) : undefined
)

const activeTradeStacked = computed(() =>
  activeSlug.value ? tradeStackedBySlug[activeSlug.value] : undefined
)

// Critical-minerals slice for the active country. Mirrors activeTradeStacked
// so map selection + layer flip update the green faces exactly like trade.
// MINERALS_BY_SLUG carries a record for every wired slug (the 3 low-data
// countries carry hasMaterialData:false; the components render the designed
// honest state, not a blank).
const activeMinerals = computed(() =>
  activeSlug.value ? MINERALS_BY_SLUG[activeSlug.value] : undefined
)

// Layer = which lens is on the same active country. "trade" = all goods;
// "green" = critical minerals only. Both layers are wired (BF-58).
type Layer = 'trade' | 'green'
const layer = ref<Layer>('trade')

const CHART_PARTNERS = ['CHN', 'USA', 'EU']

function onActiveSlugUpdate(next: string | null) {
  // Accept null (deselect) or any wired profile slug. Map clicks for
  // countries without a profile fall through silently.
  if (next === null || PROFILES[next]) {
    activeSlug.value = next
  }
}
</script>

<template>
  <div class="asean-infographic">
    <!-- Map stays fullscreen across all quadrants; selecting a country re-frames
         it into the top-left quadrant (see AseanMap re-zoom). Charts will overlay
         the other three quadrants on top of the map. -->
    <AseanMap
      :active-slug="activeSlug"
      @update:active-slug="onActiveSlugUpdate"
    />

    <!-- Idle intro: top-right quadrant. Infographic title + subtitle + blurb,
         shown only when no country is selected. -->
    <Transition name="intro-fade">
      <header v-if="!activeSlug" class="asean-infographic__intro">
        <h1 class="asean-infographic__intro-title">ASEAN: Pivot of the Indo-Pacific</h1>
        <p class="asean-infographic__intro-subtitle">
          How Southeast Asia's economies balance the United States, China, and the EU
        </p>
        <p class="asean-infographic__intro-blurb">
          An interactive map of ASEAN member states and their economic, strategic, and
          resource ties to the three great powers. Select a country to explore its trade
          balance, its trade flows with the US, China, and the EU since 2010, and its
          critical-mineral leverage.
        </p>
      </header>
    </Transition>

    <!-- Top-right text block. Sits directly on the dark map surface — no card
         chrome. Contains flag + country title, layer tabs, hero stat with
         tagline, and the narrative paragraph. -->
    <header v-if="activeProfile && SHOW_LEGACY_PANELS" class="asean-infographic__title">
      <div class="asean-infographic__title-id">
        <img
          :src="activeProfile.flagUrl"
          :alt="`Flag of ${activeProfile.name}`"
          class="asean-infographic__title-flag"
          width="64"
          height="44"
          loading="lazy"
        />
        <h1 class="asean-infographic__title-name">{{ activeProfile.name }}</h1>
      </div>

      <!-- Layer tabs: switch the lens on the same active country. The two
           layers differ in data (all goods vs critical minerals) but reuse
           the same dock components below. -->
      <nav class="asean-infographic__tabs" role="tablist" aria-label="Active layer">
        <button
          type="button"
          role="tab"
          class="asean-infographic__tab"
          :class="{ 'is-active': layer === 'trade' }"
          :aria-selected="layer === 'trade'"
          @click="layer = 'trade'"
        >
          Trade
        </button>
        <button
          type="button"
          role="tab"
          class="asean-infographic__tab"
          :class="{ 'is-active': layer === 'green' }"
          :aria-selected="layer === 'green'"
          @click="layer = 'green'"
        >
          Green Transition
        </button>
      </nav>

      <div class="asean-infographic__title-hero">
        <span class="asean-infographic__title-hero-value">
          {{ activeProfile.hero.value }}
        </span>
        <span class="asean-infographic__title-hero-label">
          {{ activeProfile.hero.label }}
        </span>
      </div>

      <p class="asean-infographic__title-paragraph">{{ activeProfile.paragraph }}</p>
    </header>

    <!-- Bottom dock: two cards side-by-side. Each card is a CardFlip with two
         faces — front = "Trade" layer, back = "Green Transition" /
         critical-minerals layer. The layer tab in the title block flips both
         cards in unison. Both faces are wired to real data (BF-58). -->
    <div v-if="activeProfile && SHOW_LEGACY_PANELS" class="asean-infographic__dock">
      <div class="asean-infographic__dock-bars">
        <CardFlip :flipped="layer === 'green'">
          <template #front>
            <CountryChartCard
              eyebrow="Indicative composition"
              title="Top exports & imports"
              meta="USD billions"
              source="indicative — not individually sourced"
            >
              <CountryTradeBalanceBars :profile="activeProfile" :height="220" />
            </CountryChartCard>
          </template>
          <template #back>
            <CountryChartCard
              eyebrow="Critical minerals · 2025"
              title="Share of world mine production"
              meta="% of world · USGS MCS2026"
              source="USGS MCS2026"
            >
              <CountryMineralShareBars
                v-if="activeMinerals"
                :data="activeMinerals"
                :height="220"
              />
            </CountryChartCard>
          </template>
        </CardFlip>
      </div>

      <div v-if="activeTradeStacked" class="asean-infographic__dock-chart">
        <CardFlip :flipped="layer === 'green'">
          <template #front>
            <CountryChartCard
              eyebrow="Trade flows"
              title="Trade with US, China, EU · 2010–2024"
              meta="USD billions"
              :source="activeTradeStacked.source"
            >
              <CountryStackedArea
                :data="activeTradeStacked"
                :partners="CHART_PARTNERS"
                :height="220"
              />
            </CountryChartCard>
          </template>
          <template #back>
            <CountryChartCard
              eyebrow="Mineral flows"
              title="Where the nickel goes · 2024"
              meta="USD share by destination"
              source="BACI HS07 V202601 (mineral HS6 codes)"
            >
              <CountryMineralFlowBand
                v-if="activeMinerals"
                :data="activeMinerals"
                :height="220"
              />
            </CountryChartCard>
          </template>
        </CardFlip>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asean-infographic {
  position: fixed;
  inset: 0;
  width: 100svw;
  height: 100svh;
  z-index: 10;
}

/* Idle intro — top-right quadrant. Sits on the dark map, no card chrome. */
.asean-infographic__intro {
  position: absolute;
  top: 0;
  right: 0;
  width: 50svw;
  max-height: 50svh;
  box-sizing: border-box;
  padding: clamp(28px, 5vh, 64px) clamp(24px, 3vw, 56px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  z-index: 20;
  color: rgba(255, 255, 255, 0.92);
  font-family: 'Encode Sans', sans-serif;
  text-align: right;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

.asean-infographic__intro-title {
  margin: 0;
  font-size: clamp(2.2rem, 3.4vw, 3.8rem);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.02em;
  color: #fff;
}

.asean-infographic__intro-subtitle {
  margin: 0;
  font-size: clamp(1rem, 1.4vw, 1.4rem);
  font-weight: 400;
  line-height: 1.3;
  color: hsl(218, 70%, 88%);
}

.asean-infographic__intro-blurb {
  margin: 4px 0 0;
  max-width: 46ch;
  align-self: flex-end;
  font-size: clamp(0.85rem, 1vw, 1rem);
  font-weight: 400;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
}

.intro-fade-enter-active,
.intro-fade-leave-active {
  transition: opacity 400ms ease;
}
.intro-fade-enter-from,
.intro-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .intro-fade-enter-active,
  .intro-fade-leave-active {
    transition: none;
  }
}

/* --- Top-right title block (no card) --- */
.asean-infographic__title {
  position: absolute;
  top: clamp(20px, 3vh, 40px);
  right: clamp(20px, 2.5vw, 40px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: clamp(360px, 36vw, 560px);
  z-index: 20;
  color: rgba(255, 255, 255, 0.92);
  font-family: 'Encode Sans', sans-serif;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
}

.asean-infographic__title-id {
  display: flex;
  align-items: center;
  gap: 14px;
}

.asean-infographic__title-flag {
  width: 64px;
  height: auto;
  border-radius: 4px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.4);
  object-fit: cover;
}

.asean-infographic__title-name {
  margin: 0;
  font-size: clamp(2.2rem, 3.2vw, 3.6rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.015em;
  color: #fff;
}

.asean-infographic__tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  align-self: flex-start;
  background: rgba(2, 38, 64, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.asean-infographic__tab {
  appearance: none;
  border: none;
  background: transparent;
  padding: 7px 14px;
  font-family: 'Encode Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.55);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.asean-infographic__tab:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.05);
}

.asean-infographic__tab.is-active {
  background: hsla(218, 60%, 58%, 0.25);
  color: hsl(218, 70%, 88%);
  font-weight: 500;
}

.asean-infographic__tab:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .asean-infographic__tab {
    transition: none;
  }
}

.asean-infographic__title-hero {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asean-infographic__title-hero-value {
  font-size: clamp(2rem, 2.8vw, 3rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.015em;
  color: hsl(218, 70%, 78%);
  font-variant-numeric: tabular-nums;
}

.asean-infographic__title-hero-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.asean-infographic__title-paragraph {
  margin: 0;
  font-size: clamp(13px, 1vw, 14px);
  font-weight: 300;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
}

/* --- Bottom dock: two cards --- */
.asean-infographic__dock {
  position: absolute;
  left: clamp(16px, 2vw, 32px);
  right: clamp(16px, 2vw, 32px);
  bottom: clamp(48px, 6vh, 72px);
  display: grid;
  grid-template-columns: 65fr 35fr;
  gap: clamp(12px, 1.4vw, 24px);
  z-index: 20;
  pointer-events: auto;
}

.asean-infographic__dock-bars,
.asean-infographic__dock-chart {
  min-width: 0;
  /* Explicit height so the 3D flip wrapper has a frame to rotate inside —
     CardFlip uses absolutely-positioned faces, so its parent needs to give
     it a measured size. */
  min-height: 340px;
  display: flex;
  align-items: stretch;
}

.asean-infographic__dock-bars > *,
.asean-infographic__dock-chart > * {
  flex: 1;
}
</style>
