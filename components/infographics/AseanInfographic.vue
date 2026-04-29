<script setup lang="ts">
import { COUNTRIES, IN_SCOPE_SLUGS, countryBySlug } from '~/data/asean/country-tiers'
import { profileBySlug } from '~/data/asean/placeholder-data'

const activeSlug = ref<string | null>('indonesia')
const hoverSlug = ref<string | null>(null)
const dataLayer = ref<string>('trade')

const country = computed(() =>
  activeSlug.value ? countryBySlug(activeSlug.value) : undefined
)
const profile = computed(() =>
  activeSlug.value ? profileBySlug(activeSlug.value) : undefined
)

function clear() {
  activeSlug.value = null
}

// Keyboard escape closes panel even when focus is outside the map.
function onWindowKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && activeSlug.value) clear()
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKey)
})
</script>

<template>
  <div class="asean-infographic">
    <AseanMap
      class="asean-map-slot"
      :active-slug="activeSlug"
      :hover-slug="hoverSlug"
      @select="activeSlug = $event"
      @hover="hoverSlug = $event"
    />

    <AseanLayerToggle
      v-model="dataLayer"
      class="asean-toggle-slot"
    />

    <header class="asean-title">
      <p class="asean-title__eyebrow">ASEAN · Strategic posture · 2025</p>
      <h1 class="title asean-title__heading">ASEAN: Pivot of the Indo-Pacific</h1>
      <p class="asean-title__dek">
        Five Southeast Asian economies sit between Washington, Beijing, and Brussels.
        This map shows how each is distributing its bets across trade, raw materials,
        investment, alignment, and defense, and how those bets have shifted since 2020.
      </p>
      <p class="asean-title__instruction">
        <span class="asean-title__dot" aria-hidden="true" />
        Click any highlighted country to open its profile
      </p>
    </header>

    <div v-if="country" class="asean-panel-slot">
      <CountryPanel
        :country="country"
        :profile="profile"
        @close="clear"
      />
    </div>
  </div>
</template>

<style scoped>
.asean-infographic {
  display: contents;
}

.asean-map-slot {
  grid-row: 1 / 8;
  grid-column: 1 / -1;
  z-index: 0;
}

.asean-toggle-slot {
  grid-row: 1 / 2;
  grid-column: 4 / 10;
  align-self: start;
  justify-self: center;
  margin-top: 1.5rem;
  z-index: 5;
}

.asean-title {
  grid-row: 5 / 8;
  grid-column: 2 / 8;
  align-self: end;
  z-index: 4;
  padding-bottom: 5rem;
  max-width: 620px;
}

.asean-title__eyebrow {
  font-size: var(--size--1);
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 var(--space-s);
}

.asean-title__heading {
  font-size: var(--size-5);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
  color: #fff;
  margin: 0 0 var(--space-s);
  text-shadow: 0 5px 5px rgba(0, 0, 0, 0.25);
}

.asean-title__dek {
  font-size: var(--size-0);
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 var(--space-s);
  max-width: 56ch;
}

.asean-title__instruction {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  font-size: var(--size--1);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  padding: 0.6rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  margin: 0;
  background: rgba(2, 38, 64, 0.4);
  backdrop-filter: blur(4px);
}

.asean-title__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(218, 60%, 58%);
  box-shadow: 0 0 8px hsl(218, 60%, 58%);
  animation: asean-pulse 1.8s ease-in-out infinite;
}

@keyframes asean-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.7);
  }
}

@media (prefers-reduced-motion: reduce) {
  .asean-title__dot {
    animation: none;
  }
}

.asean-panel-slot {
  grid-row: 1 / 8;
  grid-column: 9 / 13;
  z-index: 4;
  padding: 1.5rem 1.5rem 5rem;
  display: flex;
  align-items: stretch;
}

.asean-panel-slot > * {
  width: 100%;
}
</style>
