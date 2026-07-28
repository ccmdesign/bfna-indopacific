<script setup lang="ts">
import type { CountryKeyFacts } from '~/data/asean/country-profiles'

// `source` (BF-134): optional override for the attribution footnote. The
// default is the shared IMF WEO / World Bank line every country's indicator
// set draws from; the ASEAN bloc entry passes its own attribution instead.
withDefaults(defineProps<{
  keyFacts: CountryKeyFacts
  source?: string
}>(), {
  source:
    'GDP growth (2026): IMF WEO. GDP per capita PPP, trade-to-GDP and FDI net inflows (2024): World Bank.'
})
</script>

<template>
  <!-- Key Facts (BF-96): 4 economic indicators + 3 trade-agreement rows on the
       Description tab, replacing the removed hero big-number (two-way trade
       with China). Styling mirrors the sidebar's existing Encode Sans /
       translucent-white system — StraitQualPanel's .plane-facts list is a
       reference only, not shared markup (different visual context). -->
  <div class="country-key-facts">
    <h3 class="country-key-facts__heading">Key Facts</h3>

    <dl class="country-key-facts__list">
      <div
        v-for="row in keyFacts.indicators"
        :key="row.label"
        class="country-key-facts__row"
      >
        <dt class="country-key-facts__label">{{ row.label }}</dt>
        <dd class="country-key-facts__value">{{ row.value }}</dd>
      </div>
      <div
        v-for="row in keyFacts.agreements"
        :key="row.label"
        class="country-key-facts__row"
      >
        <dt class="country-key-facts__label">{{ row.label }}</dt>
        <dd class="country-key-facts__value">{{ row.value }}</dd>
      </div>
    </dl>

    <p class="country-key-facts__source">
      Source: {{ source }}
    </p>
  </div>
</template>

<style scoped>
.country-key-facts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.country-key-facts__heading {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.country-key-facts__list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.country-key-facts__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.country-key-facts__row:last-child {
  border-bottom: none;
}

.country-key-facts__label {
  margin: 0;
  flex: 1 1 auto;
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
}

.country-key-facts__value {
  margin: 0;
  flex: 0 0 auto;
  max-width: 55%;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-variant-numeric: tabular-nums;
}

.country-key-facts__source {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.03em;
}
</style>
