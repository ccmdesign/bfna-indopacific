<script setup lang="ts">
import { computed, watch } from 'vue'
import { useViewport } from '~/composables/useViewport'
import { PROFILES, urlSlugToKey } from '~/data/asean/country-profiles'

// BF-130: shared body for both the public (`/infographics/asean/<country>`) and
// embed (`/embed/asean/<country>`) detail routes. Desktop reuses the map-first
// AseanInfographic docked to this country; mobile renders the portrait detail
// (identity header + back-to-list + CountryDetail). The two route files differ
// only in their page meta / layout and the `backTo` list route.
const props = defineProps<{
  // Route to the country list (the infographic's own index) — where the back
  // control and the unknown-slug degrade both land.
  backTo: string
}>()

const route = useRoute()
const { isMobile } = useViewport()

// URL param (hyphen form) -> profile key. `timor-leste` maps to `timor_leste`;
// every other slug round-trips unchanged. Unknown → null (degraded below).
const profileKey = computed<string | null>(() => {
  const raw = route.params.country as string | undefined
  if (!raw) return null
  const key = urlSlugToKey(raw)
  return PROFILES[key] ? key : null
})

const profile = computed(() => (profileKey.value ? PROFILES[profileKey.value] : undefined))

// Unknown slug → degrade to the list (no hard 404), so a stale/bad share link
// still lands somewhere useful. Reactive + immediate so it also fires on
// param-only navigation that skips a fresh mount. Runs client-side.
watch(
  () => route.params.country as string | undefined,
  (raw) => {
    if (raw && !PROFILES[urlSlugToKey(raw)]) {
      navigateTo(props.backTo, { replace: true })
    }
  },
  { immediate: true }
)
</script>

<template>
  <!-- Desktop / SSR: map-first. Reuse the exact AseanInfographic, docked to this
       country via initialSlug — the detail route is the mobile face of the same
       selection, not a second desktop layout. isMobile defaults false during SSR
       so the route prerenders as the docked map. -->
  <AseanInfographic v-if="!isMobile" :initial-slug="profileKey" />

  <!-- Mobile: full-width portrait detail. Client-only (depends on viewport
       detection), mirroring the straits [[id]] desktop/mobile split. -->
  <ClientOnly v-if="isMobile">
    <div v-if="profile" class="asean-detail-page">
      <header class="asean-detail-page__header">
        <NuxtLink :to="backTo" class="asean-detail-page__back">
          <span class="asean-detail-page__back-arrow" aria-hidden="true">&#8592;</span>
          <span>All countries</span>
        </NuxtLink>
        <div class="asean-detail-page__identity">
          <img
            :src="profile.flagUrl"
            :alt="`Flag of ${profile.name}`"
            class="asean-detail-page__flag"
            width="56"
          />
          <h1 class="asean-detail-page__name">{{ profile.name }}</h1>
        </div>
      </header>

      <!-- Extracted country-detail view (BF-129): tabs + Key Facts + charts +
           CRM box, driven by the slug. Owns its own tab state. -->
      <CountryDetail :slug="profileKey" />
    </div>

    <!-- profile null here only in the brief window before the unknown-slug watch
         redirects; render nothing rather than a broken shell. -->
    <div v-else class="asean-detail-page__skeleton" />

    <template #fallback>
      <div class="asean-detail-page__skeleton" />
    </template>
  </ClientOnly>
</template>

<style scoped>
/* Full-width portrait detail column. Scrolls within the page; bottom padding
   clears the default layout's fixed 4rem footer so the last content item is
   never hidden behind it. z-index sits above the layout's background layers. */
.asean-detail-page {
  position: relative;
  z-index: 15;
  box-sizing: border-box;
  min-height: 100svh;
  padding: clamp(16px, 4vw, 24px);
  padding-bottom: calc(4rem + clamp(20px, 4vh, 32px));
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 3vh, 24px);
  font-family: 'Encode Sans', sans-serif;
  color: rgba(255, 255, 255, 0.92);
}

.asean-detail-page__header {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 2vh, 18px);
}

/* Back-to-list control — same translucent-panel language as the infographic's
   in-map Back button (.asean-infographic__back). */
.asean-detail-page__back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.78);
  text-decoration: none;
  background: rgba(2, 38, 64, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  transition: background 0.15s ease, color 0.15s ease;
}

.asean-detail-page__back:hover {
  color: #fff;
  background: rgba(2, 38, 64, 0.72);
}

.asean-detail-page__back:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

.asean-detail-page__back-arrow {
  font-size: 14px;
  line-height: 1;
}

/* Country identity: flag + name. */
.asean-detail-page__identity {
  display: flex;
  align-items: center;
  gap: 14px;
}

.asean-detail-page__flag {
  width: 56px;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.asean-detail-page__name {
  margin: 0;
  font-size: clamp(1.75rem, 8vw, 2.25rem);
  font-weight: 300;
  letter-spacing: 0.01em;
  line-height: 1.05;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
}

.asean-detail-page__skeleton {
  width: 100%;
  min-height: 100svh;
}

@media (prefers-reduced-motion: reduce) {
  .asean-detail-page__back {
    transition: none;
  }
}
</style>
