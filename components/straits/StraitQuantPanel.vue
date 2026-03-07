<script setup lang="ts">
import type { Strait } from '~/types/strait'
import { fmtUsd, fmtNum, computeVesselSegments } from '~/utils/format'

const props = defineProps<{
  strait: Strait
  historical: Record<string, { capacityMt: number; vessels: { total: number; container: number; dryBulk: number; tanker: number }; capacityByType: { container: number; dryBulk: number; tanker: number } }>
  year: string
}>()

const yearData = computed(() => props.historical[props.year])

const vesselSegments = computed(() => computeVesselSegments(yearData.value?.vessels))
</script>

<template>
  <div class="quant-panel" @click.stop>
    <!-- Hero stat: Trade value -->
    <div class="quant-panel__hero">
      <span class="quant-panel__hero-value">{{ fmtUsd(strait.valueUSD) }}</span>
      <span class="quant-panel__hero-label">Annual trade value</span>
    </div>

    <!-- Key metrics row -->
    <div class="quant-panel__metrics">
      <div v-if="strait.oilMbpd != null" class="quant-panel__metric">
        <span class="quant-panel__metric-value">{{ strait.oilMbpd }}</span>
        <span class="quant-panel__metric-label">Oil mb/d</span>
      </div>
      <div v-if="strait.lngBcfd != null" class="quant-panel__metric">
        <span class="quant-panel__metric-value">{{ strait.lngBcfd }}</span>
        <span class="quant-panel__metric-label">LNG bcf/d</span>
      </div>
      <div v-if="yearData" class="quant-panel__metric">
        <span class="quant-panel__metric-value">{{ fmtNum(yearData.capacityMt) }}</span>
        <span class="quant-panel__metric-label">Cargo Mt</span>
      </div>
      <div v-if="yearData" class="quant-panel__metric">
        <span class="quant-panel__metric-value">{{ fmtNum(yearData.vessels.total) }}</span>
        <span class="quant-panel__metric-label">Vessels</span>
      </div>
    </div>

    <!-- Vessel breakdown bar -->
    <div v-if="vesselSegments.length" class="quant-panel__bar-section">
      <h3 class="quant-panel__section-title">Vessel Breakdown</h3>
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
  </div>
</template>

<style scoped>
.quant-panel {
  width: 280px;
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

.quant-panel::-webkit-scrollbar { width: 4px; }
.quant-panel::-webkit-scrollbar-track { background: transparent; }
.quant-panel::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 2px; }

/* --- Hero stat --- */
.quant-panel__hero {
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.quant-panel__hero-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.quant-panel__hero-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 4px;
}

/* --- Key metrics row --- */
.quant-panel__metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.quant-panel__metric {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.quant-panel__metric-value {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.quant-panel__metric-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

/* --- Section titles --- */
.quant-panel__section-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 8px;
}

.quant-panel__bar-section {
  margin-bottom: 16px;
}

/* --- Stacked bar --- */
.stacked-bar { width: 100%; }

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

@media (prefers-reduced-motion: reduce) {
  .quant-panel { transition: none; }
}
</style>
