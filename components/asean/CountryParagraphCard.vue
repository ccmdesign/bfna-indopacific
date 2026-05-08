<script setup lang="ts">
import type { CountryProfile } from '~/data/asean/country-profiles'

defineProps<{
  profile: CountryProfile
  /** Optional eyebrow above the paragraph (defaults to "Position"). */
  eyebrow?: string
}>()
</script>

<template>
  <article class="paragraph-card" aria-label="Active country narrative">
    <p class="paragraph-card__eyebrow">{{ eyebrow ?? 'Position' }}</p>
    <p class="paragraph-card__body">{{ profile.paragraph }}</p>
  </article>
</template>

<style scoped>
.paragraph-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.paragraph-card__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
}

.paragraph-card__body {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.78);
}
</style>
