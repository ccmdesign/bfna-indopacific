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

  const totalLabel = svg
    .append('text')
    .attr('x', width - margin.right)
    .attr('y', margin.top - 8)
    .attr('text-anchor', 'end')
    .attr('fill', 'rgba(255,255,255,0.92)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 11)
    .attr('font-weight', 700)
    .attr('font-variant-numeric', 'tabular-nums')
  if (reduce) {
    totalLabel.text(fmtUsd(total))
  } else {
    totalLabel
      .text(fmtUsd(0))
      .transition()
      .duration(620)
      .ease(d3.easeCubicOut)
      .tween('text', function () {
        const node = this as SVGTextElement
        const i = d3.interpolateNumber(0, total)
        return (t) => {
          node.textContent = fmtUsd(i(t))
        }
      })
  }

  let cursor = margin.left
  const segG = svg.append('g')

  // Below-band labels are collected during the segment pass and rendered
  // after a single left-to-right declutter pass so two adjacent thin slices
  // (e.g. "Japan 5%" then "Other 5%") never print on top of each other.
  // The leader tick stays at the true segment center; only the text nudges.
  interface BelowLabel {
    cx: number // true segment center — tick anchor (never moves)
    text: string // final text — used for declutter width measurement
    textAt: (t: number) => string // count-up text by progress
  }
  const belowLabels: BelowLabel[] = []

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
      const insideAt = (t: number) =>
        `${Math.round(s.pct * t)}% · ${fmtUsd(s.valueUsdM * t)}`
      const insideLabel = segG
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
      if (reduce) {
        insideLabel.text(insideAt(1))
      } else {
        insideLabel
          .text(insideAt(0))
          .transition()
          .duration(620)
          .ease(d3.easeCubicOut)
          .tween('text', function () {
            const node = this as SVGTextElement
            return (t) => {
              node.textContent = insideAt(t)
            }
          })
      }
    } else {
      // Defer: collected and rendered after the loop so adjacent narrow
      // segments' labels can be decluttered as a group.
      const partner = PARTNER_LABEL[s.partnerGroup] ?? s.partnerGroup
      belowLabels.push({
        cx,
        text: `${partner} ${Math.round(s.pct)}%`,
        textAt: (t: number) => `${partner} ${Math.round(s.pct * t)}%`
      })
    }
  })

  // Tick + label beneath narrow segments — no unlabelled sliver. A single
  // left-to-right pass pushes any label whose extent overlaps the previous
  // one rightward by the minimum delta (1-D declutter, the standard
  // D3-in-Vue pattern), clamped to the chart's right edge. The leader tick
  // always stays at the true segment center so the label still reads to its
  // slice. Reduced-motion safe: this is layout-only, no transition added.
  if (belowLabels.length > 0) {
    const labelY = bandY + bandH + 20
    const tickTop = bandY + bandH
    const tickBottom = bandY + bandH + 8
    // ~5.4px per glyph at 10px Encode Sans + a small gutter between labels.
    const estWidth = (t: string) => t.length * 5.4
    const GUTTER = 6
    const rightEdge = width - margin.right

    const placed = belowLabels.map((l) => ({ ...l, x: l.cx }))
    // Forward pass: keep each label at least its half-width + gutter clear
    // of the previous label's right extent.
    for (let i = 1; i < placed.length; i++) {
      const prev = placed[i - 1]
      const prevHalf = estWidth(prev.text) / 2
      const curHalf = estWidth(placed[i].text) / 2
      const minX = prev.x + prevHalf + GUTTER + curHalf
      if (placed[i].x < minX) placed[i].x = minX
    }
    // Backward pass: if decluttering pushed the last label past the right
    // edge, walk back left so nothing clips off-canvas.
    for (let i = placed.length - 1; i >= 0; i--) {
      const half = estWidth(placed[i].text) / 2
      const maxX = i === placed.length - 1 ? rightEdge - half : placed[i].x
      if (placed[i].x > maxX) placed[i].x = maxX
      if (i > 0) {
        const curHalf = estWidth(placed[i].text) / 2
        const prevHalf = estWidth(placed[i - 1].text) / 2
        const maxPrev = placed[i].x - curHalf - GUTTER - prevHalf
        if (placed[i - 1].x > maxPrev) placed[i - 1].x = maxPrev
      }
    }

    placed.forEach((l) => {
      // Tick stays at the true segment center; if the label was nudged, draw
      // a short angled leader so the label still visibly belongs to its slice.
      segG
        .append('line')
        .attr('x1', l.cx)
        .attr('x2', l.cx)
        .attr('y1', tickTop)
        .attr('y2', tickBottom)
        .attr('stroke', 'rgba(255,255,255,0.4)')
        .attr('stroke-width', 1)
      if (Math.abs(l.x - l.cx) > 1) {
        segG
          .append('line')
          .attr('x1', l.cx)
          .attr('x2', l.x)
          .attr('y1', tickBottom)
          .attr('y2', labelY - 9)
          .attr('stroke', 'rgba(255,255,255,0.25)')
          .attr('stroke-width', 1)
      }
      const belowLabel = segG
        .append('text')
        .attr('x', l.x)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.85)')
        .attr('font-family', 'Encode Sans, system-ui, sans-serif')
        .attr('font-size', 10)
        .attr('font-weight', 600)
        .attr('font-variant-numeric', 'tabular-nums')
      if (reduce) {
        belowLabel.text(l.textAt(1))
      } else {
        belowLabel
          .text(l.textAt(0))
          .transition()
          .duration(620)
          .ease(d3.easeCubicOut)
          .tween('text', function () {
            const node = this as SVGTextElement
            return (t) => {
              node.textContent = l.textAt(t)
            }
          })
      }
    })
  }

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

/* Honest "non-data" state: sized to its text, not the 200px data floor, so it
   reads as the lighter non-data card it is (shorter than the Trade data card). */
.mineral-flow--empty {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 8px;
  min-height: 0;
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
