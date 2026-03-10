<script setup lang="ts">
import { straits } from '~/utils/straitsData'
import { historical, LATEST_YEAR } from '~/utils/straitsData'
import type { Strait } from '~/types/strait'

const props = defineProps<{
  valueUSD: number
  capacityMt: number
  vessels: number
  sizeMetric: 'tonnage' | 'ships' | 'value'
}>()

// Compute min/max for each metric once from the dataset
const rangeUSD = (() => {
  const vals = straits.map((s: Strait) => s.valueUSD)
  return { min: Math.min(...vals), max: Math.max(...vals) }
})()

const rangeMt = (() => {
  const yearData = historical[LATEST_YEAR] ?? {}
  const vals = Object.values(yearData).map((d) => d.capacityMt)
  return { min: Math.min(...vals), max: Math.max(...vals) }
})()

const rangeVessels = (() => {
  const yearData = historical[LATEST_YEAR] ?? {}
  const vals = Object.values(yearData).map((d) => d.vessels.total)
  return { min: Math.min(...vals), max: Math.max(...vals) }
})()

const FONT_MIN = 14
const FONT_MAX = 72

function lerp(value: number, min: number, max: number): number {
  if (max === min) return FONT_MAX
  const t = (value - min) / (max - min)
  return Math.round(FONT_MIN + t * (FONT_MAX - FONT_MIN))
}

/** Hero font size scales linearly with the active metric */
const heroFontSize = computed(() => {
  if (props.sizeMetric === 'value') return lerp(props.valueUSD, rangeUSD.min, rangeUSD.max)
  if (props.sizeMetric === 'ships') return lerp(props.vessels, rangeVessels.min, rangeVessels.max)
  return lerp(props.capacityMt, rangeMt.min, rangeMt.max)
})

const heroValue = computed(() => {
  if (props.sizeMetric === 'value') return fmtUsd(props.valueUSD)
  if (props.sizeMetric === 'ships') return fmtNum(props.vessels)
  return fmtMt(props.capacityMt)
})

const heroLabel = computed(() => {
  if (props.sizeMetric === 'value') return 'Trade Value'
  if (props.sizeMetric === 'ships') return 'Vessels'
  return 'Metric Tonnes'
})

function fmtUsd(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}

function fmtNum(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
  return v.toLocaleString('en-US')
}

function fmtMt(v: number): string {
  return v.toLocaleString('en-US')
}
</script>

<template>
  <div class="snapshot-overlay">
    <span class="snapshot-hero" :style="{ fontSize: `${heroFontSize}px` }">{{ heroValue }}</span>
    <span class="snapshot-label">{{ heroLabel }}</span>
  </div>
</template>

<style scoped>
.snapshot-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  font-family: 'Encode Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #fff;
}

.snapshot-hero {
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.snapshot-label {
  font-size: clamp(10px, 15%, 16px);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4%;
}
</style>
