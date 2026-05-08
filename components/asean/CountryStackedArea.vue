<script setup lang="ts">
import * as d3 from 'd3'
import { onMounted, onUnmounted, ref, watch } from 'vue'

interface SeriesPoint {
  year: number
  [partner: string]: number
}

interface StackedAreaData {
  country: string
  country_name: string
  metric: string
  unit: string
  source: string
  partners: string[]
  series: SeriesPoint[]
}

const props = defineProps<{
  data: StackedAreaData
  height?: number
  /**
   * Optional partner whitelist. When set, only these partner_groups are
   * stacked (in size order). Defaults to all partners in `data.partners`.
   */
  partners?: string[]
}>()

// Partner colors — anchored to brand tokens. China = meridian (signature blue),
// US = bureau-tinted neutral, EU = warmer accent, others = muted greys.
const PARTNER_COLOR: Record<string, string> = {
  CHN: 'hsl(218, 60%, 58%)',     // meridian — gravitational pull
  USA: 'hsl(348, 60%, 55%)',     // tanker red — counter-pole
  EU: 'hsl(34, 60%, 50%)',       // bulk amber — third pole
  JPN: 'hsla(0, 0%, 100%, 0.4)', // muted
  KOR: 'hsla(0, 0%, 100%, 0.25)' // most muted
}

const PARTNER_LABEL: Record<string, string> = {
  CHN: 'China',
  USA: 'United States',
  EU: 'European Union',
  JPN: 'Japan',
  KOR: 'South Korea'
}

const chartContainer = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

function draw() {
  if (!chartContainer.value) return
  chartContainer.value.innerHTML = ''

  const width = chartContainer.value.clientWidth
  const height = props.height ?? 320

  if (width === 0) {
    setTimeout(draw, 80)
    return
  }

  const margin = { top: 16, right: 100, bottom: 28, left: 8 }

  // Stack order: largest-by-latest on bottom = visual weight matches scale.
  // When `partners` prop is set, restrict to that subset.
  const latest = props.data.series[props.data.series.length - 1]
  const sourceKeys = props.partners?.length
    ? props.partners.filter((p) => props.data.partners.includes(p))
    : props.data.partners
  const stackKeys = [...sourceKeys].sort(
    (a, b) => (latest[b] as number) - (latest[a] as number)
  )

  const stack = d3
    .stack<SeriesPoint>()
    .keys(stackKeys)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone)

  const stackedSeries = stack(props.data.series)

  const x = d3
    .scaleLinear()
    .domain(d3.extent(props.data.series, (d) => d.year) as [number, number])
    .range([margin.left, width - margin.right])

  const yMax = d3.max(stackedSeries, (s) => d3.max(s, (d) => d[1])) as number
  const y = d3
    .scaleLinear()
    .domain([0, yMax])
    .nice()
    .range([height - margin.bottom, margin.top])

  const area = d3
    .area<d3.SeriesPoint<SeriesPoint>>()
    .x((d) => x(d.data.year))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(d3.curveMonotoneX)

  const svg = d3
    .select(chartContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('class', 'stacked-area__svg')

  // Subtle horizontal gridlines
  const yTicks = y.ticks(4)
  svg
    .append('g')
    .attr('class', 'stacked-area__grid')
    .selectAll('line')
    .data(yTicks)
    .join('line')
    .attr('x1', margin.left)
    .attr('x2', width - margin.right)
    .attr('y1', (d) => y(d))
    .attr('y2', (d) => y(d))
    .attr('stroke', 'rgba(255,255,255,0.06)')
    .attr('stroke-width', 1)

  // Stacked areas
  svg
    .append('g')
    .selectAll('path')
    .data(stackedSeries)
    .join('path')
    .attr('d', area)
    .attr('fill', (d) => PARTNER_COLOR[d.key] ?? 'rgba(255,255,255,0.2)')
    .attr('fill-opacity', 0.85)
    .attr('stroke', (d) => PARTNER_COLOR[d.key] ?? 'rgba(255,255,255,0.2)')
    .attr('stroke-width', 0.5)
    .attr('stroke-opacity', 0.6)

  // Right-edge partner labels at last data point
  const labelG = svg.append('g').attr('class', 'stacked-area__labels')

  stackedSeries.forEach((s) => {
    const last = s[s.length - 1]
    const yMid = (y(last[0]) + y(last[1])) / 2
    const bandHeight = y(last[0]) - y(last[1])
    if (bandHeight < 14) return // skip cramped bands

    labelG
      .append('text')
      .attr('x', width - margin.right + 8)
      .attr('y', yMid)
      .attr('dy', '0.35em')
      .attr('fill', PARTNER_COLOR[s.key] ?? 'rgba(255,255,255,0.8)')
      .attr('font-family', 'Encode Sans, system-ui, sans-serif')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('letter-spacing', '0.02em')
      .text(PARTNER_LABEL[s.key] ?? s.key)
  })

  // X axis — minimal, just first/last year + midpoint
  const xAxisG = svg
    .append('g')
    .attr('class', 'stacked-area__x-axis')
    .attr('transform', `translate(0, ${height - margin.bottom})`)

  const years = props.data.series.map((d) => d.year)
  const xTickYears = [years[0], years[Math.floor(years.length / 2)], years[years.length - 1]]

  xAxisG
    .selectAll('text')
    .data(xTickYears)
    .join('text')
    .attr('x', (d) => x(d))
    .attr('y', 16)
    .attr('text-anchor', (d, i) =>
      i === 0 ? 'start' : i === xTickYears.length - 1 ? 'end' : 'middle'
    )
    .attr('fill', 'rgba(255,255,255,0.55)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 10)
    .attr('font-weight', 600)
    .attr('letter-spacing', '0.05em')
    .text((d) => String(d))

  // Y axis — value at top tick, USD label
  const yTopTick = yTicks[yTicks.length - 1]
  svg
    .append('text')
    .attr('x', margin.left)
    .attr('y', y(yTopTick) - 4)
    .attr('fill', 'rgba(255,255,255,0.45)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 10)
    .attr('font-weight', 600)
    .attr('letter-spacing', '0.05em')
    .text(`$${(yTopTick / 1000).toFixed(0)}B`)
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

watch(() => props.data, draw, { deep: true })
</script>

<template>
  <div ref="chartContainer" class="stacked-area" aria-hidden="true" />
</template>

<style scoped>
.stacked-area {
  width: 100%;
  min-height: 200px;
}

.stacked-area :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
</style>
