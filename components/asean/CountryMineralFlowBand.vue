<script setup lang="ts">
import * as d3 from 'd3'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  MINERALS_ASEAN,
  type CountryMinerals,
  type FlowSegment
} from '~/data/asean/minerals.generated'

const props = defineProps<{
  data: CountryMinerals
  height?: number
}>()

// One Voice Rule (DESIGN.md): China — the refining hub the SCOUT §4 two-hop
// warning is about — is the single Meridian segment; every other destination
// sits on the white α-ladder. No second saturated accent. Color is never the
// SOLE carrier: every visible segment is text-labelled with partner + share,
// and the two-hop reality is stated in the caption, not just colored.
const MERIDIAN = 'hsl(218, 60%, 58%)'
const SEGMENT_SEPARATOR = 'rgba(0,0,0,0.30)'

// Non-China destinations: descending white α so order/position carries weight
// without a competing hue.
const LADDER: Record<string, string> = {
  USA: 'rgba(255,255,255,0.42)',
  EU: 'rgba(255,255,255,0.34)',
  JPN: 'rgba(255,255,255,0.26)',
  KOR: 'rgba(255,255,255,0.20)',
  OTHER: 'rgba(255,255,255,0.14)'
}

const PARTNER_LABEL: Record<string, string> = {
  CHN: 'China',
  USA: 'United States',
  EU: 'European Union',
  JPN: 'Japan',
  KOR: 'South Korea',
  OTHER: 'Other'
}

const chartContainer = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const hasData = computed(
  () =>
    props.data.hasMaterialData &&
    props.data.flows.length > 0 &&
    props.data.flowsTotalUsdM > 0
)

const chinaPct = computed(() => {
  const chn = props.data.flows.find((f) => f.partnerGroup === 'CHN')
  return chn ? Math.round(chn.pct) : 0
})

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function fmtUsd(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`
  if (m >= 1) return `$${Math.round(m)}M`
  return `$${m.toFixed(1)}M`
}

// Fold segments too thin to label into one trailing "Other" so there are no
// unlabelled slivers — mirrors CountryStackedArea's cramped-band skip guard,
// adapted to width.
function layoutSegments(total: number, innerW: number): FlowSegment[] {
  const MIN_PX = 26
  const ordered = [...props.data.flows]
  const big: FlowSegment[] = []
  let foldedVal = 0
  let foldedPct = 0
  for (const s of ordered) {
    const px = (s.valueUsdM / total) * innerW
    // China is always shown explicitly regardless of width.
    if (px >= MIN_PX || s.partnerGroup === 'CHN') {
      big.push(s)
    } else {
      foldedVal += s.valueUsdM
      foldedPct += s.pct
    }
  }
  if (foldedVal > 0) {
    const existingOther = big.find((s) => s.partnerGroup === 'OTHER')
    if (existingOther) {
      existingOther.valueUsdM += foldedVal
      existingOther.pct += foldedPct
    } else {
      big.push({
        partnerGroup: 'OTHER',
        valueUsdM: Number(foldedVal.toFixed(1)),
        pct: Number(foldedPct.toFixed(1))
      })
    }
  }
  return big
}

function draw() {
  if (!chartContainer.value) return
  chartContainer.value.innerHTML = ''
  if (!hasData.value) return // D2 honest state rendered in the template

  const width = chartContainer.value.clientWidth
  const height = props.height ?? 220
  if (width === 0) {
    setTimeout(draw, 80)
    return
  }

  const reduce = prefersReducedMotion()
  const total = props.data.flowsTotalUsdM
  const margin = { top: 30, right: 12, bottom: 16, left: 12 }
  const innerW = width - margin.left - margin.right
  const bandH = 54
  const bandY = margin.top + 10

  const segments = layoutSegments(total, innerW)
  const x = d3.scaleLinear().domain([0, total]).range([0, innerW])

  const svg = d3
    .select(chartContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('class', 'mineral-flow__svg')

  // Origin → hub label above the band — states the two-hop chain in words so
  // the single bar is honest about the routing.
  svg
    .append('text')
    .attr('x', margin.left)
    .attr('y', margin.top - 8)
    .attr('fill', 'rgba(255,255,255,0.92)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('letter-spacing', '0.04em')
    .text(`${props.data.iso3} NICKEL EXPORTS → BY DESTINATION · 2024`)

  svg
    .append('text')
    .attr('x', width - margin.right)
    .attr('y', margin.top - 8)
    .attr('text-anchor', 'end')
    .attr('fill', 'rgba(255,255,255,0.92)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 11)
    .attr('font-weight', 700)
    .attr('font-variant-numeric', 'tabular-nums')
    .text(fmtUsd(total))

  let cursor = margin.left
  const segG = svg.append('g')

  segments.forEach((s) => {
    const w = Math.max(1, x(s.valueUsdM))
    const isChina = s.partnerGroup === 'CHN'
    const x0 = cursor
    cursor += w

    const rect = segG
      .append('rect')
      .attr('x', x0)
      .attr('y', bandY)
      .attr('height', bandH)
      .attr('fill', isChina ? MERIDIAN : LADDER[s.partnerGroup] ?? LADDER.OTHER)
      .attr('stroke', SEGMENT_SEPARATOR)
      .attr('stroke-width', 1)

    if (reduce) {
      rect.attr('width', w)
    } else {
      rect
        .attr('width', 0)
        .transition()
        .duration(620)
        .ease(d3.easeCubicOut)
        .attr('width', w)
    }

    rect
      .append('title')
      .text(
        `${PARTNER_LABEL[s.partnerGroup] ?? s.partnerGroup}: ` +
          `${fmtUsd(s.valueUsdM)} (${Math.round(s.pct)}%)`
      )

    // Every visible segment is labelled (color is not the sole carrier).
    // Wide segments label inside; narrow ones label below with a tick.
    const labelInside = w > 72
    const cx = x0 + w / 2
    if (labelInside) {
      segG
        .append('text')
        .attr('x', cx)
        .attr('y', bandY + bandH / 2 - 4)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.34em')
        .attr('fill', isChina ? '#ffffff' : 'rgba(255,255,255,0.92)')
        .attr('font-family', 'Encode Sans, system-ui, sans-serif')
        .attr('font-size', 12)
        .attr('font-weight', 700)
        .text(PARTNER_LABEL[s.partnerGroup] ?? s.partnerGroup)
      segG
        .append('text')
        .attr('x', cx)
        .attr('y', bandY + bandH / 2 + 13)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.34em')
        .attr('fill', isChina ? '#ffffff' : 'rgba(255,255,255,0.85)')
        .attr('font-family', 'Encode Sans, system-ui, sans-serif')
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .attr('font-variant-numeric', 'tabular-nums')
        .text(`${Math.round(s.pct)}% · ${fmtUsd(s.valueUsdM)}`)
    } else {
      // Tick + label beneath narrow segments — no unlabelled sliver.
      segG
        .append('line')
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y1', bandY + bandH)
        .attr('y2', bandY + bandH + 8)
        .attr('stroke', 'rgba(255,255,255,0.4)')
        .attr('stroke-width', 1)
      segG
        .append('text')
        .attr('x', cx)
        .attr('y', bandY + bandH + 20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.85)')
        .attr('font-family', 'Encode Sans, system-ui, sans-serif')
        .attr('font-size', 10)
        .attr('font-weight', 600)
        .attr('font-variant-numeric', 'tabular-nums')
        .text(
          `${PARTNER_LABEL[s.partnerGroup] ?? s.partnerGroup} ` +
            `${Math.round(s.pct)}%`
        )
    }
  })

  // Two-hop caption (D4 / SCOUT §4) — the line that makes a single bar honest
  // about the ASEAN → China → West chain, plus the growth context.
  const cap = svg
    .append('text')
    .attr('x', margin.left)
    .attr('y', height - 18)
    .attr('fill', 'rgba(255,255,255,0.85)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 11)
    .attr('font-weight', 400)
  cap
    .append('tspan')
    .text(
      `~${chinaPct.value}% routes through China, which refines & re-exports ` +
        `to the US & EU.`
    )
  svg
    .append('text')
    .attr('x', margin.left)
    .attr('y', height - 4)
    .attr('fill', 'rgba(255,255,255,0.85)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('font-variant-numeric', 'tabular-nums')
    .text(
      `ASEAN nickel exports ×${props.data.flowsGrowthMultiple} since 2010.`
    )
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
  <!-- D2 honest state — designed, AA-contrast, never a blank band. -->
  <div v-if="!hasData" class="mineral-flow mineral-flow--empty">
    <p class="mineral-flow__empty-lede">
      Negligible direct critical-mineral exports.
    </p>
    <p class="mineral-flow__empty-context">
      The ASEAN mineral-flow story is overwhelmingly Indonesia's nickel to
      China — exports up ×{{ MINERALS_ASEAN.nickelGrowthMultiple }} since 2010,
      then refined and re-exported to the US &amp; EU.
    </p>
  </div>
  <div v-else ref="chartContainer" class="mineral-flow" aria-hidden="true" />
</template>

<style scoped>
.mineral-flow {
  width: 100%;
  min-height: 200px;
}

.mineral-flow :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.mineral-flow--empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 28px 8px;
  min-height: 200px;
}

.mineral-flow__empty-lede {
  margin: 0;
  font-family: 'Encode Sans', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.92);
}

.mineral-flow__empty-context {
  margin: 0;
  font-family: 'Encode Sans', system-ui, sans-serif;
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.78);
}
</style>
