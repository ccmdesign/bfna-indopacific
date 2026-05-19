<script setup lang="ts">
import * as d3 from 'd3'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  MINERALS_ASEAN,
  type CountryMinerals,
  type MineralShare
} from '~/data/asean/minerals.generated'

const props = defineProps<{
  data: CountryMinerals
  height?: number
}>()

// One Voice Rule (DESIGN.md): the active country's world share is Meridian;
// the "rest of world" remainder is a low-α white track — no second saturated
// accent introduced. Color is never the SOLE carrier here: every row also
// carries the mineral name, the share %, and the absolute production + unit.
const MERIDIAN = 'hsl(218, 60%, 58%)'
const REST_TRACK = 'rgba(255,255,255,0.10)'

const chartContainer = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const hasData = computed(
  () => props.data.hasMaterialData && props.data.production.length > 0
)

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function fmtShare(v: number): string {
  return v >= 1 ? `${v.toFixed(1)}%` : `${v.toFixed(2)}%`
}

function fmtProduction(p: MineralShare): string {
  const n = p.production
  const unit = /thousand/i.test(p.unit) ? 'kt' : 't'
  // The "thousand …" units are already in thousands; plain "metric tons" is t.
  // No rescale needed — the source figure is displayed as-is under its unit.
  const scaled = n
  let num: string
  if (scaled >= 1_000_000) num = `${(scaled / 1_000_000).toFixed(1)}M`
  else if (scaled >= 1_000) num = `${(scaled / 1_000).toFixed(0)}k`
  else num = String(scaled)
  return `${num} ${unit}`
}

function draw() {
  if (!chartContainer.value) return
  chartContainer.value.innerHTML = ''
  if (!hasData.value) return // D2 honest state is rendered in the template

  const width = chartContainer.value.clientWidth
  const height = props.height ?? 220
  if (width === 0) {
    setTimeout(draw, 80)
    return
  }

  const reduce = prefersReducedMotion()
  const bars = props.data.production // already sorted by share desc

  const margin = { top: 16, right: 12, bottom: 26, left: 96 }
  const innerW = width - margin.left - margin.right

  const y = d3
    .scaleBand<string>()
    .domain(bars.map((d) => d.mineral))
    .range([margin.top, height - margin.bottom])
    .paddingInner(0.34)
    .paddingOuter(0.12)

  // Fixed 0–100 domain so bar length reads as a literal share of the world.
  const x = d3.scaleLinear().domain([0, 100]).range([0, innerW])

  const svg = d3
    .select(chartContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('class', 'mineral-bars__svg')

  const rowG = svg
    .append('g')
    .selectAll('g')
    .data(bars)
    .join('g')
    .attr('transform', (d) => `translate(0, ${y(d.mineral) ?? 0})`)

  // Faint full-width "rest of world" track — gives every bar a 100% frame so
  // length is read against the whole world, not just the visible max.
  rowG
    .append('rect')
    .attr('x', margin.left)
    .attr('y', 0)
    .attr('width', innerW)
    .attr('height', y.bandwidth())
    .attr('fill', REST_TRACK)
    .attr('rx', 2)

  // The country's share bar (Meridian).
  const valueBar = rowG
    .append('rect')
    .attr('x', margin.left)
    .attr('y', 0)
    .attr('height', y.bandwidth())
    .attr('fill', MERIDIAN)
    .attr('rx', 2)

  if (reduce) {
    valueBar.attr('width', (d) => Math.max(2, x(d.sharePct)))
  } else {
    valueBar
      .attr('width', 0)
      .transition()
      .duration(560)
      .ease(d3.easeCubicOut)
      .attr('width', (d) => Math.max(2, x(d.sharePct)))
  }

  rowG
    .append('title')
    .text(
      (d) =>
        `${d.mineral}: ${fmtShare(d.sharePct)} of world mine production` +
        ` (${fmtProduction(d)})`
    )

  // Mineral name — left gutter, AA-contrast white (data, not ornament).
  rowG
    .append('text')
    .attr('x', margin.left - 10)
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.34em')
    .attr('text-anchor', 'end')
    .attr('fill', 'rgba(255,255,255,0.92)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .text((d) =>
      d.mineral.length > 14 ? d.mineral.slice(0, 13) + '…' : d.mineral
    )
    .append('title')
    .text((d) => d.mineral)

  // Share % + absolute production — placed just past the bar end, or inside
  // if the bar is long enough. Two independent encodings beside length.
  rowG.each(function (d) {
    const g = d3.select(this)
    const barW = Math.max(2, x(d.sharePct))
    const inside = barW > 120
    const labelX = inside ? margin.left + barW - 8 : margin.left + barW + 8
    g.append('text')
      .attr('x', labelX)
      .attr('y', y.bandwidth() / 2)
      .attr('dy', '0.34em')
      .attr('text-anchor', inside ? 'end' : 'start')
      .attr('fill', inside ? '#ffffff' : 'rgba(255,255,255,0.92)')
      .attr('font-family', 'Encode Sans, system-ui, sans-serif')
      .attr('font-size', 11)
      .attr('font-weight', 700)
      .attr('font-variant-numeric', 'tabular-nums')
      .text(`${fmtShare(d.sharePct)} · ${fmtProduction(d)}`)
  })

  // Axis caption: what the length means + the rest-of-world reading.
  svg
    .append('text')
    .attr('x', margin.left)
    .attr('y', height - 8)
    .attr('text-anchor', 'start')
    .attr('fill', 'rgba(255,255,255,0.55)')
    .attr('font-family', 'Encode Sans, system-ui, sans-serif')
    .attr('font-size', 9.5)
    .attr('font-weight', 600)
    .attr('letter-spacing', '0.06em')
    .text('SHARE OF WORLD MINE PRODUCTION → · TRACK = REST OF WORLD')
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
  <!-- D2 honest state: a designed, AA-contrast typographic statement for
       countries with no material critical-minerals footprint. NOT a blank
       chart and NOT a zero-height bar. -->
  <div v-if="!hasData" class="mineral-bars mineral-bars--empty">
    <p class="mineral-bars__empty-lede">
      Not a critical-minerals producer at scale.
    </p>
    <p class="mineral-bars__empty-context">
      {{ MINERALS_ASEAN.concentrationSentence }}
      Indonesia alone is {{ MINERALS_ASEAN.nickelWorldSharePct.toFixed(0) }}%
      of world nickel with the Philippines; Myanmar carries
      {{ MINERALS_ASEAN.myanmarRareEarthsSharePct.toFixed(1) }}% of world rare
      earths.
    </p>
  </div>
  <div v-else ref="chartContainer" class="mineral-bars" aria-hidden="true" />
</template>

<style scoped>
.mineral-bars {
  width: 100%;
  min-height: 200px;
}

.mineral-bars :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.mineral-bars--empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 28px 8px;
  min-height: 200px;
}

.mineral-bars__empty-lede {
  margin: 0;
  font-family: 'Encode Sans', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  /* α 0.92 — data-tier text, AA on the navy card surface. */
  color: rgba(255, 255, 255, 0.92);
}

.mineral-bars__empty-context {
  margin: 0;
  font-family: 'Encode Sans', system-ui, sans-serif;
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.5;
  /* α 0.78 — still ≥ 4.5:1 body contrast on the card, not ornamental. */
  color: rgba(255, 255, 255, 0.78);
}
</style>
