<script setup lang="ts">
import { computed } from 'vue'
import { PROFILES, keyToUrlSlug } from '~/data/asean/country-profiles'

// BF-131: the mobile face of the ASEAN landing. On phones the d3 map is replaced
// by this vertical, scrollable list of 11 country cards (flag + name + tagline).
// Each whole card is a tap target into that country's BF-130 detail route.
const props = defineProps<{
  // Base of the per-country detail route. `/infographics/asean` for the public
  // landing, `/embed/asean` for the Squarespace embed surface — so a tapped card
  // stays inside whichever surface it was opened from.
  basePath?: string
}>()

const base = computed(() => props.basePath ?? '/infographics/asean')

interface CountryCard {
  key: string
  name: string
  flagUrl: string
  tagline: string
  href: string
}

// PROFILES insertion order is the designed order (Indonesia … Timor-Leste). Use
// the object KEY for the href (keyToUrlSlug turns `timor_leste` -> `timor-leste`,
// every other key round-trips) — the same slug BF-130's routes prerender.
const cards = computed<CountryCard[]>(() =>
  Object.entries(PROFILES).map(([key, profile]) => ({
    key,
    name: profile.name,
    flagUrl: profile.flagUrl,
    tagline: profile.tagline,
    href: `${base.value}/${keyToUrlSlug(key)}`
  }))
)
</script>

<template>
  <div class="asean-card-list">
    <header class="asean-card-list__masthead">
      <h1 class="asean-card-list__title">
        ASEAN<span class="asean-card-list__title-sub">The Strategic Pivot of the Indo-Pacific</span>
      </h1>
      <p class="asean-card-list__hint">Select a country to explore its trade, power, and critical-mineral ties.</p>
    </header>

    <ul class="asean-card-list__grid">
      <li v-for="card in cards" :key="card.key">
        <NuxtLink :to="card.href" class="asean-card">
          <img
            :src="card.flagUrl"
            :alt="`Flag of ${card.name}`"
            class="asean-card__flag"
            width="56"
            height="37"
            loading="lazy"
            decoding="async"
          />
          <span class="asean-card__body">
            <span class="asean-card__name">{{ card.name }}</span>
            <span class="asean-card__tagline">{{ card.tagline }}</span>
          </span>
          <span class="asean-card__chevron" aria-hidden="true">&#8594;</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* Full-viewport portrait column that scrolls within the page. z-index sits above
   the layout's background layers; bottom padding clears the default layout's
   fixed 4rem footer so the last card scrolls fully into view (the embed layout
   has no footer, so the extra space is just breathing room there). */
.asean-card-list {
  position: relative;
  z-index: 15;
  box-sizing: border-box;
  min-height: 100svh;
  width: 100%;
  padding: clamp(16px, 5vw, 28px);
  padding-bottom: calc(4rem + clamp(20px, 5vh, 40px));
  display: flex;
  flex-direction: column;
  gap: clamp(18px, 4vh, 28px);
  font-family: 'Encode Sans', sans-serif;
  color: rgba(255, 255, 255, 0.92);
}

/* --- Masthead: compact echo of the desktop idle intro so the two surfaces read
   as one product. --- */
.asean-card-list__masthead {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: clamp(8px, 2vh, 16px);
}

.asean-card-list__title {
  margin: 0;
  font-size: clamp(2.5rem, 14vw, 3.5rem);
  font-weight: 100;
  line-height: 1.02;
  letter-spacing: 0.05em;
  color: #fff;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.6);
}

.asean-card-list__title-sub {
  display: block;
  margin-top: 6px;
  font-size: clamp(1rem, 4.5vw, 1.25rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: rgba(255, 255, 255, 0.9);
}

.asean-card-list__hint {
  margin: 0;
  font-size: clamp(0.85rem, 3.6vw, 0.95rem);
  font-weight: 400;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.68);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
}

/* --- Card grid --- */
.asean-card-list__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 2.5vh, 14px);
}

/* Whole card is the tap target. Same translucent dark-blue + blur panel language
   as the legend menu and the detail-page back control. */
.asean-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: rgba(2, 38, 64, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  text-decoration: none;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
}

.asean-card:active {
  transform: scale(0.99);
  background: rgba(2, 38, 64, 0.72);
}

.asean-card:hover {
  background: rgba(2, 38, 64, 0.68);
  border-color: rgba(255, 255, 255, 0.18);
}

.asean-card:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

.asean-card__flag {
  flex-shrink: 0;
  width: 56px;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.asean-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.asean-card__name {
  font-size: clamp(1.05rem, 4.6vw, 1.2rem);
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.15;
  color: #fff;
}

.asean-card__tagline {
  font-size: clamp(0.8rem, 3.4vw, 0.9rem);
  font-weight: 300;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.72);
}

.asean-card__chevron {
  flex-shrink: 0;
  font-size: 18px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.5);
}

@media (prefers-reduced-motion: reduce) {
  .asean-card {
    transition: none;
  }
  .asean-card:active {
    transform: none;
  }
}
</style>
