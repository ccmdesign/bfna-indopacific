<script setup lang="ts">
import { publishedInfographics } from '~/data/infographics'

definePageMeta({
  layoutClass: 'layout-home',
  suppressRotateOverlay: true
})

useHead({
  title: 'BFNA Indo-Pacific'
})

useSeoMeta({
  description: 'Interactive data visualizations exploring energy, trade, and geopolitics across the Indo-Pacific region.',
  ogTitle: 'BFNA Indo-Pacific',
  ogDescription: 'Interactive data visualizations exploring energy, trade, and geopolitics across the Indo-Pacific region.',
  ogType: 'website'
})
</script>

<template>
  <main class="homepage-hub">
    <header class="hub-header">
      <h1 class="hub-title">BFNA Indo-Pacific</h1>
      <p class="hub-subtitle">Interactive data visualizations</p>
    </header>
    <div class="infographic-cards" role="list" aria-label="Available infographics">
      <InfographicCard
        v-for="info in publishedInfographics"
        :key="info.slug"
        v-bind="info"
        role="listitem"
      />
    </div>
  </main>
</template>

<style scoped>
.homepage-hub {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
  margin: auto 0;
}

.hub-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.hub-title {
  font-size: var(--size-4);
  font-weight: 700;
  margin: 0;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0px 5px 5px rgba(0, 0, 0, 0.25);
}

.hub-subtitle {
  font-size: var(--size-1);
  color: rgba(255, 255, 255, 0.7);
  margin: var(--space-xs) 0 0 0;
  letter-spacing: 0.02em;
}

.infographic-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
  gap: var(--space-l);
  width: 100%;
}
</style>
