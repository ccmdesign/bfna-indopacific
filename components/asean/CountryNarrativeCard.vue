<script setup lang="ts">
import type { CountryProfile } from '~/data/asean/country-profiles'

defineProps<{
  profile: CountryProfile
}>()
</script>

<template>
  <article class="country-card country-card--narrative" aria-label="Active country profile">
    <header class="country-card__header">
      <img
        :src="profile.flagUrl"
        :alt="`Flag of ${profile.name}`"
        class="country-card__flag"
        width="48"
        height="32"
        loading="lazy"
      />
      <div class="country-card__id">
        <h2 class="country-card__name">{{ profile.name }}</h2>
        <p class="country-card__tagline">{{ profile.tagline }}</p>
      </div>
    </header>

    <div class="country-card__hero">
      <span class="country-card__hero-value">{{ profile.hero.value }}</span>
      <span class="country-card__hero-label">{{ profile.hero.label }}</span>
    </div>

    <section
      v-if="profile.topExports?.length"
      class="country-card__exports"
      aria-label="Top three goods exports"
    >
      <p class="country-card__exports-eyebrow">Top exports</p>
      <ol class="country-card__exports-list">
        <li
          v-for="(item, i) in profile.topExports"
          :key="item.label"
          class="country-card__export"
          :title="item.detail"
        >
          <span class="country-card__export-rank">{{ i + 1 }}</span>
          <span class="country-card__export-label">{{ item.label }}</span>
        </li>
      </ol>
    </section>
  </article>
</template>

<style scoped>
.country-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 22px;
  background: var(--color-card-bg, rgba(2, 38, 64, 0.92));
  border: 1px solid var(--color-card-border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Encode Sans', sans-serif;
}

.country-card__header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.country-card__flag {
  flex-shrink: 0;
  width: 48px;
  height: auto;
  border-radius: 3px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
  object-fit: cover;
}

.country-card__id {
  min-width: 0;
}

.country-card__name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.01em;
  line-height: 1.15;
}

.country-card__tagline {
  margin: 2px 0 0;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--color-accent, hsl(218, 60%, 70%));
  line-height: 1.35;
}

.country-card__hero {
  display: flex;
  flex-direction: column;
}

.country-card__hero-value {
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}

.country-card__hero-label {
  margin-top: 4px;
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.country-card__exports {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.country-card__exports-eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
}

.country-card__exports-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.country-card__export {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 12.5px;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.82);
}

.country-card__export-rank {
  flex-shrink: 0;
  width: 16px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.04em;
}

.country-card__export-label {
  font-weight: 500;
}

</style>
