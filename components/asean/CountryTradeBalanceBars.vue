<script setup lang="ts">
import * as d3 from 'd3'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { CountryProfile, TradeItem } from '~/data/asean/country-profiles'

const props = defineProps<{
  profile: CountryProfile
  height?: number
}>()

// SimCity zoning palette: green for positive (exports leaving = revenue),
// coral for negative (imports = outflow). Saturated against the dark card.
const EXPORT_COLOR = 'hsl(150, 55%, 55%)'
const IMPORT_COLOR = 'hsl(348, 70%, 60%)'

const chartContainer = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

interface BarDatum {
  label: string
  value: number     // signed: positive for exports, negative for imports
  raw: number       // absolute USD billions
  detail?: string
  kind: 'export' | 'import'
}

function buildBars(): BarDatum[] {
  const exports: BarDatum[] = props.profile.topExports.map((it: TradeItem) => ({
    label: it.label,
    value: it.valueUsdB,
    raw: it.valueUsdB,
    detail: it.detail,
    kind: 'export' as const
  }))
  const imports: BarDatum[] = props.profile.topImports.map((it: TradeItem) => ({
    label: it.label,
    value: -it.valueUsdB,
    raw: it.valueUsdB,
    detail: it.detail,
    kind: 'import' as const
  }))
  // Layout: exports left-to-right, then imports left-to-right.
  return [...exports, ...imports]
}

function fmtUsdB(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 10) return `$${Math.round(abs)}B`
  if (abs >= 1) return `$${abs.toFixed(1)}B`
  return `$${(abs * 1000).toFixed(0)}M`
}

function draw() {
  if (!chartContainer.value) return
  chartContainer.value.innerHTML = ''

  const width = chartContainer.value.clientWidth
  const height = props.height ?? 200
  if (width === 0) {
    setTimeout(draw, 80)
    return
  }

  const bars = buildBars()
  const margin = { top: 14, right: 8, bottom: 36, left: 8 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  const x = d3
    .scaleBand<string>()
    .domain(bars.map((d) => d.label))
    .range([margin.left, width - margin.right])
    .paddingInner(0.18)
    .paddingOuter(0.05)

  const yMax = Math.max(...bars.map((d) => Math.abs(d.value))) * 1.15
  const y = d3
    .scaleLinear()
    .domain([-yMax, yMax])
    .range([height - margin.bottom, margin.top])

  const zeroY = y(0)

  const svg = d3
    .select(chartContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('class', 'trade-bars__svg')

  // Subtle horizontal axis line at zero
  svg
    .append('line')
    .attr('x1', margin.left)
    .attr('x2', width - margin.right)
    .attr('y1', zeroY)
    .attr('y2', zeroY)
    .attr('stroke', 'rgba(255,255,255,0.2)')
    .attr('stroke-width', 1)

  // Bars
  const barG = svg.append('g').selectAll('g').data(bars).join('g')

  barG
    .append('rect')
    .attr('x', (d) => x(d.label) ?? 0)
    .attr('y', (d) => (d.value >= 0 ? y(d.value) : zeroY))
    .attr('width', x.bandwidth())
    .attr('height', (d) => Math.abs(y(d.value) - zeroY))
    .attr('fill', (d) => (d.kind === 'export' ? EXPORT_COLOR : IMPORT_COLOR))
    .attr('rx', 2)
    .append('title')
    .text((d) => `${d.label}: ${fmtUsdB(d.raw)} (${d.kind})`)

  // Value labels inside/above bar
  barG
    .append('text')
    .attr('x', (d) => (x(d.label) ?? 0) + x.bandwidth() / 2)
    .attr('y', (d) =>
      d.value >= 0 ? y(d.value) - 6 : y(d.value) + 14
    )
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 11)
    .attr('font-weight', 700)
    .attr('font-variant-numeric', 'tabular-nums')
    .text((d) => fmtUsdB(d.raw))

  // Commodity labels under each bar (always below the zero line for readability)
  const labelG = svg.append('g').selectAll('g').data(bars).join('g')

  labelG
    .append('text')
    .attr('x', (d) => (x(d.label) ?? 0) + x.bandwidth() / 2)
    .attr('y', height - margin.bottom + 14)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(255,255,255,0.62)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 10)
    .attr('font-weight', 500)
    .text((d) => d.label.length > 16 ? d.label.slice(0, 14) + '…' : d.label)
    .append('title')
    .text((d) => d.label)

  // EXPORTS / IMPORTS axis tags (left-most + first-import)
  const firstExport = bars[0]
  const firstImport = bars.find((b) => b.kind === 'import')
  if (firstExport) {
    svg
      .append('text')
      .attr('x', x(firstExport.label) ?? margin.left)
      .attr('y', margin.top - 2)
      .attr('text-anchor', 'start')
      .attr('fill', EXPORT_COLOR)
      .attr('font-family', 'Encode Sans, system-ui, sans-serif')
      .attr('font-size', 9.5)
      .attr('font-weight', 700)
      .attr('letter-spacing', '0.08em')
      .text('EXPORTS ↑')
  }
  if (firstImport) {
    svg
      .append('text')
      .attr('x', x(firstImport.label) ?? margin.left)
      .attr('y', height - margin.bottom + 28)
      .attr('text-anchor', 'start')
      .attr('fill', IMPORT_COLOR)
      .attr('font-family', 'Encode Sans, system-ui, sans-serif')
      .attr('font-size', 9.5)
      .attr('font-weight', 700)
      .attr('letter-spacing', '0.08em')
      .text('IMPORTS ↓')
  }
}

onMounted(() => {
  draw()
  if (typeof ResizeObserver !== 'undefined' && chartContainer.value) {
    resizeObserver = new ResizeObserver(() => draw())
    resizeObserver.observe(chartContainer.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(() => props.profile, draw, { deep: true })
</script>

<template>
  <div ref="chartContainer" class="trade-bars" aria-hidden="true" />
</template>

<style scoped>
.trade-bars {
  width: 100%;
  min-height: 200px;
}

.trade-bars :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
</style>
