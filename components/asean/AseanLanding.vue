<script setup lang="ts">
import { useViewport } from '~/composables/useViewport'

// BF-131: the ASEAN landing body, shared by the public (`/infographics/asean`)
// and embed (`/embed/asean`) index pages so the mobile/desktop split lives in one
// place. Desktop = the UNCHANGED map composition (AseanInfographic, idle-first).
// Mobile (≤ 879px) = the vertical country-card list, which links into BF-130's
// per-country detail routes under `basePath`.
const props = defineProps<{
  // Detail-route base for the cards. `/infographics/asean` (default) for the
  // public landing, `/embed/asean` for the embed surface.
  basePath?: string
}>()

const { isMobile } = useViewport()
</script>

<template>
  <!-- data-allow-mismatch: the server/prerender always emits the desktop map
       branch (isMobile=false during SSR), while a phone's client render omits it
       (isMobile=true) and mounts the card list instead. That divergence is
       intentional and by design — this tells Vue not to log it as a hydration
       mismatch. The display:none guard below keeps it visually seamless. -->
  <div class="asean-landing" data-allow-mismatch>
    <!-- Mobile card list. Wrapped in <ClientOnly> because it depends on viewport
         detection: `useViewport` defaults isMobile=false during SSR/prerender, so
         SSR emits the desktop branch. ClientOnly renders nothing on the server and
         mounts the list on the phone after hydration, avoiding a hydration
         mismatch. -->
    <ClientOnly>
      <AseanCardList v-if="isMobile" :base-path="props.basePath" />
    </ClientOnly>

    <!-- Desktop map. Behind `v-if="!isMobile"` so it never client-mounts on a
         phone: on a phone `useViewport` sets isMobile=true during client setup, so
         AseanInfographic is never created client-side → its onMounted d3 draw
         never runs → the map SVG is provably absent from the mobile DOM, not just
         hidden. The wrapper is display:none under the mobile breakpoint in plain
         CSS so the SSR/prerendered desktop HTML (isMobile=false at build time)
         doesn't paint the map scaffold on a phone before hydration swaps it out —
         no map flash. Desktop is untouched: the media query doesn't apply and the
         v-if keeps the map. -->
    <div v-if="!isMobile" class="asean-landing__map">
      <AseanInfographic />
    </div>
  </div>
</template>

<style scoped>
.asean-landing {
  display: contents;
}

/* Pre-hydration flash guard — see the template comment on .asean-landing__map. */
@media (max-width: 879px) {
  .asean-landing__map {
    display: none;
  }
}
</style>
