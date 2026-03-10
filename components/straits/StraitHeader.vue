<script setup lang="ts">
import { meta } from '~/utils/straitsData'
import bfnaLogo from '~/assets/images/bfna.svg'

type SizeMetric = 'tonnage' | 'ships' | 'value'

defineProps<{
  sizeMetric: SizeMetric
}>()

const emit = defineEmits<{
  (e: 'update:sizeMetric', value: SizeMetric): void
}>()
</script>

<template>
  <header class="strait-header">
    <img :src="bfnaLogo" alt="BFNA" class="strait-header__logo" />
    <h2 class="strait-header__title">{{ meta.title }}</h2>
    <p class="strait-header__description">
      Visualize maritime traffic through six critical chokepoints, from Malacca to Hormuz, with vessel data from 2019 to 2025.
    </p>
    <div class="metric-toggle">
      <button
        :class="{ active: sizeMetric === 'tonnage' }"
        @click="emit('update:sizeMetric', 'tonnage')"
      >
        Trade Volume
      </button>
      <button
        :class="{ active: sizeMetric === 'ships' }"
        @click="emit('update:sizeMetric', 'ships')"
      >
        N. of Ships
      </button>
      <button
        :class="{ active: sizeMetric === 'value' }"
        @click="emit('update:sizeMetric', 'value')"
      >
        Trade Value
      </button>
    </div>
    <p class="strait-header__source">{{ meta.dataSource }}</p>
  </header>
</template>

<style scoped>
.strait-header {
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 0 2rem;
  z-index: 1;
}

.strait-header__logo {
  width: 120px;
  margin-bottom: 1rem;
}

.strait-header__title {
  font-family: 'Encode Sans', sans-serif;
  font-size: calc(var(--size-5) * .7);
  font-weight: 600;
  line-height: 1.1;
  color: #fff;
  margin: 0;
}

.strait-header__description {
  font-family: 'Encode Sans', sans-serif;
  font-size: var(--size-1);
  font-weight: 400;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6);
  max-width: 50ch;
}

.strait-header__source {
  font-family: 'Encode Sans', sans-serif;
  font-size: 11px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.35);
  margin: 1.5rem 0 0;
}

.metric-toggle {
  display: flex;
  gap: 0;
  margin-top: 1rem;
  pointer-events: auto;
}

.metric-toggle button {
  padding: 7px 17px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-family: 'Encode Sans', sans-serif;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.metric-toggle button:first-child {
  border-radius: 4px 0 0 4px;
}

.metric-toggle button + button {
  border-left: none;
}

.metric-toggle button:last-child {
  border-radius: 0 4px 4px 0;
}

.metric-toggle button.active {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}
</style>
