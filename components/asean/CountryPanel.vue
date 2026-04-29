<script setup lang="ts">
import type { CountryDescriptor } from '~/data/asean/country-tiers'
import type { CountryProfile } from '~/data/asean/placeholder-data'

const props = defineProps<{
  country: CountryDescriptor
  profile: CountryProfile | undefined
}>()

const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <aside class="country-panel" aria-label="Country profile">
    <header class="country-panel__header">
      <div class="country-panel__title-row">
        <span class="country-panel__flag" aria-hidden="true">{{ country.flag }}</span>
        <h2 class="country-panel__name">{{ country.name }}</h2>
        <button
          type="button"
          class="country-panel__close"
          aria-label="Close country profile"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <p v-if="profile" class="country-panel__subhead">{{ profile.subhead }}</p>
      <p v-else class="country-panel__subhead">
        Stretch tier — limited V1 data. Profile arrives with the May 2026 dataset.
      </p>
    </header>

    <template v-if="profile">
      <section class="country-panel__section">
        <div class="country-panel__big">
          <div class="country-panel__big-num">{{ profile.bigMetric.value }}</div>
          <div class="country-panel__big-label">{{ profile.bigMetric.label }}</div>
        </div>
        <div class="country-panel__secondary">
          <div class="country-panel__sec-num">{{ profile.bigSecondary.value }}</div>
          <div class="country-panel__sec-label">{{ profile.bigSecondary.label }}</div>
        </div>
      </section>

      <section class="country-panel__section">
        <h3 class="country-panel__section-heading">Partner share</h3>
        <CountryShareBar
          v-for="entry in profile.shares"
          :key="entry.label"
          :entry="entry"
        />
      </section>

      <section class="country-panel__section">
        <div class="country-panel__section-row">
          <h3 class="country-panel__section-heading">Strategic profile</h3>
          <span class="country-panel__period">2020 → 2025</span>
        </div>
        <div class="country-panel__radar-wrap">
          <CountryRadar
            :axes="profile.radar.axes"
            :layers="profile.radar.layers"
            :size="320"
          />
        </div>
        <ul class="country-panel__radar-legend">
          <li v-for="(layer, i) in profile.radar.layers" :key="i">
            <span
              class="country-panel__radar-swatch"
              :class="`country-panel__radar-swatch--${i}`"
              aria-hidden="true"
            />
            {{ layer.label }}
          </li>
        </ul>
      </section>

      <p class="country-panel__caption">{{ profile.caption }}</p>
    </template>
  </aside>
</template>

<style scoped>
.country-panel {
  background: rgba(2, 38, 64, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: var(--space-m);
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Encode Sans', sans-serif;
  height: 100%;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.country-panel__header {
  padding-bottom: var(--space-s);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.country-panel__title-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.country-panel__flag {
  font-size: 1.5rem;
  line-height: 1;
}

.country-panel__name {
  font-size: var(--size-2);
  font-weight: 600;
  margin: 0;
  color: #fff;
  letter-spacing: 0;
  flex: 1;
}

.country-panel__close {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.25rem;
  transition: color 200ms ease;
}

.country-panel__close:hover {
  color: #fff;
}

.country-panel__close:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

.country-panel__subhead {
  font-size: var(--size-0);
  color: rgba(255, 255, 255, 0.6);
  margin: 0.5rem 0 0;
  line-height: 1.5;
}

.country-panel__section {
  padding: var(--space-s) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.country-panel__section:last-of-type {
  border-bottom: 0;
}

.country-panel__section-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
}

.country-panel__section-heading {
  font-size: var(--size--1);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 var(--space-xs);
}

.country-panel__period {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

.country-panel__big {
  margin-bottom: var(--space-s);
}

.country-panel__big-num {
  font-size: var(--size-4);
  font-weight: 600;
  line-height: 1;
  color: #fff;
  font-variant-numeric: tabular-nums;
  margin-bottom: 0.25rem;
}

.country-panel__big-label,
.country-panel__sec-label {
  font-size: var(--size--1);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.country-panel__secondary {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.country-panel__sec-num {
  font-size: var(--size-2);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  font-variant-numeric: tabular-nums;
}

.country-panel__radar-wrap {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.country-panel__radar-legend {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.625rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.country-panel__radar-legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.country-panel__radar-swatch {
  display: inline-block;
  width: 14px;
  height: 2px;
}

.country-panel__radar-swatch--0 {
  background: rgba(255, 255, 255, 0.55);
}

.country-panel__radar-swatch--1 {
  background: hsl(218, 60%, 58%);
}

.country-panel__caption {
  margin: var(--space-s) 0 0;
  font-size: var(--size-0);
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
  font-style: italic;
}
</style>
