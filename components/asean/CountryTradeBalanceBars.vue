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
  // Wide left/right margins reserve room for the value labels parked at each
  // bar's outer tip. Top margin holds the EXPORTS → / ← IMPORTS tags.
  const margin = { top: 26, right: 46, bottom: 8, left: 46 }

  const center = width / 2

  const svg = d3
    .select(chartContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('class', 'trade-bars__svg')

  // Measure pass: render the labels off-anchor to get their true pixel width,
  // size the center column to the widest one + 6px inline padding each side,
  // then reposition. No truncation — column grows to fit.
  const LABEL_FONT_SIZE = 10
  const measureG = svg.append('g').attr('visibility', 'hidden')
  let maxLabelW = 0
  for (const d of bars) {
    const t = measureG
      .append('text')
      .attr('font-family', 'Encode Sans, system-ui, sans-serif')
      .attr('font-size', LABEL_FONT_SIZE)
      .attr('font-weight', 500)
      .text(d.label)
    maxLabelW = Math.max(maxLabelW, t.node()?.getComputedTextLength() ?? 0)
  }
  measureG.remove()

  // colW = widest label + 6px inline-padding per side. Clamp so the bars
  // always keep usable room on a narrow card.
  const colW = Math.min(maxLabelW + 12, width * 0.6)
  const leftEdge = center - colW / 2
  const rightEdge = center + colW / 2

  const y = d3
    .scaleBand<string>()
    .domain(bars.map((d) => d.label))
    .range([margin.top, height - margin.bottom])
    .paddingInner(0.3)
    .paddingOuter(0.06)

  const vMax = Math.max(...bars.map((d) => Math.abs(d.value))) * 1.05
  // Two scales mirroring outward from the column edges.
  const xExport = d3
    .scaleLinear()
    .domain([0, vMax])
    .range([rightEdge, width - margin.right])
  const xImport = d3
    .scaleLinear()
    .domain([0, vMax])
    .range([leftEdge, margin.left])

  // Faint guides bounding the center label column
  for (const edge of [leftEdge, rightEdge]) {
    svg
      .append('line')
      .attr('x1', edge)
      .attr('x2', edge)
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', 'rgba(255,255,255,0.12)')
      .attr('stroke-width', 1)
  }

  const barG = svg.append('g').selectAll('g').data(bars).join('g')

  barG
    .append('rect')
    .attr('x', (d) => (d.value >= 0 ? rightEdge : xImport(d.raw)))
    .attr('y', (d) => y(d.label) ?? 0)
    .attr('width', (d) =>
      d.value >= 0 ? xExport(d.raw) - rightEdge : leftEdge - xImport(d.raw)
    )
    .attr('height', y.bandwidth())
    .attr('fill', (d) => (d.kind === 'export' ? EXPORT_COLOR : IMPORT_COLOR))
    .attr('rx', 2)
    .append('title')
    .text((d) => `${d.label}: ${fmtUsdB(d.raw)} (${d.kind})`)

  // Value label parked just outside the bar's outer tip
  barG
    .append('text')
    .attr('x', (d) => (d.value >= 0 ? xExport(d.raw) + 6 : xImport(d.raw) - 6))
    .attr('y', (d) => (y(d.label) ?? 0) + y.bandwidth() / 2)
    .attr('text-anchor', (d) => (d.value >= 0 ? 'start' : 'end'))
    .attr('dominant-baseline', 'central')
    .attr('fill', '#fff')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 11)
    .attr('font-weight', 700)
    .attr('font-variant-numeric', 'tabular-nums')
    .text((d) => fmtUsdB(d.raw))

  // Commodity label, centered in the auto-sized column
  barG
    .append('text')
    .attr('x', center)
    .attr('y', (d) => (y(d.label) ?? 0) + y.bandwidth() / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('fill', 'rgba(255,255,255,0.9)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', LABEL_FONT_SIZE)
    .attr('font-weight', 500)
    .text((d) => d.label)
    .append('title')
    .text((d) => d.label)

  // EXPORTS → / ← IMPORTS tags above the column edges
  svg
    .append('text')
    .attr('x', rightEdge)
    .attr('y', margin.top - 10)
    .attr('text-anchor', 'start')
    .attr('fill', EXPORT_COLOR)
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 9.5)
    .attr('font-weight', 700)
    .attr('letter-spacing', '0.08em')
    .text('EXPORTS →')
  svg
    .append('text')
    .attr('x', leftEdge)
    .attr('y', margin.top - 10)
    .attr('text-anchor', 'end')
    .attr('fill', IMPORT_COLOR)
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 9.5)
    .attr('font-weight', 700)
    .attr('letter-spacing', '0.08em')
    .text('← IMPORTS')
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
