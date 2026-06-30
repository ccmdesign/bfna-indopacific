<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { profileBySlug, PROFILES } from '~/data/asean/country-profiles'
import { tradeStackedBySlug } from '~/data/asean/trade-stacked'
import { MINERALS_BY_SLUG } from '~/data/asean/minerals.generated'

// Active country state. Idle (null) = fullscreen map, no selection; clicking a
// country docks the map to the top-left quadrant (see AseanMap re-zoom). The
// other three quadrants then fill with this country's content panels (TR
// identity, BL stacked area, BR tornado bars).
const activeSlug = ref<string | null>(null)

// --- Floating legend (BF-76 A1/A2) ------------------------------------------
// The left-edge legend lets the user dock any country (esp. tiny ones) by name
// and hover-highlight it on the map. We own its hover slug here and feed it into
// AseanMap as `externalHoverSlug` (direct map hover still wins). The legend
// collapses to a pill when it would overlap land: when a country is docked the
// map reframes into the top-left quadrant (overlapping the left edge), and on
// narrow viewports there isn't room — so shouldCollapse fires on either. A
// user-initiated expand overrides until the next dock (the activeSlug watch
// resets it). No land-geometry detection — a viewport/threshold heuristic per
// the brief.
const legendHoverSlug = ref<string | null>(null)
const userExpanded = ref(false)
const { isMobile } = useViewport()

const shouldCollapse = computed(
  () => (activeSlug.value !== null || isMobile.value) && !userExpanded.value
)

// A new dock re-collapses the legend (so each selection starts from the
// collapsed pill rather than leaving a land-overlapping list open).
watch(activeSlug, () => {
  userExpanded.value = false
})

// Clear legendHoverSlug whenever the legend list collapses. The list (v-else)
// unmounts on collapse before its rows can fire @mouseleave/@blur, so without
// this the last-hovered slug stays set and paints a ghost hover glow +
// typewriter label on the map with the pointer nowhere near it — most visibly
// after Overview/Back nulls activeSlug (the map hover-layer gate
// slug !== activeSlug passes again at activeSlug=null). Covers the dock,
// Overview/Back, and viewport-shrink collapse paths in one rule.
watch(shouldCollapse, (collapsed) => {
  if (collapsed) legendHoverSlug.value = null
})

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

// --- Country-switch choreography --------------------------------------------
// The country-name carousel (AseanCountrySwitcher) owns the name transition
// (slide), replacing the old name typewriter. On a switch the hero number
// scrambles, the large flag panel flips, and the paragraph cross-fade stays
// declarative on the `activeSlug` key — all in sync with the map re-zoom.
const { displayText: heroValue, play: playHero, set: setHero } = useScramble()

// --- Flag 3D flip (reactivated, now a large panel beside the tabs/hero) ------
// CardFlip shows `front` when flagFlipped=false, `back` when true. Each switch is
// ONE 180° rotation: drop the incoming flag onto the currently-hidden face, then
// flip to it. No snap back to a "home" orientation (that snap was a second
// animated rotation — the double-spin), so the direction simply alternates each
// switch. CardFlip cross-fades under reduced motion. First open shows flagFront.
const FLAG_FLIP_MS = 700
const flagFront = ref('')
const flagBack = ref('')
const flagFlipped = ref(false)

function flipFlagTo(nextUrl: string) {
  if (flagFlipped.value) {
    flagFront.value = nextUrl
    flagFlipped.value = false
  } else {
    flagBack.value = nextUrl
    flagFlipped.value = true
  }
}

// Single orchestrator (immediate, so first open seeds the settled values).
// - country<->country switch: scramble the hero number + flip the flag (paragraph
//   cross-fade is declarative via <Transition> keyed on activeSlug, in sync).
// - first open / re-seed: set the hero + flag with no animation (panel-rise
//   entrance unchanged). - deselect (!next): leave values for the leave anim.
watch(
  activeSlug,
  (next, prev) => {
    if (!next) return
    const profile = profileBySlug(next)
    if (!profile) return
    if (prev && prev !== next) {
      playHero(profile.hero.value)
      flipFlagTo(profile.flagUrl)
    } else {
      setHero(profile.hero.value)
      flagFront.value = profile.flagUrl
      flagFlipped.value = false
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
      :external-hover-slug="legendHoverSlug"
      :suppress-active-label="true"
      @update:active-slug="onActiveSlugUpdate"
    />

    <!-- Floating country legend (BF-76 A1/A2): left-edge over the ocean. Lists
         all 11 countries (incl. the hard-to-click ones) + an Overview entry to
         return to the full map. Collapses to a pill when it would overlap land. -->
    <!-- Idle-only: once a country is docked, switching happens via the top
         country-title carousel, so the vertical legend would be redundant (and
         its expanded list overlaps the carousel). Back-to-map is the pill below. -->
    <AseanLegend
      v-if="!activeProfile"
      :active-slug="activeSlug"
      :collapsed="shouldCollapse"
      @select="onActiveSlugUpdate"
      @overview="onActiveSlugUpdate(null)"
      @hover="legendHoverSlug = $event"
      @expand="userExpanded = true"
    />

    <!-- Back to full map (focused state). Nulls activeSlug → restores the idle
         calibrated frame in AseanMap. Replaces the old in-sidebar back button. -->
    <Transition name="intro-fade">
      <button
        v-if="activeProfile"
        type="button"
        class="asean-infographic__backmap"
        @click="onActiveSlugUpdate(null)"
      >
        <span class="asean-infographic__backmap-glyph" aria-hidden="true">←</span>
        Full map
      </button>
    </Transition>

    <!-- Focused-state country switcher (BF-76 follow-up): a horizontal carousel
         of country titles across the top. The active country is the large title;
         clicking a neighbour docks it. Replaces the flag + typed-name identity. -->
    <Transition name="intro-fade">
      <AseanCountrySwitcher
        v-if="activeProfile"
        :active-slug="activeSlug ?? ''"
        @select="onActiveSlugUpdate"
      />
    </Transition>

    <!-- Idle intro: top-right quadrant. Infographic title + subtitle + blurb,
         shown only when no country is selected. -->
    <Transition name="intro-fade">
      <header v-if="!activeSlug" class="asean-infographic__intro">
        <h1 class="asean-infographic__intro-title">ASEAN<span class="asean-infographic__intro-title-sub">Pivot of the Indo-Pacific</span></h1>
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
        <!-- Top block: tabs + hero on the left, the large flag panel on the
             right. The flag is top-aligned with the tabs and spans down past the
             hero number + sub-heading — the country identity, reactivated and
             enlarged now that the name lives in the top carousel. -->
        <div class="asean-infographic__top">
          <div class="asean-infographic__top-main">
            <header class="asean-infographic__title">
              <!-- Real WAI-ARIA tablist (Description | Trade | Green Transition).
                   Roving tabindex + arrow/Home/End follow the APG model. -->
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

            <!-- Hero big-number + label. Shown only on the Description tab; the
                 narrative paragraph is the Description tabpanel below. -->
            <div v-show="tab === 'description'" class="asean-infographic__title-hero">
              <span class="asean-infographic__title-hero-value">
                {{ heroValue }}
              </span>
              <span class="asean-infographic__title-hero-label">
                {{ activeProfile.hero.label }}
              </span>
            </div>
          </div>

          <!-- Flag panel (reactivated). Flips on country switch via CardFlip; the
               faces stretch to the fixed box. Decorative — alt names the country. -->
          <div class="asean-infographic__flag" aria-hidden="true">
            <CardFlip :flipped="flagFlipped" :duration-ms="FLAG_FLIP_MS">
              <template #front>
                <img :src="flagFront" :alt="`Flag of ${activeProfile.name}`" class="asean-infographic__flag-img" />
              </template>
              <template #back>
                <img :src="flagBack" alt="" class="asean-infographic__flag-img" />
              </template>
            </CardFlip>
          </div>
        </div>

        <!-- Description tabpanel: the narrative paragraph. -->
        <section
          v-show="tab === 'description'"
          id="asean-tabpanel-description"
          role="tabpanel"
          aria-labelledby="asean-tab-description"
          class="asean-infographic__tabpanel"
        >
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

/* Tier 1: "ASEAN" — largest, boldest. */
.asean-infographic__intro-title {
  margin: 0;
  font-size: clamp(2.6rem, 4.2vw, 4.6rem);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: #fff;
}

/* Tier 2: "Pivot of the Indo-Pacific" — line break, smaller than ASEAN,
   larger than the subtitle. */
.asean-infographic__intro-title-sub {
  display: block;
  margin-top: 0.1em;
  font-size: clamp(1.3rem, 2vw, 2.1rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: rgba(255, 255, 255, 0.9);
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
  /* Top padding clears the country-title carousel pinned across the top. */
  padding: clamp(104px, 15vh, 150px) clamp(20px, 2vw, 32px) clamp(20px, 3vh, 40px);
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

/* Back-to-full-map control (focused state). Glass pill bottom-left over the
   ocean, clear of the right-hand sidebar. Matches the idle Legend pill. */
.asean-infographic__backmap {
  position: absolute;
  bottom: clamp(16px, 4vh, 40px);
  left: clamp(12px, 1.5vw, 28px);
  z-index: 25;
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px 9px 13px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(2, 38, 64, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Encode Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.15s ease, color 0.15s ease;
}

.asean-infographic__backmap:hover {
  background: rgba(2, 38, 64, 0.7);
  color: #fff;
}

.asean-infographic__backmap:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 1px;
}

.asean-infographic__backmap-glyph {
  font-size: 15px;
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .asean-infographic__backmap {
    transition: none;
  }
}

/* Top block: tabs + hero (left) beside the flag panel (right). align-items
   flex-start so the flag's top lines up with the tabs' top. */
.asean-infographic__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: clamp(12px, 1.5vw, 24px);
}

.asean-infographic__top-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vh, 24px);
}

/* Flag panel (reactivated): right of the tabs/hero, top-aligned. Decorative
   (pointer-events off so the map stays clickable). No explicit size — fits to
   the flag image's natural dimensions. */
.asean-infographic__flag {
  flex: 0 0 auto;
  pointer-events: none;
}

.asean-infographic__flag-img {
  display: block;
  border-radius: 6px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.15),
    0 6px 18px rgba(0, 0, 0, 0.45);
}

/* Header inside the sidebar (no card chrome). Holds only the tablist. */
.asean-infographic__title {
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: rgba(255, 255, 255, 0.92);
  font-family: 'Encode Sans', sans-serif;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
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
