<script setup lang="ts">
import type { Strait } from '~/types/strait'
import { fmtUsd } from '~/utils/straitFormatters'

const props = defineProps<{
  strait: Strait
}>()

const ariaLabel = computed(() =>
  `${props.strait.name} — ${props.strait.globalShareLabel} — ${props.strait.valueLabel}`
)
</script>

<template>
  <li class="strait-card" role="listitem">
    <NuxtLink
      :to="`/infographics/straits/${strait.id}`"
      class="strait-card__link"
      :aria-label="ariaLabel"
    >
      <div class="strait-card__thumbnail">
        <StraitCircle
          :radius="36"
          :color="{ h: 0, s: 0, l: 100 }"
          :active="false"
          :image-url="strait.imageUrl"
        />
      </div>
      <div class="strait-card__content">
        <h3 class="strait-card__name">{{ strait.name }}</h3>
        <p class="strait-card__share">{{ strait.globalShareLabel }}</p>
        <p class="strait-card__value">{{ fmtUsd(strait.valueUSD) }} <span>annual trade</span></p>
      </div>
      <svg class="strait-card__chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </NuxtLink>
  </li>
</template>

<style scoped>
.strait-card {
  list-style: none;
}

.strait-card__link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  min-height: 44px;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.strait-card__link:hover {
  background: rgba(2, 38, 64, 1);
  border-color: rgba(255, 255, 255, 0.25);
}

.strait-card__link:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

.strait-card__thumbnail {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.strait-card__content {
  flex: 1;
  min-width: 0;
}

.strait-card__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.01em;
}

.strait-card__share {
  font-size: 12px;
  color: var(--color-accent);
  font-weight: 500;
  margin: 0 0 4px;
}

.strait-card__value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.strait-card__value span {
  font-weight: 400;
  font-size: 11px;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-left: 4px;
}

.strait-card__chevron {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .strait-card__link {
    transition: none;
  }
}
</style>
