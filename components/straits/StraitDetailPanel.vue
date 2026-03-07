<script setup lang="ts">
import type { Strait } from '~/types/strait'

const props = defineProps<{
  strait: Strait
  historical: Record<string, { capacityMt: number; vessels: { total: number; container: number; dryBulk: number; tanker: number }; capacityByType: { container: number; dryBulk: number; tanker: number } }>
  year: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const yearData = computed(() => props.historical[props.year])

const vesselSegments = computed(() => {
  const d = yearData.value
  if (!d) return []
  const total = d.vessels.container + d.vessels.dryBulk + d.vessels.tanker
  if (total === 0) return []
  return [
    { key: 'container', label: 'Container', value: d.vessels.container, pct: (d.vessels.container / total) * 100, color: 'var(--color-cargo-container)' },
    { key: 'dryBulk', label: 'Dry Bulk', value: d.vessels.dryBulk, pct: (d.vessels.dryBulk / total) * 100, color: 'var(--color-cargo-dry-bulk)' },
    { key: 'tanker', label: 'Tanker', value: d.vessels.tanker, pct: (d.vessels.tanker / total) * 100, color: 'var(--color-cargo-tanker)' },
  ]
})

function fmtUsd(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}

function fmtNum(v: number): string {
  return v.toLocaleString('en-US')
}
</script>

<template>
  <div class="strait-panel" @click.stop>
    <!-- Header -->
    <div class="strait-panel__header">
      <div>
        <h2 class="strait-panel__name">{{ strait.name }}</h2>
        <p class="strait-panel__share">{{ strait.globalShareLabel }}</p>
      </div>
      <button
        class="strait-panel__close"
        aria-label="Close detail panel"
        @click="emit('close')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
        </svg>
      </button>
    </div>

    <!-- Hero stat: Trade value -->
    <div class="strait-panel__hero">
      <span class="strait-panel__hero-value">{{ fmtUsd(strait.valueUSD) }}</span>
      <span class="strait-panel__hero-label">Annual trade value</span>
    </div>

    <!-- Key metrics row -->
    <div class="strait-panel__metrics">
      <div v-if="strait.oilMbpd != null" class="strait-panel__metric">
        <span class="strait-panel__metric-value">{{ strait.oilMbpd }}</span>
        <span class="strait-panel__metric-label">Oil mb/d</span>
      </div>
      <div v-if="strait.lngBcfd != null" class="strait-panel__metric">
        <span class="strait-panel__metric-value">{{ strait.lngBcfd }}</span>
        <span class="strait-panel__metric-label">LNG bcf/d</span>
      </div>
      <div v-if="yearData" class="strait-panel__metric">
        <span class="strait-panel__metric-value">{{ fmtNum(yearData.capacityMt) }}</span>
        <span class="strait-panel__metric-label">Cargo Mt</span>
      </div>
      <div v-if="yearData" class="strait-panel__metric">
        <span class="strait-panel__metric-value">{{ fmtNum(yearData.vessels.total) }}</span>
        <span class="strait-panel__metric-label">Vessels</span>
      </div>
    </div>

    <!-- Description -->
    <p v-if="strait.description" class="strait-panel__desc">{{ strait.description }}</p>

    <!-- Vessel breakdown bar -->
    <div v-if="vesselSegments.length" class="strait-panel__bar-section">
      <h3 class="strait-panel__section-title">Vessel Breakdown</h3>
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
    </div>

    <!-- Historical trend chart -->
    <StraitHistoryChart v-if="Object.keys(historical).length > 1" :historical="historical" />

    <!-- Top Industries -->
    <div v-if="strait.topIndustries.length" class="strait-panel__section">
      <h3 class="strait-panel__section-title">Top Industries</h3>
      <div class="strait-panel__tags">
        <span v-for="ind in strait.topIndustries" :key="ind" class="strait-panel__tag">{{ ind }}</span>
      </div>
    </div>

    <!-- Threats -->
    <div v-if="strait.threats.length" class="strait-panel__section">
      <h3 class="strait-panel__section-title">Threats</h3>
      <div class="strait-panel__tags">
        <span v-for="threat in strait.threats" :key="threat" class="strait-panel__tag strait-panel__tag--threat">{{ threat }}</span>
      </div>
    </div>

    <!-- Key Facts -->
    <div v-if="strait.keyFacts.length" class="strait-panel__section">
      <h3 class="strait-panel__section-title">Key Facts</h3>
      <ul class="strait-panel__facts">
        <li v-for="fact in strait.keyFacts" :key="fact">{{ fact }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.strait-panel {
  width: 320px;
  max-height: 100%;
  overflow-y: auto;
  padding: 20px;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Encode Sans', sans-serif;
  font-size: 12px;
  line-height: 1.5;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

/* Scrollbar styling */
.strait-panel::-webkit-scrollbar {
  width: 4px;
}

.strait-panel::-webkit-scrollbar-track {
  background: transparent;
}

.strait-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

/* --- Header --- */
.strait-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.strait-panel__name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 2px;
  color: #fff;
  letter-spacing: -0.01em;
}

.strait-panel__share {
  margin: 0;
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 500;
}

.strait-panel__close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.strait-panel__close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.85);
}

.strait-panel__close:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 1px;
}

/* --- Hero stat --- */
.strait-panel__hero {
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.strait-panel__hero-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.strait-panel__hero-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 4px;
}

/* --- Key metrics row --- */
.strait-panel__metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.strait-panel__metric {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.strait-panel__metric-value {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.strait-panel__metric-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

/* --- Description --- */
.strait-panel__desc {
  margin: 0 0 16px;
  padding-bottom: 16px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  line-height: 1.65;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

/* --- Section titles --- */
.strait-panel__section-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 8px;
}

/* --- Stacked bar --- */
.strait-panel__bar-section {
  margin-bottom: 16px;
}

.stacked-bar {
  width: 100%;
}

.stacked-bar__track {
  display: flex;
  width: 100%;
  height: 24px;
  border-radius: 4px;
  overflow: hidden;
}

.stacked-bar__segment {
  flex: none;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
}

.stacked-bar__segment + .stacked-bar__segment {
  border-left: 1px solid rgba(0, 0, 0, 0.3);
}

.stacked-bar__value {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.stacked-bar__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.stacked-bar__legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.stacked-bar__dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.stacked-bar__legend-count {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* --- Sections --- */
.strait-panel__section {
  margin-bottom: 16px;
}

/* --- Tags --- */
.strait-panel__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.strait-panel__tag {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  white-space: nowrap;
}

.strait-panel__tag--threat {
  color: hsl(348, 80%, 72%);
  background: hsla(348, 60%, 55%, 0.1);
  border-color: hsla(348, 60%, 55%, 0.2);
}

/* --- Key facts list --- */
.strait-panel__facts {
  margin: 0;
  padding: 0;
  list-style: none;
}

.strait-panel__facts li {
  position: relative;
  padding-left: 12px;
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
  line-height: 1.55;
}

.strait-panel__facts li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 4px;
  height: 4px;
  border-radius: 1px;
  background: var(--color-accent);
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .strait-panel__close {
    transition: none;
  }
}
</style>
