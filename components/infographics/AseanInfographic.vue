<script setup lang="ts">
import { computed, ref } from 'vue'
import { profileBySlug } from '~/data/asean/country-profiles'
import indonesiaTradeStacked from '~/data/asean/indonesia-trade-stacked.json'

// Active country state. Default = Indonesia (only wired profile right now).
// Clicking Indonesia toggles the dock on/off; clicks on other countries are
// a no-op until their profiles are ready.
const activeSlug = ref<string | null>('indonesia')

const activeProfile = computed(() =>
  activeSlug.value ? profileBySlug(activeSlug.value) : undefined
)

// Layer = which lens is on the same active country. "trade" = all goods;
// "green" = critical minerals only. Layer 2 data lands next pass.
type Layer = 'trade' | 'green'
const layer = ref<Layer>('trade')

const CHART_PARTNERS = ['CHN', 'USA', 'EU']

function onActiveSlugUpdate(next: string | null) {
  // Only Indonesia and "no selection" are valid states for now. Other
  // slugs come through when the user clicks unrelated countries — ignore
  // those until their profiles + chart data are wired in.
  if (next === null || next === 'indonesia') {
    activeSlug.value = next
  }
}
</script>

<template>
  <div class="asean-infographic">
    <AseanMap
      :active-slug="activeSlug"
      @update:active-slug="onActiveSlugUpdate"
    />

    <!-- Top-right text block. Sits directly on the dark map surface — no card
         chrome. Contains flag + country title, layer tabs, hero stat with
         tagline, and the narrative paragraph. -->
    <header v-if="activeProfile" class="asean-infographic__title">
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
         faces — front = "Trade" layer, back = "Green Transition" layer. The
         layer tab in the title block flips both cards in unison. Back-face
         data is placeholder until the minerals layer is wired. -->
    <div v-if="activeProfile" class="asean-infographic__dock">
      <div class="asean-infographic__dock-bars">
        <CardFlip :flipped="layer === 'green'">
          <template #front>
            <CountryChartCard
              eyebrow="Top trade · 2023"
              title="Top exports & imports"
              meta="USD billions"
              source="OEC 2023 / UN Comtrade"
            >
              <CountryTradeBalanceBars :profile="activeProfile" :height="220" />
            </CountryChartCard>
          </template>
          <template #back>
            <CountryChartCard
              eyebrow="Critical minerals · 2023"
              title="Top mineral exports & imports"
              meta="USD billions"
              source="USGS MCS2026 / BACI HS07 V202601"
            >
              <div class="asean-infographic__layer-stub">
                Critical-mineral view wires next pass.
              </div>
            </CountryChartCard>
          </template>
        </CardFlip>
      </div>

      <div class="asean-infographic__dock-chart">
        <CardFlip :flipped="layer === 'green'">
          <template #front>
            <CountryChartCard
              eyebrow="Trade flows"
              title="Trade with US, China, EU · 2010–2024"
              meta="USD billions"
              :source="indonesiaTradeStacked.source"
            >
              <CountryStackedArea
                :data="indonesiaTradeStacked"
                :partners="CHART_PARTNERS"
                :height="220"
              />
            </CountryChartCard>
          </template>
          <template #back>
            <CountryChartCard
              eyebrow="Mineral flows"
              title="Mineral trade with US, China, EU · 2010–2024"
              meta="USD billions"
              source="BACI HS07 V202601 (mineral HS6 codes)"
            >
              <div class="asean-infographic__layer-stub">
                Mineral-flow chart wires next pass.
              </div>
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
  grid-template-columns: minmax(360px, 1fr) minmax(420px, 1.2fr);
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

.asean-infographic__layer-stub {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  text-align: center;
}
</style>
