<script setup lang="ts">
import { onScopeDispose } from 'vue'
import type { Strait, StraitHistoricalEntry } from '~/types/strait'
import { fmtUsd, fmtNum, computeVesselSegments } from '~/utils/straitFormatters'

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

  onScopeDispose(() => {
    ro.disconnect()
    if (resizeRafId !== null) {
      cancelAnimationFrame(resizeRafId)
      resizeRafId = null
    }
  })
})

// --- Global share percentage extraction ---
const globalSharePct = computed(() => {
  if (!props.strait.globalShareLabel) return null
  const match = props.strait.globalShareLabel.match(/~?[\d.–-]+%/)
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
  <div class="strait-mobile-detail">
    <!-- Sticky back bar -->
    <nav class="strait-mobile-detail__nav" aria-label="Back navigation">
      <NuxtLink
        to="/infographics/straits"
        class="strait-mobile-detail__back"
        aria-label="Back to strait list"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M12.5 15l-5-5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        All Straits
      </NuxtLink>
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
      <h1 class="strait-mobile-detail__name">{{ strait.name }}</h1>
      <p class="strait-mobile-detail__share">{{ strait.globalShareLabel }}</p>
    </section>

    <!-- Qualitative content: Description -->
    <p v-if="strait.description" class="strait-mobile-detail__desc">
      {{ strait.description }}
    </p>

    <!-- Qualitative content: Top Industries -->
    <section v-if="strait.topIndustries.length" class="strait-mobile-detail__section" aria-label="Top industries">
      <h2 class="strait-mobile-detail__section-title">Top Industries</h2>
      <div class="strait-mobile-detail__tags">
        <span v-for="ind in strait.topIndustries" :key="ind" class="strait-mobile-detail__tag">{{ ind }}</span>
      </div>
    </section>

    <!-- Qualitative content: Threats -->
    <section v-if="strait.threats.length" class="strait-mobile-detail__section" aria-label="Threats">
      <h2 class="strait-mobile-detail__section-title">Threats</h2>
      <div class="strait-mobile-detail__tags">
        <span v-for="threat in strait.threats" :key="threat" class="strait-mobile-detail__tag strait-mobile-detail__tag--threat">{{ threat }}</span>
      </div>
    </section>

    <!-- Qualitative content: Key Facts -->
    <section v-if="strait.keyFacts.length" class="strait-mobile-detail__section" aria-label="Key facts">
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
    <section class="strait-mobile-detail__hero-stat" aria-label="Trade value">
      <span class="strait-mobile-detail__hero-value">{{ fmtUsd(strait.valueUSD) }}</span>
      <span class="strait-mobile-detail__hero-label">Annual trade value</span>
    </section>

    <!-- Quantitative content: Key metrics row -->
    <section v-if="yearData" class="strait-mobile-detail__metrics" aria-label="Key metrics">
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
    <section v-if="vesselSegments.length" class="strait-mobile-detail__section" aria-label="Vessel breakdown">
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
    <section v-if="Object.keys(historical).length > 1" class="strait-mobile-detail__section" aria-label="Historical trends">
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
  font-size: 14px;
  font-weight: 500;
  padding: 8px 12px 8px 8px;
  border-radius: 8px;
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
  padding: 16px 20px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.strait-mobile-detail__hero-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.strait-mobile-detail__hero-label {
  font-size: 12px;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 4px;
}

/* --- Key metrics --- */
.strait-mobile-detail__metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.strait-mobile-detail__metric {
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.strait-mobile-detail__metric-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.strait-mobile-detail__metric-label {
  font-size: 11px;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

/* --- Description --- */
.strait-mobile-detail__desc {
  margin: 0 0 20px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  line-height: 1.7;
}

/* --- Divider between qual and quant sections --- */
.strait-mobile-detail__divider {
  border: none;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 0 0 20px;
}

/* --- Sections --- */
.strait-mobile-detail__section {
  margin-bottom: 20px;
}

.strait-mobile-detail__section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 10px;
}

/* --- Tags --- */
.strait-mobile-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.strait-mobile-detail__tag {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  white-space: nowrap;
}

.strait-mobile-detail__tag--threat {
  color: var(--color-threat);
  background: var(--color-threat-bg);
  border-color: var(--color-threat-border);
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
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  line-height: 1.6;
}

.strait-mobile-detail__facts li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 4px;
  height: 4px;
  border-radius: 1px;
  background: var(--color-accent);
  opacity: 0.6;
}

/* Stacked bar styles now live in public/styles.css */

@media (prefers-reduced-motion: reduce) {
  .strait-mobile-detail__back {
    transition: none;
  }
}
</style>
