<script setup lang="ts">
// Generic chart card. The chart itself slots in via the default <slot/>, so
// the same shell can host the stacked-area (Thesis A + D), a minerals flow
// chart (Thesis B), or any future hypothesis-specific visual.

defineProps<{
  /** Eyebrow label, e.g. "Thesis A · Trade flows". */
  eyebrow?: string
  /** Section title shown next to the eyebrow. */
  title: string
  /** Right-aligned meta text, e.g. "USD billions · 2010–2024". */
  meta?: string
  /** Source attribution shown bottom-left. */
  source?: string
}>()
</script>

<template>
  <article class="chart-card" aria-label="Active country chart">
    <header class="chart-card__header">
      <div class="chart-card__title-block">
        <p v-if="eyebrow" class="chart-card__eyebrow">{{ eyebrow }}</p>
        <h3 class="chart-card__title">{{ title }}</h3>
        <p v-if="meta" class="chart-card__meta">{{ meta }}</p>
      </div>
    </header>

    <div class="chart-card__body">
      <slot />
    </div>

    <p v-if="source" class="chart-card__source">Source: {{ source }}</p>
  </article>
</template>

<style scoped>
.chart-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 22px;
  /* Glassmorphism on brand: more transparent than --color-card-bg so the
     satellite plate reads through. Heavier blur keeps text legible. */
  background: rgba(2, 38, 64, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  backdrop-filter: blur(36px) saturate(1.2);
  -webkit-backdrop-filter: blur(36px) saturate(1.2);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Encode Sans', sans-serif;
}

.chart-card__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.chart-card__title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.chart-card__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
}

.chart-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  letter-spacing: 0.01em;
}

.chart-card__meta {
  margin: 2px 0 0;
  font-size: 10.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}

.chart-card__body {
  flex: 1;
  min-height: 0;
}

.chart-card__source {
  margin: 0;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.38);
  letter-spacing: 0.03em;
}
</style>
