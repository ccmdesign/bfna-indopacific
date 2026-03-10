<script setup lang="ts">
import { useViewport } from '~/composables/useViewport'
import { useStraitTransition } from '~/composables/useStraitTransition'
import { straits, LATEST_YEAR, historicalByStrait } from '~/utils/straitsData'
import { slideDirection, clearSlideDirection } from '~/composables/useSwipeNavigation'
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
const { scrollY } = useStraitTransition()

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

// Restore scroll position when returning from detail to list
watch(straitId, (newId, oldId) => {
  if (!newId && oldId && import.meta.client) {
    // Returning from detail to list — restore scroll after DOM updates
    nextTick(() => {
      window.scrollTo(0, scrollY.value)
    })
  }
})

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

// Slide transition name for swipe navigation (reactive via module-level ref)
const slideTransitionName = computed(() => {
  const dir = slideDirection.value
  if (!dir) return undefined
  return dir === 'left' ? 'slide-left' : 'slide-right'
})

function onTransitionAfterEnter() {
  clearSlideDirection()
}

function onSelect(id: string | null) {
  if (id) {
    navigateTo({ path: `/infographics/straits/${id}` })
  } else {
    navigateTo({ path: '/infographics/straits' })
  }
}
</script>

<template>
  <!-- Desktop: SSR-rendered map (isMobile defaults to false during SSR) -->
  <StraitMap
    v-if="!isMobile"
    :selected-strait-id="straitId"
    class="strait-map"
    @select="onSelect"
  />
  <!-- Mobile: client-only (depends on viewport detection) -->
  <ClientOnly v-else>
    <!-- Mobile: card list (no strait selected) -->
    <StraitCardList
      v-if="!straitId"
    />
    <!-- Mobile: detail page (strait selected) with swipe slide transition -->
    <Transition
      v-else-if="selectedStrait"
      :name="slideTransitionName"
      mode="out-in"
      @after-enter="onTransitionAfterEnter"
    >
      <StraitMobileDetail
        :key="selectedStrait.id"
        :strait="selectedStrait"
        :historical="selectedStraitHistorical"
        :year="LATEST_YEAR"
      />
    </Transition>
    <!-- Fallback: strait not found or data loading -->
    <div v-else class="strait-not-found">
      <p>Strait not found.</p>
      <NuxtLink to="/infographics/straits">View all straits</NuxtLink>
    </div>
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

.strait-not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.strait-not-found a {
  margin-top: 0.5rem;
  color: var(--color-accent);
  text-decoration: underline;
}
</style>
