<script setup lang="ts">
import { onScopeDispose } from 'vue'
import type { Strait, StraitHistoricalEntry } from '~/types/strait'
import { fmtUsd, fmtNum, computeVesselSegments } from '~/utils/straitFormatters'
import { getAdjacentStrait } from '~/utils/straitsData'
import { useStraitTransition } from '~/composables/useStraitTransition'
import { useSwipeNavigation, isSwipeNavigation, setSwipeNavigation } from '~/composables/useSwipeNavigation'

const props = defineProps<{
  strait: Strait
  historical: Record<string, StraitHistoricalEntry>
  year: string
}>()

const yearData = computed(() => props.historical[props.year])

const vesselSegments = computed(() => {
  const d = yearData.value
  if (!d) return []
  return computeVesselSegments(d.vessels)
})

// --- Shared element transition ---
const { playForward, playReverse, transitionState } = useStraitTransition()

// Computed CSS class map for staggered content fade-in (cached per state change)
const contentClassMap = computed(() => {
  const isAnimatingForward = transitionState.value === 'animating-forward' || transitionState.value === 'capturing'
  const isAnimatingBack = transitionState.value === 'animating-back'
  const delays = [0, 1, 2, 3, 4] as const
  return Object.fromEntries(
    delays.map(delay => [
      delay,
      [
        'strait-transition-content',
        isAnimatingForward ? 'strait-transition-content--hidden' : '',
        isAnimatingBack ? 'strait-transition-content--exit' : '',
        `strait-transition-content--delay-${delay}`,
      ].filter(Boolean),
    ])
  ) as Record<number, string[]>
})

async function handleBack() {
  await playReverse()
  navigateTo('/infographics/straits')
}

// --- Swipe navigation ---
const detailRef = ref<HTMLElement | null>(null)

useSwipeNavigation(detailRef, {
  onSwipe(direction) {
    const target = getAdjacentStrait(
      props.strait.id,
      direction === 'left' ? 'next' : 'prev'
    )
    if (target) {
      // Remove the dummy history entry's straitTransition marker before navigating,
      // but preserve a non-null state to avoid race with popstate handler
      history.replaceState({ swipeNavigating: true }, '')
      navigateTo(`/infographics/straits/${target.id}`, { replace: true })
    }
  }
})

// --- Responsive hero circle ---
const heroCircleRef = ref<HTMLElement | null>(null)

/** Synchronous initial calc to avoid flash on first paint (SSR-safe).
 *  Subtracts 2rem (32px) of parent padding to approximate the actual container width. */
const heroRadius = ref(
  import.meta.client
    ? Math.round(Math.min((window.innerWidth - 32) * 0.65, 288) / 2)
    : 144
)

let resizeRafId: number | null = null

onMounted(() => {
  if (!heroCircleRef.value) return
  let latestEntry: ResizeObserverEntry | null = null
  const ro = new ResizeObserver(([entry]) => {
    latestEntry = entry
    if (resizeRafId !== null) return // RAF gate – coalesces to latest
    resizeRafId = requestAnimationFrame(() => {
      resizeRafId = null
      if (latestEntry) {
        heroRadius.value = Math.round(latestEntry.contentRect.width / 2)
        latestEntry = null
      }
    })
  })
  ro.observe(heroCircleRef.value)

  // Trigger the FLIP forward animation after hero circle settles
  if (heroCircleRef.value) {
    playForward(heroCircleRef.value)
  }

  // Push dummy history entry for back-button interception.
  // Skip on swipe re-mounts to avoid stacking phantom entries.
  if (isSwipeNavigation()) {
    setSwipeNavigation(false)
  } else {
    history.pushState({ straitTransition: true }, '')
  }
  const handlePopstate = async (e: PopStateEvent) => {
    if (e.state?.straitTransition !== undefined) {
      // Our dummy entry was popped — play reverse then navigate
      await playReverse()
      navigateTo('/infographics/straits')
    }
  }
  window.addEventListener('popstate', handlePopstate)

  onScopeDispose(() => {
    ro.disconnect()
    window.removeEventListener('popstate', handlePopstate)
    if (resizeRafId !== null) {
      cancelAnimationFrame(resizeRafId)
      resizeRafId = null
    }
  })
})

// --- Global share percentage extraction ---
const globalSharePct = computed(() => {
  if (!props.strait.globalShareLabel) return null
  const match = props.strait.globalShareLabel.match(/~?[\d.\p{Dash_Punctuation}]+%/u)
  return match ? match[0] : props.strait.globalShareLabel
})

// --- Conditional divider ---
const hasQualContent = computed(() =>
  !!props.strait.description ||
  props.strait.topIndustries.length > 0 ||
  props.strait.threats.length > 0 ||
  props.strait.keyFacts.length > 0
)
</script>

<template>
  <div
    ref="detailRef"
    class="strait-mobile-detail"
    :aria-busy="transitionState === 'animating-forward' || transitionState === 'animating-back'"
  >
    <!-- Screen reader announcement for swipe navigation -->
    <div class="visually-hidden" aria-live="polite" aria-atomic="true">
      Now viewing: {{ strait.name }}
    </div>

    <!-- Sticky back bar -->
    <nav :class="contentClassMap[0]" class="strait-mobile-detail__nav" aria-label="Back navigation">
      <button
        class="strait-mobile-detail__back"
        aria-label="Back to strait list"
        @click="handleBack"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M12.5 15l-5-5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        All Straits
      </button>
    </nav>

    <!-- Hero section -->
    <section class="strait-mobile-detail__hero" aria-label="Strait overview">
      <div ref="heroCircleRef" class="strait-mobile-detail__hero-circle">
        <StraitCircle
          :radius="heroRadius"
          :color="{ h: 0, s: 0, l: 100 }"
          :active="false"
          :image-url="strait.imageUrl"
          :strait-id="strait.id"
          :year="year"
          :selected="true"
        />
      </div>
      <h1 :class="contentClassMap[1]" class="strait-mobile-detail__name">{{ strait.name }}</h1>
      <p :class="contentClassMap[2]" class="strait-mobile-detail__share">{{ strait.globalShareLabel }}</p>
    </section>

    <!-- Qualitative content: Description -->
    <p v-if="strait.description" :class="contentClassMap[3]" class="strait-mobile-detail__desc">
      {{ strait.description }}
    </p>

    <!-- Qualitative content: Top Industries -->
    <section v-if="strait.topIndustries.length" :class="contentClassMap[3]" class="strait-mobile-detail__section" aria-label="Top industries">
      <h2 class="strait-mobile-detail__section-title">Top Industries</h2>
      <div class="strait-mobile-detail__tags">
        <span v-for="ind in strait.topIndustries" :key="ind" class="strait-mobile-detail__tag">{{ ind }}</span>
      </div>
    </section>

    <!-- Qualitative content: Threats -->
    <section v-if="strait.threats.length" :class="contentClassMap[3]" class="strait-mobile-detail__section" aria-label="Threats">
      <h2 class="strait-mobile-detail__section-title">Threats</h2>
      <div class="strait-mobile-detail__tags">
        <span v-for="threat in strait.threats" :key="threat" class="strait-mobile-detail__tag strait-mobile-detail__tag--threat">{{ threat }}</span>
      </div>
    </section>

    <!-- Qualitative content: Key Facts -->
    <section v-if="strait.keyFacts.length" :class="contentClassMap[3]" class="strait-mobile-detail__section" aria-label="Key facts">
      <h2 class="strait-mobile-detail__section-title">Key Facts</h2>
      <ul class="strait-mobile-detail__facts">
        <li v-for="fact in strait.keyFacts" :key="fact">{{ fact }}</li>
      </ul>
    </section>

    <!-- Divider between qualitative and quantitative sections -->
    <hr
      v-if="hasQualContent"
      class="strait-mobile-detail__divider"
      role="separator"
    />

    <!-- Quantitative content: Trade value hero stat -->
    <section :class="contentClassMap[4]" class="strait-mobile-detail__hero-stat" aria-label="Trade value">
      <span class="strait-mobile-detail__hero-value">{{ fmtUsd(strait.valueUSD) }}</span>
      <span class="strait-mobile-detail__hero-label">Annual trade value</span>
    </section>

    <!-- Quantitative content: Key metrics row -->
    <section v-if="yearData" :class="contentClassMap[4]" class="strait-mobile-detail__metrics" aria-label="Key metrics">
      <div v-if="strait.oilMbpd != null" class="strait-mobile-detail__metric">
        <span class="strait-mobile-detail__metric-value">{{ strait.oilMbpd }}</span>
        <span class="strait-mobile-detail__metric-label">Oil mb/d</span>
      </div>
      <div v-if="strait.lngBcfd != null" class="strait-mobile-detail__metric">
        <span class="strait-mobile-detail__metric-value">{{ strait.lngBcfd }}</span>
        <span class="strait-mobile-detail__metric-label">LNG bcf/d</span>
      </div>
      <div class="strait-mobile-detail__metric">
        <span class="strait-mobile-detail__metric-value">{{ fmtNum(yearData.capacityMt) }}</span>
        <span class="strait-mobile-detail__metric-label">Cargo Mt</span>
      </div>
      <div class="strait-mobile-detail__metric">
        <span class="strait-mobile-detail__metric-value">{{ fmtNum(yearData.vessels.total) }}</span>
        <span class="strait-mobile-detail__metric-label">Vessels</span>
      </div>
      <div v-if="globalSharePct" class="strait-mobile-detail__metric">
        <span class="strait-mobile-detail__metric-value">{{ globalSharePct }}</span>
        <span class="strait-mobile-detail__metric-label">Global share</span>
      </div>
    </section>

    <!-- Quantitative content: Vessel breakdown bar -->
    <section v-if="vesselSegments.length" :class="contentClassMap[4]" class="strait-mobile-detail__section" aria-label="Vessel breakdown">
      <h2 class="strait-mobile-detail__section-title">Vessel Breakdown</h2>
      <div class="stacked-bar">
        <div class="stacked-bar__track">
          <div
            v-for="seg in vesselSegments"
            :key="seg.key"
            class="stacked-bar__segment"
            :style="{ width: seg.pct + '%', background: seg.color }"
          >
            <span v-if="seg.pct > 15" class="stacked-bar__value">{{ Math.round(seg.pct) }}%</span>
          </div>
        </div>
        <div class="stacked-bar__legend">
          <span v-for="seg in vesselSegments" :key="seg.key" class="stacked-bar__legend-item">
            <span class="stacked-bar__dot" :style="{ background: seg.color }" />
            {{ seg.label }} <span class="stacked-bar__legend-count">{{ fmtNum(seg.value) }}</span>
          </span>
        </div>
      </div>
    </section>

    <!-- Quantitative content: Historical trend chart -->
    <section v-if="Object.keys(historical).length > 1" :class="contentClassMap[4]" class="strait-mobile-detail__section" aria-label="Historical trends">
      <StraitHistoryChart :historical="historical" :width="320" :height="180" />
    </section>
  </div>
</template>

<style scoped>
.strait-mobile-detail {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 0 1rem 3rem;
  color: var(--color-text-secondary);
  font-family: 'Encode Sans', sans-serif;
}

/* --- Sticky back nav --- */
.strait-mobile-detail__nav {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12px 0;
  background: linear-gradient(to bottom, rgba(13, 13, 13, 0.95) 60%, rgba(13, 13, 13, 0));
}

.strait-mobile-detail__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 12px 8px 8px;
  border: none;
  border-radius: 8px;
  background: none;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.strait-mobile-detail__back:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.06);
}

.strait-mobile-detail__back:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

/* --- Hero --- */
.strait-mobile-detail__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0 1.5rem;
}

.strait-mobile-detail__hero-circle {
  width: clamp(160px, 65vw, 288px);
  aspect-ratio: 1;
  margin-bottom: 1.25rem;
}

/* Let StraitCircle fill the parent container instead of using its own --diameter */
.strait-mobile-detail__hero-circle :deep(.strait-circle) {
  width: 100%;
  height: 100%;
}

.strait-mobile-detail__name {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px;
  text-align: center;
  letter-spacing: -0.02em;
}

.strait-mobile-detail__share {
  font-size: 14px;
  color: var(--color-accent);
  font-weight: 500;
  margin: 0;
  text-align: center;
}

/* --- Hero stat --- */
.strait-mobile-detail__hero-stat {
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}

.strait-mobile-detail__hero-value {
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.strait-mobile-detail__hero-label {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-top: 6px;
}

/* --- Key metrics --- */
.strait-mobile-detail__metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  margin-bottom: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.strait-mobile-detail__metric {
  display: flex;
  flex-direction: column;
  padding: 14px 0;
}

.strait-mobile-detail__metric:nth-child(odd) {
  padding-right: 14px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.strait-mobile-detail__metric:nth-child(even) {
  padding-left: 14px;
}

.strait-mobile-detail__metric:nth-child(-n+2) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.strait-mobile-detail__metric-value {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.strait-mobile-detail__metric-label {
  font-size: 9px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 3px;
}

/* --- Description --- */
.strait-mobile-detail__desc {
  margin: 0 0 20px;
  padding-bottom: 20px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  line-height: 1.7;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* --- Divider between qual and quant sections --- */
.strait-mobile-detail__divider {
  border: none;
  height: 1px;
  background: #fff;
  opacity: 0.6;
  margin: 0 0 24px;
}

/* --- Sections --- */
.strait-mobile-detail__section {
  margin-bottom: 20px;
}

.strait-mobile-detail__section-title {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 10px;
}

/* --- Tags --- */
.strait-mobile-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.strait-mobile-detail__tag {
  padding: 5px 11px;
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0;
  white-space: nowrap;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.strait-mobile-detail__tag--threat {
  color: hsl(348, 80%, 72%);
  border-color: hsla(348, 60%, 55%, 0.3);
}

/* --- Key facts --- */
.strait-mobile-detail__facts {
  margin: 0;
  padding: 0;
  list-style: none;
}

.strait-mobile-detail__facts li {
  position: relative;
  padding-left: 14px;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  line-height: 1.6;
}

.strait-mobile-detail__facts li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 6px;
  height: 1px;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.35);
}

/* Stacked bar styles now live in public/styles.css */

@media (prefers-reduced-motion: reduce) {
  .strait-mobile-detail__back {
    transition: none;
  }
}
</style>
