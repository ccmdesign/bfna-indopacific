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
// so map selection + layer flip update the minerals faces exactly like trade.
// MINERALS_BY_SLUG carries a record for every wired slug (the 3 low-data
// countries carry hasMaterialData:false; the components render the designed
// honest state, not a blank).
const activeMinerals = computed(() =>
  activeSlug.value ? MINERALS_BY_SLUG[activeSlug.value] : undefined
)

// Some slugs have no minerals record at all (e.g. Timor-Leste — absent from
// USGS MCS2026 world-share production AND the nickel-chain flows, so both chart
// faces render empty). On the Critical Minerals tab, swap those empty cards for
// an honest null state. Countries with a hasMaterialData:false stub are NOT
// null — their components render the designed low-data state.
const mineralsNullState = computed(
  () => tab.value === 'minerals' && !activeMinerals.value
)

// Tab = the single source of truth for the focused sidebar view (BF-72 U3).
// "description" (default) shows the narrative paragraph + Key Facts (BF-96);
// "trade" / "minerals" show the two chart cards, with the Trade<->Minerals flip
// preserved via :flipped="tab === 'minerals'" on both CardFlips.
//
// NOTE: this intentionally REVERSES BF-71 commit 84d0274, which demoted the
// chart toggle to an aria-pressed group. BF-72 restores a real WAI-ARIA
// tablist (Description | Trade | Critical Minerals) by design (R1/R2).
// BF-81 renamed the third tab value 'green' -> 'minerals' and its label
// "Green Transition" -> "Critical Minerals".
type Tab = 'description' | 'trade' | 'minerals'
const TAB_ORDER: Tab[] = ['description', 'trade', 'minerals']
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

// Trade + Minerals deliberately share ONE tabpanel (#asean-tabpanel-charts):
// both render the same two CardFlips flipped in unison, so a shared-panel APG
// variation is the right fit rather than duplicating the markup into two
// panels. Its `aria-labelledby` must name the *active* chart tab — and must be
// dropped entirely when neither chart tab is active (Description tab), so the
// hidden charts panel is never stale-labelled by the Trade tab. Returning
// undefined makes Vue omit the attribute.
const chartsPanelLabelledBy = computed(() =>
  tab.value === 'trade' || tab.value === 'minerals' ? `asean-tab-${tab.value}` : undefined
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
// (slide); the large flag panel flips and the paragraph cross-fade stays
// declarative on the `activeSlug` key — all in sync with the map re-zoom.
// (The hero big-number that used to scramble here — two-way trade with China
// — was removed per BF-96; see CountryKeyFacts for its Description-tab
// replacement.)
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

    <!-- Focused-state country switcher (BF-76 follow-up): a horizontal carousel
         of country titles across the top. The active country is the large title;
         clicking a neighbour docks it. Replaces the flag + typed-name identity. -->
    <Transition name="intro-fade">
      <AseanCountrySwitcher
        v-if="activeProfile"
        :active-slug="activeSlug ?? ''"
        :flag-url="activeProfile.flagUrl"
        @select="onActiveSlugUpdate"
      />
    </Transition>

    <!-- Idle sidebar: the intro block (title + subtitle + blurb) and the country
         legend, grouped in one fixed right-side column and stacked. Shown only
         when no country is docked. The map stays clickable through the gaps
         (sidebar is pointer-events:none; the legend opts its buttons back in). -->
    <Transition name="intro-fade">
      <div v-if="!activeSlug" class="asean-infographic__idle">
        <header class="asean-infographic__intro">
          <h1 class="asean-infographic__intro-title">ASEAN<span class="asean-infographic__intro-title-sub">The Strategic Pivot of the Indo-Pacific</span></h1>
          <p class="asean-infographic__intro-subtitle">
            Trade, Power and Critical Mineral Supply Chains in an Era of Great Power Competition
          </p>
          <p class="asean-infographic__intro-blurb">
            Select a country and examine its trade with the U.S., China and the EU since 2010,
            and its role in critical mineral supply chains.
          </p>
        </header>

        <AseanLegend
          :active-slug="activeSlug"
          :collapsed="shouldCollapse"
          @select="onActiveSlugUpdate"
          @overview="onActiveSlugUpdate(null)"
          @hover="legendHoverSlug = $event"
          @expand="userExpanded = true"
        />
      </div>
    </Transition>

    <!-- Focused-state right sidebar. Selecting a country stacks the identity
         (flag + name) and a 3-tab tablist above the active tabpanel: Description
         (narrative + Key Facts) or the two chart cards (Trade / Critical
         Minerals) — in a single right-hand column. The map keeps the rest of
         the viewport with the country docked top-left. The sidebar is
         pointer-events:none (map stays clickable through it); only the tabs
         and the chart cards opt back in. -->
    <Transition name="panel-rise">
      <aside v-if="activeProfile" class="asean-infographic__sidebar">
        <!-- Identity: flag + name only. Narrative + Key Facts moved into the
             Description tabpanel below (BF-72 U3/R4; BF-96). Flag + name stay
             always-visible and animate on country switch (U4/U5). -->
        <!-- Top block: tabs on the left, the large flag panel on the right.
             The flag is top-aligned with the tabs — the country identity,
             reactivated and enlarged now that the name lives in the top
             carousel. -->
        <div class="asean-infographic__top">
          <div class="asean-infographic__top-main">
            <header class="asean-infographic__title">
              <!-- Real WAI-ARIA tablist (Description | Trade | Critical Minerals).
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
                  {{ t === 'description' ? 'Description' : t === 'trade' ? 'Trade' : 'Critical Minerals' }}
                </button>
              </div>
            </header>
          </div>
        </div>

        <!-- Description tabpanel: the narrative paragraph + Key Facts (BF-96). -->
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
          <!-- Key Facts (BF-96): 4 economic indicators + 3 trade-agreement rows,
               replacing the removed hero big-number. Lives in the same keyed
               div as the paragraph so both cross-fade together on a country
               switch. -->
          <Transition name="desc-fade" mode="out-in">
            <div :key="activeSlug" class="asean-infographic__prose">
              <p class="asean-infographic__title-paragraph">{{ activeProfile.paragraphs.description }}</p>
              <p class="asean-infographic__source">Source: {{ activeProfile.sources.description }}</p>
              <CountryKeyFacts :key-facts="activeProfile.keyFacts" />
            </div>
          </Transition>
        </section>

        <!-- Trade / Critical Minerals tabpanel: per-tab prose + the two chart
             cards. Shown for trade|minerals, hidden on the Description tab. Both
             CardFlips flip in unison via :flipped="tab === 'minerals'" — the
             Trade<->Minerals flip is unchanged. Trade + Minerals INTENTIONALLY
             share this single tabpanel (same two cards flipped) — a documented
             shared-panel APG variation, not a one-tab-one-panel miss.
             aria-labelledby names whichever chart tab is active and is dropped on
             the Description tab (chartsPanelLabelledBy). The per-tab prose is the
             new element (BF-81) that swaps with the active chart tab. -->
        <section
          v-show="tab === 'trade' || tab === 'minerals'"
          id="asean-tabpanel-charts"
          role="tabpanel"
          :aria-labelledby="chartsPanelLabelledBy"
          class="asean-infographic__tabpanel asean-infographic__tabpanel--charts"
        >
          <!-- Per-tab prose (BF-81): Marshall's Trade / Critical Minerals block
               for the active country, swapping on both country switch and
               Trade<->Minerals tab change (keyed on activeSlug + tab). -->
          <Transition name="desc-fade" mode="out-in">
            <div :key="`${activeSlug}-${tab}`" class="asean-infographic__prose asean-infographic__prose--charts">
              <p class="asean-infographic__title-paragraph">
                {{ tab === 'trade' ? activeProfile.paragraphs.trade : activeProfile.paragraphs.minerals }}
              </p>
              <p class="asean-infographic__source">
                Source: {{ tab === 'trade' ? activeProfile.sources.trade : activeProfile.sources.minerals }}
              </p>
            </div>
          </Transition>

          <!-- Tornado bars: indicative top exports & imports (front) / share of
               world mine production (back). Hidden on the Minerals tab when the
               country has no minerals data (null state below takes over). -->
          <div v-show="!mineralsNullState" class="asean-infographic__panel">
            <CardFlip :flipped="tab === 'minerals'">
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
                  source="USGS MCS2026, 2025"
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
               / mineral flows by destination (back). Hidden on the Minerals tab
               when the country has no minerals data (null state below). -->
          <div v-if="activeTradeStacked" v-show="!mineralsNullState" class="asean-infographic__panel">
            <CardFlip :flipped="tab === 'minerals'">
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
                  source="BACI HS07 V202601 (mineral HS6 codes), 2024"
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

          <!-- Minerals null state (BF follow-up): shown only on the Critical
               Minerals tab for countries with no minerals record at all (e.g.
               Timor-Leste). Replaces the two empty chart cards; the minerals
               prose above still gives the qualitative context. -->
          <div v-if="mineralsNullState" class="asean-infographic__minerals-empty">
            <p class="asean-infographic__minerals-empty-title">Not yet on the critical-minerals map</p>
            <p class="asean-infographic__minerals-empty-body">
              {{ activeProfile.name }} has no world-share mine production or
              nickel-chain trade recorded in the source data (USGS MCS2026 · BACI
              2024) — its reserves remain largely untapped.
            </p>
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
  /* Shared idle-sidebar column width — set by the ASEAN masthead (~3.4x its
     font-size incl. tracking). The intro block and the country legend both use
     it so they align to one left edge and one width. */
  --intro-w: clamp(200px, 28vw, 384px);
}

/* Idle intro — top-right quadrant. Sits on the dark map, no card chrome. */
/* Idle sidebar: the intro block + country legend, grouped and stacked on the
   right. Fixed to the right edge, content-height (top-anchored). Map stays
   clickable through the gaps — pointer-events:none here; the legend re-enables
   its own buttons. Every line shares --intro-w so the whole column is one width. */
.asean-infographic__idle {
  position: fixed;
  top: 0;
  right: 0;
  max-width: 50svw;
  box-sizing: border-box;
  padding: clamp(28px, 5vh, 64px) clamp(24px, 3vw, 56px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: clamp(24px, 5vh, 52px);
  z-index: 20;
  color: rgba(255, 255, 255, 0.92);
  font-family: 'Encode Sans', sans-serif;
  text-align: left;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

/* Intro text block — just the stacked title / subtitle / blurb; positioning and
   padding live on the .asean-infographic__idle sidebar above. */
.asean-infographic__intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}

.asean-infographic__intro-title,
.asean-infographic__intro-subtitle,
.asean-infographic__intro-blurb {
  width: var(--intro-w);
}

/* Tier 1: "ASEAN" — large, thin, airy. A tracked-out Encode Sans Thin display
   treatment (the redesigned masthead), not a bold slab. */
.asean-infographic__intro-title {
  margin: 0;
  font-size: clamp(3.5rem, 8vw, 7rem);
  font-weight: 100;
  line-height: 1.02;
  letter-spacing: 0.05em;
  color: #fff;
}

/* Tier 2: "Pivot of the Indo-Pacific" — line break, smaller than ASEAN,
   larger than the subtitle. ~20px below ASEAN to match the design. */
.asean-infographic__intro-title-sub {
  display: block;
  margin-top: clamp(12px, 1.4vw, 20px);
  font-size: clamp(1.5rem, 2.4vw, 2.125rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: rgba(255, 255, 255, 0.9);
}

.asean-infographic__intro-subtitle {
  margin: 0;
  font-size: clamp(1.125rem, 1.4vw, 1.25rem);
  font-weight: 400;
  line-height: 1.3;
  color: #cbdbf6;
}

.asean-infographic__intro-blurb {
  margin: 4px 0 0;
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
     paragraph + Key Facts and the chart panels more room. */
  width: clamp(340px, 34vw, 600px);
  box-sizing: border-box;
  /* Top padding clears the country-title carousel pinned across the top.
     Bottom padding clears the fixed 4rem footer strip so the last content item
     scrolls fully above the footer's shaded area instead of behind it. */
  padding: clamp(104px, 15vh, 150px) clamp(20px, 2vw, 32px)
    calc(4rem + clamp(20px, 3vh, 40px));
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
  /* Top fade: scrolled content stays fully masked until 12px below the top
     country-name reel, then ramps up to full opacity — so nothing bleeds behind
     that strip. Reel bottom = 52px active line + 2·switcher pad clamp(16,3vh,32);
     the flat transparent band runs to reel-bottom + 12px, then ~40px of fade. */
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(64px + clamp(32px, 6vh, 64px)),
    #000 calc(104px + clamp(32px, 6vh, 64px))
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(64px + clamp(32px, 6vh, 64px)),
    #000 calc(104px + clamp(32px, 6vh, 64px))
  );
}


/* Top block: tabs (left) beside the flag panel (right). align-items
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

.asean-infographic__title-paragraph {
  margin: 0;
  font-size: clamp(13px, 1vw, 14px);
  font-weight: 300;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
}

/* Prose wrapper: paragraph + its source footnote, stacked. Used on all three
   tabs (BF-81) so the keyed cross-fade animates the pair as one unit. */
.asean-infographic__prose {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* On the charts tab the prose sits above the two chart cards (the cards opt
   into pointer events themselves; prose stays click-through to the map). */
.asean-infographic__prose--charts {
  margin-bottom: 2px;
}

/* Per-tab source/year footnote. Mirrors CountryChartCard's chart-card__source
   (small, low-opacity, letter-spaced) so prose attribution reads consistently
   with the chart cards in both light and dark. */
.asean-infographic__source {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.03em;
}

/* --- Tabpanels --- */
/* Description tabpanel: paragraph + Key Facts (BF-96), stacked with the same
   rhythm they had inside the old identity header (inherits the sidebar's
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

/* Minerals null state: a quiet card-height message that stands in for the two
   empty chart cards when a country has no minerals data (e.g. Timor-Leste). */
.asean-infographic__minerals-empty {
  flex: 0 0 auto;
  pointer-events: auto;
  padding: clamp(16px, 2.4vh, 24px);
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.asean-infographic__minerals-empty-title {
  margin: 0 0 6px;
  font-family: 'Encode Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.82);
}

.asean-infographic__minerals-empty-body {
  margin: 0;
  font-family: 'Encode Sans', sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.55);
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
