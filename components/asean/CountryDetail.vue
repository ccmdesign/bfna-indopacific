<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { profileBySlug } from '~/data/asean/country-profiles'
import { tradeStackedBySlug } from '~/data/asean/trade-stacked'
import { MINERALS_BY_SLUG } from '~/data/asean/minerals.generated'
import { CRM_NOTES_BY_SLUG } from '~/data/asean/critical-minerals-notes'

// BF-129: extracted verbatim from AseanInfographic's focused sidebar. This
// component owns the whole country-detail view (tabs + panels + charts) for a
// single country, driven by one `slug` prop; it resolves its own profile /
// trade / minerals slices and owns its tab state internally, so it can be
// mounted standalone (the mobile detail page in sub 2 depends on that). The
// parent keeps only the map-chrome and the pointer-events:none sidebar wrapper.
const props = defineProps<{
  slug: string | null
}>()

const profile = computed(() => (props.slug ? profileBySlug(props.slug) : undefined))

const tradeStacked = computed(() =>
  props.slug ? tradeStackedBySlug[props.slug] : undefined
)

// Critical-minerals slice for the active country. Mirrors tradeStacked so map
// selection + layer flip update the minerals faces exactly like trade.
// MINERALS_BY_SLUG carries a record for every wired slug (the 3 low-data
// countries carry hasMaterialData:false; the components render the designed
// honest state, not a blank).
const minerals = computed(() =>
  props.slug ? MINERALS_BY_SLUG[props.slug] : undefined
)

// Card A (world-share bars) keeps its own data gate: some slugs have no
// minerals record at all (e.g. Timor-Leste — absent from USGS MCS2026
// world-share production AND the nickel-chain flows), so Card A hides on the
// Critical Minerals tab rather than flip to an empty face. Countries with a
// hasMaterialData:false stub are NOT hidden — CountryMineralShareBars
// renders its own designed low-data state for those (untouched by BF-97).
const showMineralShareCard = computed(
  () => tab.value !== 'minerals' || !!minerals.value
)

// Card B ("Where the nickel goes") — BF-97 Feedback 2: the nickel flow chart
// stays only where it's meaningful; the other seven countries get a
// client-authored CRM fact box instead. This is a fixed editorial split, not
// a data-driven one (Thailand/Laos/Myanmar have real flow data but still move
// to the box), so it's gated on a fixed slug set rather than hasMaterialData.
const NICKEL_CHART_SLUGS = new Set(['indonesia', 'malaysia', 'vietnam', 'philippines'])
const showsNickelChart = computed(
  () => !!props.slug && NICKEL_CHART_SLUGS.has(props.slug)
)

// BF-133 (closes BF-111): the nickel-flow card copy carries the chart's basis
// (all nickel-class exports BY VALUE), and for the Philippines additionally
// states the client-adopted headline figure — 87% of nickel-ORE exports to
// China BY VOLUME (Heinrich Böll Stiftung) — so the two bases can't be
// confused with the chart's ~72%-by-value China share. The chart itself stays
// internally consistent by value (see docs/plans/BF-133-plan.md).
const NICKEL_META_BASE =
  'All nickel-class exports by value — ore, matte, oxide sinter, refined'
const nickelFlowMeta = computed(() =>
  props.slug === 'philippines'
    ? `${NICKEL_META_BASE}. By volume, 87% of nickel-ore exports go to China (Böll, 2024).`
    : NICKEL_META_BASE
)
const nickelFlowSource = computed(() =>
  props.slug === 'philippines'
    ? 'BACI HS07 V202601 (mineral HS6 codes), 2024; ore-export share: Heinrich Böll Stiftung Southeast Asia, 2026'
    : 'BACI HS07 V202601 (mineral HS6 codes), 2024'
)
const crmNote = computed(() =>
  props.slug ? CRM_NOTES_BY_SLUG[props.slug] : undefined
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
</script>

<template>
  <div v-if="profile" class="country-detail">
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
           slug so a country switch fades the old text out then the
           new in (~500 ms). Reduced-motion is handled in the desc-fade @media.

           R10 NOTE — hidden-tab behavior: this <p> sits inside the v-show
           Description section, so when slug changes while the user is
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
        <div :key="slug" class="asean-infographic__prose">
          <p class="asean-infographic__title-paragraph">{{ profile.paragraphs.description }}</p>
          <p class="asean-infographic__source">Source: {{ profile.sources.description }}</p>
          <CountryKeyFacts :key-facts="profile.keyFacts" />
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
           Trade<->Minerals tab change (keyed on slug + tab). -->
      <Transition name="desc-fade" mode="out-in">
        <div :key="`${slug}-${tab}`" class="asean-infographic__prose asean-infographic__prose--charts">
          <p class="asean-infographic__title-paragraph">
            {{ tab === 'trade' ? profile.paragraphs.trade : profile.paragraphs.minerals }}
          </p>
          <p class="asean-infographic__source">
            Source: {{ tab === 'trade' ? profile.sources.trade : profile.sources.minerals }}
          </p>
          <!-- BF-133 (decided BF-86): China/US/EU trade figures side by side
               on every country page — "$142.6B China / $41.6B US / $28.8B EU",
               latest BACI year, Trade tab only. Lives inside the keyed prose
               block so it cross-fades with the paragraph on country/tab
               switches. -->
          <CountryTradePartnersRow
            v-if="tab === 'trade' && tradeStacked"
            :data="tradeStacked"
          />
        </div>
      </Transition>

      <!-- Tornado bars: indicative top exports & imports (front) / share of
           world mine production (back). Hidden on the Minerals tab when the
           country has no minerals record at all (Timor-Leste). -->
      <div v-show="showMineralShareCard" class="asean-infographic__panel">
        <CardFlip :flipped="tab === 'minerals'">
          <template #front>
            <CountryChartCard
              eyebrow="Indicative composition"
              title="Top exports & imports"
              meta="Estimated value of leading export and import categories, in USD billions. Source: indicative, not individually sourced."
              source="indicative — not individually sourced"
            >
              <CountryTradeBalanceBars
                :key="`${slug}-${tab}`"
                :profile="profile"
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
                v-if="minerals"
                :key="`${slug}-${tab}`"
                :data="minerals"
                :height="200"
              />
            </CountryChartCard>
          </template>
        </CardFlip>
      </div>

      <!-- Stacked area: trade flows with the US, China, EU since 2010 (front)
           / nickel flow chart or CRM fact box (back) — BF-97: the chart
           stays only for Indonesia, Malaysia, Vietnam, Philippines
           (showsNickelChart); the other seven countries render a
           client-authored CRM box in the same slot instead (crmNote). -->
      <div v-if="tradeStacked" class="asean-infographic__panel">
        <CardFlip :flipped="tab === 'minerals'">
          <template #front>
            <CountryChartCard
              eyebrow="Trade flows"
              title="Share of top-six commodity trade held by China, US, and EU"
              meta="Share held by China, the U.S. and the EU · 2010–2024 · Source: CEPII BACI"
              :source="tradeStacked.source"
            >
              <CountryStackedArea
                :key="`${slug}-${tab}`"
                :data="tradeStacked"
                :partners="CHART_PARTNERS"
                :height="200"
              />
            </CountryChartCard>
          </template>
          <template #back>
            <!-- Scope caption (BF-97, extended by BF-133): the chart covers
                 all nickel-class exports by value (ore, matte, oxide sinter,
                 refined) — stated here so the % figure isn't conflated with
                 ore-only figures from other sources. For the Philippines the
                 meta additionally carries the client-adopted 87% ore-to-China
                 by-volume figure (Böll) with its basis spelled out. -->
            <CountryChartCard
              v-if="showsNickelChart"
              eyebrow="Mineral flows"
              title="Where the nickel goes · 2024"
              :meta="nickelFlowMeta"
              :source="nickelFlowSource"
            >
              <CountryMineralFlowBand
                v-if="minerals"
                :key="`${slug}-${tab}`"
                :data="minerals"
                :height="200"
              />
            </CountryChartCard>
            <CountryChartCard
              v-else-if="crmNote"
              eyebrow="Critical minerals"
              :title="crmNote.leadIn"
              :source="crmNote.source"
            >
              <CountryCrmBox :key="slug" :note="crmNote" />
            </CountryChartCard>
          </template>
        </CardFlip>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Root wrapper (BF-129): reproduces the flex column + gap the focused sidebar
   <aside> used to apply directly to .asean-infographic__top and the two
   tabpanels, so spacing is unchanged now that they live one level deeper. The
   wrapper stays pointer-events-inherited (the parent aside is
   pointer-events:none so the map stays clickable); only .asean-infographic__tabs
   and .asean-infographic__panel opt back in below, exactly as before. */
.country-detail {
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vh, 24px);
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

/* --- Description paragraph cross-fade (BF-72 U5/R10) --- */
/* out-in: the old paragraph fades out (~250ms), then the new fades in (~250ms),
   keyed on slug — reads as a ~500ms cross-fade in sync with the other
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
