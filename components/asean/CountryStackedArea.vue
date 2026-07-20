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
  USA: 'US',
  EU: 'EU',
  JPN: 'Japan',
  KOR: 'South Korea'
}

const chartContainer = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const GROW_MS = 600

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// BF-87: partner labels now show each partner's SHARE of the year's three-way
// total (relative proportion), not an absolute dollar figure. Marshall asked to
// drop the total-dollar figure and "USD billions" so the graphic reads as
// relative proportions + growth over time; the absolute stacked areas still
// carry the growth signal, while these % labels carry the proportions.
function formatSharePct(value: number, total: number): string {
  if (!Number.isFinite(value) || !(total > 0)) return '—'
  const pct = (value / total) * 100
  // Keep a thin band visible: never round a present partner down to "0%".
  if (pct > 0 && pct < 1) return '<1%'
  return `${Math.round(pct)}%`
}

interface LabelAnchor {
  key: string
  trueY: number
  y: number
}

// Greedy 1D collision resolver: sort anchors by their true (band-midpoint) y,
// push any pair closer than minGap apart, then — if the resolved stack
// overflows the usable range — shift the whole stack back in bounds and
// re-run the push-down pass once. Stable for the small (<=5) label counts
// this chart ever has.
function resolveLabelPositions(
  anchors: { key: string; y: number }[],
  minGap: number,
  yMin: number,
  yMax: number
): LabelAnchor[] {
  const sorted = anchors
    .map((a) => ({ key: a.key, trueY: a.y, y: a.y }))
    .sort((a, b) => a.trueY - b.trueY)

  const pushDown = () => {
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].y - sorted[i - 1].y < minGap) {
        sorted[i].y = sorted[i - 1].y + minGap
      }
    }
  }

  pushDown()

  const overflow = sorted.length ? sorted[sorted.length - 1].y - yMax : 0
  if (overflow > 0) {
    for (const a of sorted) a.y -= overflow
    pushDown()
  }

  const underflow = sorted.length ? yMin - sorted[0].y : 0
  if (underflow > 0) {
    for (const a of sorted) a.y += underflow
  }

  return sorted
}

function draw() {
  if (!chartContainer.value) return
  chartContainer.value.innerHTML = ''

  const width = chartContainer.value.clientWidth
  const height = props.height ?? 320

  if (width === 0) {
    setTimeout(draw, 80)
    return
  }

  // right margin widened from 100 → 112 to fit the longer "<Partner> <value>"
  // labels (e.g. "China $142.6B") plus the leader-line gutter.
  const margin = { top: 16, right: 112, bottom: 28, left: 8 }

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

  // Area generator parameterised by progress t (0 → 1): both stacked edges are
  // scaled by t, so at t=0 the whole stack collapses onto the baseline and at
  // t=1 it sits at its real values — the area grows up out of the x-axis.
  const areaAt = (t: number) =>
    d3
      .area<d3.SeriesPoint<SeriesPoint>>()
      .x((d) => x(d.data.year))
      .y0((d) => y(d[0] * t))
      .y1((d) => y(d[1] * t))
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
  const reduce = prefersReducedMotion()
  const areas = svg
    .append('g')
    .selectAll('path')
    .data(stackedSeries)
    .join('path')
    .attr('fill', (d) => PARTNER_COLOR[d.key] ?? 'rgba(255,255,255,0.2)')
    .attr('fill-opacity', 0.85)
    .attr('stroke', (d) => PARTNER_COLOR[d.key] ?? 'rgba(255,255,255,0.2)')
    .attr('stroke-width', 0.5)
    .attr('stroke-opacity', 0.6)

  if (reduce) {
    areas.attr('d', (d) => areaAt(1)(d))
  } else {
    areas
      .attr('d', (d) => areaAt(0)(d))
      .transition()
      .duration(GROW_MS)
      .ease(d3.easeCubicOut)
      .attrTween('d', function (d) {
        return (t) => areaAt(t)(d) as string
      })
  }

  // Right-edge partner labels at last data point — every partner gets a
  // label (a thin band must still read as present, never "missing"). Label
  // y-positions are collision-resolved into a right-side gutter; when a
  // label has to move off the band's true midpoint, a leader line + a
  // min-height tick mark at the true point keep the value traceable back to
  // its band without distorting the area encoding itself.
  const labelG = svg.append('g').attr('class', 'stacked-area__labels')
  const labelGutterX = width - margin.right + 8
  const trueEdgeX = width - margin.right

  const anchors = stackedSeries.map((s) => {
    const last = s[s.length - 1]
    return { key: s.key, y: (y(last[0]) + y(last[1])) / 2 }
  })
  const resolved = resolveLabelPositions(anchors, 14, margin.top + 6, height - margin.bottom - 6)
  const resolvedByKey = new Map(resolved.map((r) => [r.key, r]))

  // Three-way total for the latest year — denominator for the share labels.
  const lastYearData = props.data.series[props.data.series.length - 1]
  const lastYearTotal = stackKeys.reduce(
    (acc, k) => acc + ((lastYearData[k] as number) || 0),
    0
  )

  stackedSeries.forEach((s) => {
    const last = s[s.length - 1]
    const rawValue = (last.data as SeriesPoint)[s.key] as number
    const pos = resolvedByKey.get(s.key)
    if (!pos) return
    const color = PARTNER_COLOR[s.key] ?? 'rgba(255,255,255,0.8)'

    // Min-height marker at the true edge point.
    labelG.append('circle').attr('cx', trueEdgeX).attr('cy', pos.trueY).attr('r', 2).attr('fill', color)

    // Leader line only when the label had to be nudged off its true spot.
    if (Math.abs(pos.y - pos.trueY) > 2) {
      labelG
        .append('line')
        .attr('x1', trueEdgeX)
        .attr('y1', pos.trueY)
        .attr('x2', labelGutterX - 4)
        .attr('y2', pos.y)
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.5)
    }

    labelG
      .append('text')
      .attr('x', labelGutterX)
      .attr('y', pos.y)
      .attr('dy', '0.35em')
      .attr('fill', color)
      .attr('font-family', 'Encode Sans, system-ui, sans-serif')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('letter-spacing', '0.02em')
      .text(`${PARTNER_LABEL[s.key] ?? s.key} ${formatSharePct(rawValue, lastYearTotal)}`)
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

  // BF-87: the Y-axis top-tick dollar figure (the "~$250B" total Marshall
  // flagged) is intentionally removed. The unlabeled gridlines above still give
  // a sense of scale/growth without putting an absolute-dollar number on the
  // chart; relative proportions are carried by the per-partner share labels.
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
