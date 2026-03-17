<script setup lang="ts">
import type { Strait } from '~/types/strait'
import { straitConfigs } from '~/data/straits/strait-config'

const props = defineProps<{
  strait: Strait
  historical: Record<string, { capacityMt: number; vessels: { total: number; container: number; dryBulk: number; tanker: number }; capacityByType: { container: number; dryBulk: number; tanker: number } }>
  year: string
  tiltX: number
  tiltY: number
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

const marineTrafficUrl = computed(() => {
  const config = straitConfigs[props.strait.id]
  if (!config) return null
  return `https://www.marinetraffic.com/en/ais/home/centerx:${config.longitude}/centery:${config.latitude}/zoom:${config.zoom}`
})

</script>

<template>
  <div
    class="quant-plane"
    :style="{
      transform: `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
    }"
    @click.stop
  >
    <!-- Thin top rule -->
    <div class="plane-rule" />

    <!-- Hero stat -->
    <div class="plane-hero">
      <span class="plane-hero__value">{{ fmtUsd(strait.valueUSD) }}</span>
      <span class="plane-hero__label">Annual Trade Value</span>
    </div>

    <!-- Key metrics -->
    <div class="plane-metrics">
      <div v-if="strait.oilMbpd != null" class="plane-metric">
        <span class="plane-metric__value">{{ strait.oilMbpd }}</span>
        <span class="plane-metric__label">Oil mb/d</span>
      </div>
      <div v-if="strait.lngBcfd != null" class="plane-metric">
        <span class="plane-metric__value">{{ strait.lngBcfd }}</span>
        <span class="plane-metric__label">LNG bcf/d</span>
      </div>
      <div v-if="yearData" class="plane-metric">
        <span class="plane-metric__value">{{ fmtNum(yearData.capacityMt) }}</span>
        <span class="plane-metric__label">Cargo Mt</span>
      </div>
      <div v-if="yearData" class="plane-metric">
        <span class="plane-metric__value">{{ fmtNum(yearData.vessels.total) }}</span>
        <span class="plane-metric__label">Vessels</span>
      </div>
    </div>

    <!-- Vessel breakdown -->
    <div v-if="vesselSegments.length" class="plane-section">
      <h3 class="plane-section__title">Vessel Breakdown</h3>
      <div class="stacked-bar">
        <div class="stacked-bar__track">
          <div
            v-for="seg in vesselSegments"
            :key="seg.key"
            class="stacked-bar__segment"
            :style="{ width: seg.pct + '%', background: seg.color }"
          >
            <span v-if="seg.pct > 15" class="stacked-bar__pct">{{ Math.round(seg.pct) }}%</span>
          </div>
        </div>
        <div class="stacked-bar__legend">
          <span v-for="seg in vesselSegments" :key="seg.key" class="stacked-bar__legend-item">
            <span class="stacked-bar__dot" :style="{ background: seg.color }" />
            {{ seg.label }}
            <span class="stacked-bar__count">{{ fmtNum(seg.value) }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Historical chart -->
    <StraitHistoryChart v-if="Object.keys(historical).length > 1" :historical="historical" />

    <!-- Marine Traffic Link -->
    <a
      v-if="marineTrafficUrl"
      :href="marineTrafficUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="plane-mt-link"
    >
      Live Marine Traffic
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M3 9l6-6M5 3h4v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="square" />
      </svg>
    </a>
  </div>
</template>

<style scoped>
/* ─── 3D Glass Plane ─── */
.quant-plane {
  width: 100%;
  max-width: 320px;
  max-height: 100%;
  overflow-y: auto;
  padding: 24px 24px 20px;

  /* Swiss typography base */
  color: #fff;
  font-family: 'Encode Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;

  /* No background */
  background: transparent;
  border: none;
  border-radius: 0;

  /* 3D setup */
  transform-style: preserve-3d;
  will-change: transform;
  transition: transform 0.15s ease-out;
}

.quant-plane::-webkit-scrollbar { width: 3px; }
.quant-plane::-webkit-scrollbar-track { background: transparent; }
.quant-plane::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 1px; }

/* ─── Top rule ─── */
.plane-rule {
  width: 100%;
  height: 1px;
  background: #fff;
  margin-bottom: 20px;
  opacity: 0.6;
}

/* ─── Hero stat ─── */
.plane-hero {
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}

.plane-hero__value {
  font-size: 43px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.plane-hero__label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-top: 6px;
}

/* ─── Key metrics grid ─── */
.plane-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin-bottom: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.plane-metric {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  border-bottom: none;
}

.plane-metric:nth-child(odd) {
  padding-right: 12px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.plane-metric:nth-child(even) {
  padding-left: 12px;
}

/* Top row gets a bottom border when there are 4 items */
.plane-metric:nth-child(-n+2) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.plane-metric__value {
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.plane-metric__label {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 3px;
}

/* ─── Section titles ─── */
.plane-section {
  margin-bottom: 20px;
}

.plane-section__title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 10px;
}

/* ─── Stacked bar ─── */
.stacked-bar { width: 100%; }

.stacked-bar__track {
  display: flex;
  width: 100%;
  height: 3px;
  border-radius: 0;
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
  border-left: 1px solid rgba(0, 0, 0, 0.4);
}

.stacked-bar__pct {
  display: none; /* too thin for inline percentages */
}

.stacked-bar__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}

.stacked-bar__legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.02em;
}

.stacked-bar__dot {
  width: 6px;
  height: 6px;
  border-radius: 0;
  flex-shrink: 0;
}

.stacked-bar__count {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ─── Marine Traffic link ─── */
.plane-mt-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  margin-left: auto;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.plane-mt-link:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}

.plane-mt-link:focus-visible {
  outline: 1px solid rgba(255, 255, 255, 0.6);
  outline-offset: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .quant-plane { transition: none; }
  .plane-mt-link { transition: none; }
}
</style>
