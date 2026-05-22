<script setup lang="ts">
import { computed, ref } from 'vue'
import { profileBySlug, PROFILES } from '~/data/asean/country-profiles'
import { tradeStackedBySlug } from '~/data/asean/trade-stacked'
import { MINERALS_BY_SLUG } from '~/data/asean/minerals.generated'

// Active country state. Idle (null) = fullscreen map, no selection; clicking a
// country docks the map to the top-left quadrant (see AseanMap re-zoom). The
// other three quadrants then fill with this country's content panels (TR
// identity, BL stacked area, BR tornado bars).
const activeSlug = ref<string | null>(null)

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
      :suppress-active-label="true"
      @update:active-slug="onActiveSlugUpdate"
    />

    <!-- Edge fades: blend the map into the dark background along the bottom and
         right edges (75%→100%). Non-interactive so country clicks pass through. -->
    <div class="asean-infographic__edge-fade" aria-hidden="true" />

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

    <!-- TR identity panel. Sits directly on the dark map surface — no card
         chrome. Contains flag + country title, layer tabs, hero stat with
         tagline, and the narrative paragraph. Lives in the top-right quadrant,
         kept clear of the TL-docked country (see CSS clamps). -->
    <Transition name="panel-rise">
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
    </Transition>

    <!-- BL panel — bottom-left quadrant. Stacked area: trade flows with the US,
         China, and the EU since 2010 (front) / mineral flows by destination
         (back). CardFlip flips in unison with BR via the shared `layer` ref. -->
    <Transition name="panel-rise">
      <div
        v-if="activeProfile && activeTradeStacked"
        class="asean-infographic__panel asean-infographic__panel-bl"
      >
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
    </Transition>

    <!-- BR panel — bottom-right quadrant. Tornado bars: indicative top exports &
         imports composition (front) / share of world mine production (back).
         CardFlip flips in unison with BL via the shared `layer` ref. The
         "indicative — not individually sourced" line is honest by design. -->
    <Transition name="panel-rise">
      <div
        v-if="activeProfile"
        class="asean-infographic__panel asean-infographic__panel-br"
      >
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
    </Transition>
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

/* Edge fades: map blends into the dark background at the bottom + right edges.
   Two stacked gradients, transparent until 75%, dark blue at the edge. */
.asean-infographic__edge-fade {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background:
    linear-gradient(to bottom, transparent 75%, #022640f2 100%),
    linear-gradient(to right, transparent 75%, #022640f2 100%);
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

/* --- TR identity panel (no card) --- */
/* Top-right quarter only: left edge stays right of the vertical midline so it
   never crosses into the TL-docked country. Max-height keeps it in the top
   half. The panel itself does not capture clicks (pointer-events: none) so the
   bare map behind it stays selectable; only the tabs opt back in to `auto`. */
.asean-infographic__title {
  position: absolute;
  top: clamp(20px, 3vh, 40px);
  right: clamp(20px, 2.5vw, 40px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: clamp(360px, 36vw, 560px);
  max-height: 46svh;
  z-index: 20;
  color: rgba(255, 255, 255, 0.92);
  font-family: 'Encode Sans', sans-serif;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
  pointer-events: none;
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
  /* Opt back in: the TR panel is pointer-events:none so bare map stays
     clickable, but the layer tabs must be clickable. */
  pointer-events: auto;
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

/* --- Bottom quadrant panels (BL + BR) --- */
/* Each panel is an independently-positioned CardFlip in its own bottom quarter,
   leaving the TL quarter (the docked country) and a margin around it free of
   pointer-capturing surfaces so re-click-to-deselect always lands on the map.
   The explicit min-height gives the 3D flip wrapper a measured frame —
   CardFlip uses absolutely-positioned faces, so its parent must be sized. */
.asean-infographic__panel {
  position: absolute;
  bottom: clamp(48px, 6vh, 72px);
  width: min(46vw, 620px);
  min-height: 320px;
  display: flex;
  align-items: stretch;
  z-index: 20;
  pointer-events: auto;
}

.asean-infographic__panel > * {
  flex: 1;
  min-width: 0;
}

/* BL: bottom-left quarter. Top edge sits well below the TL-docked country. */
.asean-infographic__panel-bl {
  left: clamp(16px, 2vw, 32px);
}

/* BR: bottom-right quarter, mirror of BL. */
.asean-infographic__panel-br {
  right: clamp(16px, 2vw, 32px);
}

/* --- Focused-panel choreography (R6/D4) --- */
/* Panels rise + fade in slightly after the 600 ms map re-zoom starts, so the
   eye follows the map first, then the content lands as the country settles into
   TL. On leave they fade out faster (no slide) before/while the map zooms back. */
.panel-rise-enter-active {
  transition: opacity 380ms ease, transform 380ms cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 150ms;
}
.panel-rise-leave-active {
  transition: opacity 240ms ease;
}
.panel-rise-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.panel-rise-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  /* Instant appear/disappear: no slide, no fade duration. CardFlip cross-fades
     internally under reduced motion (handled in CardFlip.vue). */
  .panel-rise-enter-active,
  .panel-rise-leave-active {
    transition: none;
    transition-delay: 0ms;
  }
  .panel-rise-enter-from {
    transform: none;
  }
}
</style>
