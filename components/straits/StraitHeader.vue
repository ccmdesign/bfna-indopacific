<script setup lang="ts">
import { meta } from '~/utils/straitsData'
import bfnaLogo from '~/assets/images/bfna.svg'

type SizeMetric = 'tonnage' | 'ships' | 'value'

const props = defineProps<{
  sizeMetric: SizeMetric
  cycling?: boolean
  cycleDuration?: number
  cycleKey?: number
  isHidden?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:sizeMetric', value: SizeMetric): void
}>()
</script>

<template>
  <header class="strait-header" :class="{ 'strait-header--hidden': isHidden }">
    <img :src="bfnaLogo" alt="BFNA" class="strait-header__logo" />
    <h2 class="strait-header__title">{{ meta.title }}</h2>
    <p class="strait-header__description">
      Visualize maritime traffic through six critical chokepoints, from Malacca to Hormuz, with vessel data from 2019 to 2025.
    </p>
    <div class="metric-toggle">
      <button
        v-for="m in (['tonnage', 'ships', 'value'] as const)"
        :key="m"
        :class="{ active: sizeMetric === m }"
        @click="emit('update:sizeMetric', m)"
      >
        {{ m === 'tonnage' ? 'Trade Volume' : m === 'ships' ? 'N. of Ships' : 'Trade Value' }}
        <span
          v-if="cycling && sizeMetric === m"
          :key="cycleKey"
          class="cycle-progress"
          :style="{ animationDuration: `${cycleDuration}ms` }"
        />
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
  position: relative;
  z-index: 10;
  transition: opacity 0.3s ease;
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
  position: relative;
  padding: 9px 21px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-family: 'Encode Sans', sans-serif;
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  overflow: hidden;
}

.metric-toggle button:first-child {
  border-radius: 4px 0 0 4px;
}

.metric-toggle button:last-child {
  border-radius: 0 4px 4px 0;
}

.metric-toggle button.active {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

.cycle-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.6);
  animation: progress-grow linear forwards;
}

@keyframes progress-grow {
  from { width: 0; }
  to { width: 100%; }
}

.strait-header--hidden {
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 1820px) {
  .strait-header__title {
    font-size: var(--size-2);
  }

  .strait-header__description {
    font-size: var(--size-0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cycle-progress {
    animation: none;
    width: 100%;
  }
}
</style>
