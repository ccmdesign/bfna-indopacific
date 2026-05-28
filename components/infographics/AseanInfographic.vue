<script setup lang="ts">
import { computed, ref, watch, onScopeDispose } from 'vue'
import type { ComponentPublicInstance } from 'vue'
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

// Tab = the single source of truth for the focused sidebar view (BF-72 U3).
// "description" (default) shows the hero number + label + narrative paragraph;
// "trade" / "green" show the two chart cards, with the Trade<->Green flip
// preserved via :flipped="tab === 'green'" on both CardFlips.
//
// NOTE: this intentionally REVERSES BF-71 commit 84d0274, which demoted the
// chart toggle to an aria-pressed group. BF-72 restores a real WAI-ARIA
// tablist (Description | Trade | Green Transition) by design (R1/R2).
type Tab = 'description' | 'trade' | 'green'
const TAB_ORDER: Tab[] = ['description', 'trade', 'green']
const tab = ref<Tab>('description')

const CHART_PARTNERS = ['CHN', 'USA', 'EU']

// --- WAI-ARIA tablist keyboard model (APG): roving tabindex + arrow/Home/End.
const tabRefs = ref<HTMLButtonElement[]>([])

function setTabRef(el: Element | ComponentPublicInstance | null, index: number) {
  if (el instanceof HTMLButtonElement) tabRefs.value[index] = el
}

function selectTab(next: Tab) {
  tab.value = next
}

// Trade + Green deliberately share ONE tabpanel (#asean-tabpanel-charts): both
// render the same two CardFlips flipped in unison, so a shared-panel APG
// variation is the right fit rather than duplicating the markup into two
// panels. Its `aria-labelledby` must name the *active* chart tab — and must be
// dropped entirely when neither chart tab is active (Description tab), so the
// hidden charts panel is never stale-labelled by the Trade tab. Returning
// undefined makes Vue omit the attribute.
const chartsPanelLabelledBy = computed(() =>
  tab.value === 'trade' || tab.value === 'green' ? `asean-tab-${tab.value}` : undefined
)

function focusTab(index: number) {
  const clamped = (index + TAB_ORDER.length) % TAB_ORDER.length
  const next = TAB_ORDER[clamped]
  tab.value = next
  tabRefs.value[clamped]?.focus()
}

function onTabKeydown(event: KeyboardEvent, index: number) {
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault()
      focusTab(index + 1)
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault()
      focusTab(index - 1)
      break
    case 'Home':
      event.preventDefault()
      focusTab(0)
      break
    case 'End':
      event.preventDefault()
      focusTab(TAB_ORDER.length - 1)
      break
  }
}

function onActiveSlugUpdate(next: string | null) {
  // Accept null (deselect) or any wired profile slug. Map clicks for
  // countries without a profile fall through silently.
  if (next === null || PROFILES[next]) {
    activeSlug.value = next
  }
}

// --- Country-switch choreography (BF-72 U4) ---------------------------------
// The sidebar name + hero number render from these composables' displayText so
// a country switch can retype the name and scramble the number in place. The
// paragraph cross-fade (U5) is declarative on the same `activeSlug` key, and
// the map re-zoom (600 ms) reacts to `activeSlug` inside AseanMap — so all
// switch effects start together at t=0 (R11), driven by the one watcher below.
const { displayText: typedName, isTyping, play: playName, set: setName } = useTypewriter()
const { displayText: heroValue, play: playHero, set: setHero } = useScramble()

// --- Flag 3D flip (BF-72 U5) ------------------------------------------------
// CardFlip shows `front` when flagFlipped=false, `back` when true. To keep
// every switch flipping the SAME visual direction (R7), a switch sets
// flagBack = incoming flag and flagFlipped = true; after the ~700 ms rotate
// settles we normalize (flagFront = incoming, flagFlipped = false) without
// animating — the snap is invisible because the front already shows the
// incoming flag mid-rotate. Held in component state + a cleared-on-retrigger
// settle timeout. CardFlip's reduced-motion cross-fade satisfies R12 here.
const FLAG_FLIP_MS = 700
const flagFront = ref('')
const flagBack = ref('')
const flagFlipped = ref(false)
let flagSettleTimer: ReturnType<typeof setTimeout> | null = null

function clearFlagSettle() {
  if (flagSettleTimer) {
    clearTimeout(flagSettleTimer)
    flagSettleTimer = null
  }
}

function flipFlagTo(nextUrl: string) {
  clearFlagSettle()
  flagBack.value = nextUrl
  flagFlipped.value = true
  flagSettleTimer = setTimeout(() => {
    // Normalize: front becomes the now-visible incoming flag, reset to unflipped
    // so the next switch again rotates front -> back in the same direction.
    flagFront.value = nextUrl
    flagFlipped.value = false
    flagSettleTimer = null
  }, FLAG_FLIP_MS)
}

onScopeDispose(clearFlagSettle)

// Single orchestrator (immediate, so first open seeds the settled values).
// - country<->country switch (prev && next && prev !== next): play() the name
//   typewriter + hero scramble concurrently at t=0 (R11). Reduced-motion is
//   handled inside each composable (instant final string).
// - first open (!prev) / re-seed: set() the settled strings with no animation
//   so the existing panel-rise entrance is unchanged (R6).
// - deselect (!next): nothing to render; leave the last strings in place for
//   the panel-rise leave (the sidebar unmounts).
watch(
  activeSlug,
  (next, prev) => {
    if (!next) return
    const profile = profileBySlug(next)
    if (!profile) return
    if (prev && prev !== next) {
      // (a) flag flips, (b) name retypes, (c) hero scrambles — all at t=0
      // (R11). (d) the paragraph cross-fade is declarative via <Transition>
      // keyed on activeSlug, so it starts at the same instant.
      flipFlagTo(profile.flagUrl)
      playName(profile.name)
      playHero(profile.hero.value)
    } else {
      // First open / re-seed: settle every effect with no animation (R6).
      clearFlagSettle()
      flagFront.value = profile.flagUrl
      flagFlipped.value = false
      setName(profile.name)
      setHero(profile.hero.value)
    }
  },
  { immediate: true }
)
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

    <!-- Focused-state right sidebar. Selecting a country stacks the identity
         (flag + name) and a 3-tab tablist above the active tabpanel: Description
         (hero + narrative) or the two chart cards (Trade / Green Transition) —
         in a single right-hand column. The map keeps the rest of the viewport
         with the country docked top-left. The sidebar is pointer-events:none
         (map stays clickable through it); only the tabs and the chart cards opt
         back in. -->
    <Transition name="panel-rise">
      <aside v-if="activeProfile" class="asean-infographic__sidebar">
        <!-- Identity: flag + name only. Hero + narrative moved into the
             Description tabpanel below (BF-72 U3/R4). Flag + name stay
             always-visible and animate on country switch (U4/U5). -->
        <header class="asean-infographic__title">
          <div class="asean-infographic__title-id">
            <!-- Flag 3D flip (BF-72 U5): on a country switch the outgoing flag
                 (front) rotates to the incoming flag (back), reusing CardFlip.
                 Faces are normalized after the rotate settles so each switch
                 flips the same direction. CardFlip cross-fades under reduced
                 motion (R12). First open shows flagFront with no flip. -->
            <div class="asean-infographic__title-flag">
              <!-- duration-ms bound to FLAG_FLIP_MS so the rotate and the
                   post-settle normalize timeout (flipFlagTo) stay in lockstep,
                   independent of CardFlip's internal default (BF-72 review). -->
              <CardFlip :flipped="flagFlipped" :duration-ms="FLAG_FLIP_MS">
                <template #front>
                  <img
                    :src="flagFront"
                    :alt="`Flag of ${activeProfile.name}`"
                    class="asean-infographic__title-flag-img"
                    width="64"
                    height="44"
                    loading="lazy"
                  />
                </template>
                <template #back>
                  <img
                    :src="flagBack"
                    alt=""
                    aria-hidden="true"
                    class="asean-infographic__title-flag-img"
                    width="64"
                    height="44"
                    loading="lazy"
                  />
                </template>
              </CardFlip>
            </div>
            <h1 class="asean-infographic__title-name">{{ typedName
              }}<span v-if="isTyping" class="asean-infographic__title-caret" aria-hidden="true">▌</span></h1>
          </div>

          <!-- Real WAI-ARIA tablist (Description | Trade | Green Transition).
               Restores tab/tabpanel semantics that BF-71 (84d0274) demoted to
               an aria-pressed group — deliberate restoration, not a regression
               (R2). Roving tabindex + arrow/Home/End follow the APG model. -->
          <div
            class="asean-infographic__tabs"
            role="tablist"
            aria-label="Country detail view"
          >
            <button
              v-for="(t, i) in TAB_ORDER"
              :key="t"
              :ref="(el) => setTabRef(el, i)"
              type="button"
              role="tab"
              :id="`asean-tab-${t}`"
              :aria-controls="`asean-tabpanel-${t === 'description' ? 'description' : 'charts'}`"
              :aria-selected="tab === t"
              :tabindex="tab === t ? 0 : -1"
              class="asean-infographic__tab"
              :class="{ 'is-active': tab === t }"
              @click="selectTab(t)"
              @keydown="onTabKeydown($event, i)"
            >
              {{ t === 'description' ? 'Description' : t === 'trade' ? 'Trade' : 'Green Transition' }}
            </button>
          </div>
        </header>

        <!-- Description tabpanel: hero big-number + label + narrative paragraph
             (moved out of the header per R3/R4). -->
        <section
          v-show="tab === 'description'"
          id="asean-tabpanel-description"
          role="tabpanel"
          aria-labelledby="asean-tab-description"
          class="asean-infographic__tabpanel"
        >
          <div class="asean-infographic__title-hero">
            <span class="asean-infographic__title-hero-value">
              {{ heroValue }}
            </span>
            <span class="asean-infographic__title-hero-label">
              {{ activeProfile.hero.label }}
            </span>
          </div>

          <!-- Description paragraph cross-fade (BF-72 U5/R10): keyed on
               activeSlug so a country switch fades the old text out then the
               new in (~500 ms). Reduced-motion is handled in the desc-fade @media.

               R10 NOTE — hidden-tab behavior: this <p> sits inside the v-show
               Description section, so when activeSlug changes while the user is
               on Trade/Green the keyed node re-keys and Vue schedules an out-in
               cycle on a display:none element. This is benign, NOT a strand:
               transitionend never fires on a hidden node, but Vue's
               getTransitionInfo still reads the declared transition-duration and
               sets a duration-based fallback timer, so the cycle resolves and
               the resting <p> ends with its transition classes removed (no
               inline opacity). Reopening Description therefore shows the new
               paragraph at full opacity. The only cost is wasted scheduling on
               hidden content; gating with v-if would add a one-time fade-in on
               every tab-open, which we deliberately avoid. (Validated in PR #46
               review; see todos/159.) -->
          <Transition name="desc-fade" mode="out-in">
            <p
              :key="activeSlug"
              class="asean-infographic__title-paragraph"
            >{{ activeProfile.paragraph }}</p>
          </Transition>
        </section>

        <!-- Trade / Green tabpanel: the two chart cards. Shown for trade|green,
             hidden on the Description tab. Both CardFlips flip in unison via
             :flipped="tab === 'green'" — the Trade<->Green flip is unchanged.
             Trade + Green INTENTIONALLY share this single tabpanel (same two
             cards flipped) — a documented shared-panel APG variation, not a
             one-tab-one-panel miss. aria-labelledby names whichever chart tab
             is active and is dropped on the Description tab (chartsPanelLabelledBy). -->
        <section
          v-show="tab === 'trade' || tab === 'green'"
          id="asean-tabpanel-charts"
          role="tabpanel"
          :aria-labelledby="chartsPanelLabelledBy"
          class="asean-infographic__tabpanel asean-infographic__tabpanel--charts"
        >
          <!-- Tornado bars: indicative top exports & imports (front) / share of
               world mine production (back). -->
          <div class="asean-infographic__panel">
            <CardFlip :flipped="tab === 'green'">
              <template #front>
                <CountryChartCard
                  eyebrow="Indicative composition"
                  title="Top exports & imports"
                  meta="USD billions"
                  source="indicative — not individually sourced"
                >
                  <CountryTradeBalanceBars
                    :key="`${activeSlug}-${tab}`"
                    :profile="activeProfile"
                    :height="200"
                  />
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
                    :key="`${activeSlug}-${tab}`"
                    :data="activeMinerals"
                    :height="200"
                  />
                </CountryChartCard>
              </template>
            </CardFlip>
          </div>

          <!-- Stacked area: trade flows with the US, China, EU since 2010 (front)
               / mineral flows by destination (back). -->
          <div v-if="activeTradeStacked" class="asean-infographic__panel">
            <CardFlip :flipped="tab === 'green'">
              <template #front>
                <CountryChartCard
                  eyebrow="Trade flows"
                  title="Trade with US, China, EU · 2010–2024"
                  meta="USD billions"
                  :source="activeTradeStacked.source"
                >
                  <CountryStackedArea
                    :key="`${activeSlug}-${tab}`"
                    :data="activeTradeStacked"
                    :partners="CHART_PARTNERS"
                    :height="200"
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
                    :key="`${activeSlug}-${tab}`"
                    :data="activeMinerals"
                    :height="200"
                  />
                </CountryChartCard>
              </template>
            </CardFlip>
          </div>
        </section>
      </aside>
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

/* --- Focused-state right sidebar --- */
/* Full-height right column holding the identity above the two charts. Sits over
   the right of the map; pointer-events:none so the map (and any country under
   it) stays clickable, with only the tabs and chart cards opting back in. A
   soft left-edge scrim blends the column into the map and keeps content
   legible against the busy plate. Scrolls if the column overflows. */
.asean-infographic__sidebar {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  /* BF-72 R5: width cap raised 480px -> 600px to give the Description tab's
     hero + paragraph and the chart panels more room. */
  width: clamp(340px, 34vw, 600px);
  box-sizing: border-box;
  padding: clamp(20px, 3vh, 40px) clamp(20px, 2vw, 32px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vh, 24px);
  overflow-y: auto;
  z-index: 20;
  pointer-events: none;
  background: linear-gradient(
    to right,
    rgba(2, 38, 64, 0) 0%,
    rgba(2, 38, 64, 0.55) 26%
  );
}

/* Identity block inside the sidebar (no card chrome). */
.asean-infographic__title {
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: rgba(255, 255, 255, 0.92);
  font-family: 'Encode Sans', sans-serif;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
}

.asean-infographic__title-id {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* Flag flip container. Fixed to the flag's intrinsic 64x44 so the two flag
   faces share one footprint and the flip has no layout shift. */
.asean-infographic__title-flag {
  flex: 0 0 auto;
  width: 64px;
  height: 44px;
}

.asean-infographic__title-flag-img {
  width: 64px;
  height: 44px;
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

/* Blinking caret shown while the name typewriter is running (BF-72 U4).
   Mirrors the AseanMap hover-label caret. Reduced-motion: the typewriter
   short-circuits in useTypewriter so the caret never renders. */
.asean-infographic__title-caret {
  margin-left: 0.06em;
  color: hsl(218, 70%, 88%);
  animation: title-caret-blink 600ms steps(1) infinite;
}

@keyframes title-caret-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
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

/* --- Tabpanels --- */
/* Description tabpanel: hero block + paragraph, stacked with the same rhythm
   they had inside the old identity header (inherits the sidebar's
   pointer-events:none so the map stays click-through, unchanged from before).
   Charts tabpanel: the two CardFlip panels stacked with the sidebar gap; the
   panels opt back into pointer events on their own (.asean-infographic__panel). */
.asean-infographic__tabpanel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.asean-infographic__tabpanel--charts {
  gap: clamp(14px, 2vh, 24px);
}

/* --- Chart panels stacked in the sidebar --- */
/* Each panel is a CardFlip frame stacked in the sidebar column. CardFlip now
   grid-stacks its faces and sizes to the taller face's intrinsic height, so the
   panel needs no explicit height — it sizes to its card. The cards opt back into
   pointer events (chart hover/tooltips) while the surrounding sidebar stays
   click-through to the map. */
.asean-infographic__panel {
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  pointer-events: auto;
}

.asean-infographic__panel > * {
  flex: 1;
  min-width: 0;
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

/* --- Description paragraph cross-fade (BF-72 U5/R10) --- */
/* out-in: the old paragraph fades out (~250ms), then the new fades in (~250ms),
   keyed on activeSlug — reads as a ~500ms cross-fade in sync with the other
   switch effects. Opacity-only so it never shifts layout. */
.desc-fade-enter-active {
  transition: opacity 250ms ease;
}
.desc-fade-leave-active {
  transition: opacity 250ms ease;
}
.desc-fade-enter-from,
.desc-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  /* Mirror panel-rise: no fade duration, instant swap. */
  .desc-fade-enter-active,
  .desc-fade-leave-active {
    transition: none;
  }
}
</style>
