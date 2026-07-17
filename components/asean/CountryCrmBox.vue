<script setup lang="ts">
// Critical-minerals fact card (BF-97). Replaces the nickel flow chart
// (CountryMineralFlowBand) for the 7 countries where that chart isn't
// meaningful. Slots into the same CardFlip back face / CountryChartCard
// body as the chart it replaces — a designed fact card, not a paragraph
// dump. The bold lead-in lives in CountryChartCard's own `title` slot (the
// consumer passes `note.leadIn` there); this component renders only the
// short supporting lines beneath it, so the lead-in isn't duplicated.

import type { CrmNote } from '~/data/asean/critical-minerals-notes'

defineProps<{
  note: CrmNote
}>()
</script>

<template>
  <div class="crm-box">
    <ul class="crm-box__lines">
      <li v-for="line in note.lines" :key="line" class="crm-box__line">
        {{ line }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.crm-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}

.crm-box__lines {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.crm-box__line {
  position: relative;
  padding-left: 14px;
  font-family: 'Encode Sans', system-ui, sans-serif;
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.78);
}

.crm-box__line::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.6em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: hsl(218, 60%, 68%);
}
</style>
