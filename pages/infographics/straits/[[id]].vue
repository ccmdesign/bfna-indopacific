<script setup lang="ts">
import { useViewport } from '~/composables/useViewport'
import { straits, LATEST_YEAR, historicalByStrait } from '~/composables/useStraitsData'
import type { Strait } from '~/types/strait'

definePageMeta({
  layoutClass: 'layout-2',
  embedSlug: 'straits',
  embedTitle: 'Indo-Pacific Straits',
  suppressRotateOverlay: true,
  footerSource: {
    url: 'https://portwatch.imf.org/',
    label: 'Source: IMF PortWatch'
  }
})

const route = useRoute()
const { isMobile } = useViewport()

const VALID_IDS = new Set(straits.map((s: Strait) => s.id))

const straitId = computed(() => {
  const id = route.params.id as string | undefined
  return id || undefined
})

// Validate route param reactively (handles param-only changes that skip beforeEnter)
watch(
  () => route.params.id as string | undefined,
  (id) => {
    if (id && !VALID_IDS.has(id)) {
      navigateTo('/infographics/straits', { replace: true })
    }
  },
  { immediate: true }
)

// Dynamic page title based on selected strait
const selectedStrait = computed(() =>
  straits.find((s: Strait) => s.id === straitId.value)
)
const straitName = computed(() => selectedStrait.value?.name)
useStraitsHead(straitName)

// Historical data for selected strait (used by mobile detail)
const selectedStraitHistorical = computed(() => {
  if (!straitId.value) return {}
  return historicalByStrait(straitId.value)
})

function onSelect(id: string | null) {
  if (id) {
    navigateTo({ path: `/infographics/straits/${id}` })
  } else {
    navigateTo({ path: '/infographics/straits' })
  }
}
</script>

<template>
  <ClientOnly>
    <!-- Desktop: existing map -->
    <StraitMap
      v-if="!isMobile"
      :selected-strait-id="straitId"
      class="strait-map"
      @select="onSelect"
    />
    <!-- Mobile: card list (no strait selected) -->
    <StraitCardList
      v-else-if="!straitId"
      :straits="straits"
    />
    <!-- Mobile: detail page (strait selected) -->
    <StraitMobileDetail
      v-else-if="selectedStrait"
      :strait="selectedStrait"
      :historical="selectedStraitHistorical"
      :year="LATEST_YEAR"
    />
    <template #fallback>
      <div class="strait-loading-skeleton" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.strait-loading-skeleton {
  width: 100%;
  height: 100%;
  min-height: 200px;
  background: #0a1628;
}
</style>
