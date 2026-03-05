<script setup lang="ts">
import straitsData from '~/data/straits/straits.json'

const straits = straitsData.straits
const meta = straitsData.meta
</script>

<template>
  <div class="strait-map-container">
    <h2 id="strait-map-title" class="map-title">{{ meta.title }}</h2>
    <ul class="strait-list" aria-labelledby="strait-map-title">
      <li v-for="strait in straits" :key="strait.id" class="strait-item">
        <strong>{{ strait.name }}</strong>
        <span class="strait-meta">{{ strait.globalShareLabel }}</span>
        <span class="strait-value">{{ strait.valueLabel }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.strait-map-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-l);
  padding-bottom: calc(var(--space-l) + 4rem); /* Reserve space for absolute-positioned footer */
  color: rgba(255, 255, 255, 0.9);
}

.map-title {
  font-family: 'Encode Sans', sans-serif;
  font-size: var(--size-3);
  font-weight: 600;
  margin-bottom: var(--space-m);
}

.strait-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-m);
  width: 100%;
  max-width: 1200px;
}

.strait-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  padding: var(--space-m);
  background: var(--color-card-bg);
  backdrop-filter: blur(8px);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px var(--color-shadow);
}

.strait-item strong {
  font-size: var(--size-1);
}

.strait-meta {
  font-size: var(--size-0);
  color: var(--color-text-muted);
}

.strait-value {
  font-size: var(--size-0);
  color: var(--color-accent);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .strait-item {
    backdrop-filter: none;
  }
}
</style>
