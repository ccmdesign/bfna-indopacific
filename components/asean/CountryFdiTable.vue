<script setup lang="ts">
import type { FdiInflowTable } from '~/data/asean/country-profiles'

// BF-134: the bloc entry's FDI-inflow table (Source × years, US$ millions,
// ASEANstats). A plain data table — the doc provides bloc-level totals, not
// the per-country chart series, so nothing is charted or interpolated. Values
// arrive pre-formatted so the doc's figures render digit-for-digit. Slots into
// the CountryChartCard shell for the shared card chrome.
defineProps<{
  data: FdiInflowTable
}>()
</script>

<template>
  <div class="fdi-table-wrap">
    <table class="fdi-table">
      <thead>
        <tr>
          <th scope="col" class="fdi-table__label-col">Source</th>
          <th v-for="year in data.years" :key="year" scope="col" class="fdi-table__num">
            {{ year }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in data.rows" :key="row.label">
          <th scope="row" class="fdi-table__label-col">{{ row.label }}</th>
          <td v-for="(value, i) in row.values" :key="data.years[i]" class="fdi-table__num">
            {{ value }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.fdi-table-wrap {
  width: 100%;
  overflow-x: auto;
}

/* Mirrors CountryKeyFacts' list rhythm: small Encode Sans rows, hairline
   separators, dim labels and bright tabular-num values. */
.fdi-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Encode Sans', sans-serif;
}

.fdi-table th,
.fdi-table td {
  padding: 6px 0 6px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.fdi-table thead th {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
}

.fdi-table tbody tr:last-child th,
.fdi-table tbody tr:last-child td {
  border-bottom: none;
}

.fdi-table__label-col {
  padding-left: 0;
  text-align: left;
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
}

.fdi-table__num {
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
