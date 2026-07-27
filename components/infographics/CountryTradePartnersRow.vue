<script setup lang="ts">
import { computed } from 'vue'
import type { StackedAreaData } from '~/data/asean/trade-stacked'

// BF-133 (decided BF-86) — Marshall's confirmed 14 Jul ask: the China/US/EU
// trade figures side by side on every country page, "$125B China / $60B US /
// $25B EU" style, instead of living only in the Trade paragraph prose. Fed by
// the same BACI two-way-trade dataset as the stacked-area chart below it, so
// the row and the chart can never disagree; always the latest series year.
const props = defineProps<{
  data: StackedAreaData
}>()

const latest = computed(() => props.data.series[props.data.series.length - 1])

// Abbreviated USD billions, one decimal only if needed ($142.6B, $60B).
// Values arrive in USD millions; sub-$1B falls back to $NNNM so small
// economies (Timor-Leste) never render as "$0B".
function fmtUsd(millions: number): string {
  if (millions >= 1000) {
    const b = millions / 1000
    const rounded = Math.round(b * 10) / 10
    return Number.isInteger(rounded) ? `$${rounded}B` : `$${rounded.toFixed(1)}B`
  }
  return `$${Math.round(millions)}M`
}

const items = computed(() => {
  const point = latest.value
  if (!point) return []
  return [
    { partner: 'China', value: fmtUsd(point.CHN) },
    { partner: 'US', value: fmtUsd(point.USA) },
    { partner: 'EU', value: fmtUsd(point.EU) }
  ]
})
</script>

<template>
  <div v-if="latest" class="trade-partners-row">
    <p class="trade-partners-row__figures">
      <template v-for="(item, i) in items" :key="item.partner">
        <span v-if="i > 0" class="trade-partners-row__sep" aria-hidden="true">/</span>
        <span class="trade-partners-row__item">
          <span class="trade-partners-row__value">{{ item.value }}</span>
          <span class="trade-partners-row__partner">{{ item.partner }}</span>
        </span>
      </template>
    </p>
    <p class="trade-partners-row__basis">
      Two-way goods trade · {{ latest.year }} · CEPII BACI
    </p>
  </div>
</template>

<style scoped>
/* Compact side-by-side row, matching the sidebar's Encode Sans /
   translucent-white system (see CountryKeyFacts). Sits between the Trade
   prose and the chart cards. */
.trade-partners-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 0 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.trade-partners-row__figures {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 8px;
  row-gap: 2px;
  font-family: 'Encode Sans', sans-serif;
}

.trade-partners-row__item {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  white-space: nowrap;
}

.trade-partners-row__value {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  font-variant-numeric: tabular-nums;
}

.trade-partners-row__partner {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.6);
}

.trade-partners-row__sep {
  font-size: 13px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.3);
}

.trade-partners-row__basis {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.03em;
}
</style>
