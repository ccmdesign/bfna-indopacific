<script setup lang="ts">
import straitsData from '~/data/straits/straits.json'

definePageMeta({
  layoutClass: 'layout-2',
  embedSlug: 'straits',
  embedTitle: 'Indo-Pacific Straits',
  footerSource: {
    url: 'https://portwatch.imf.org/',
    label: 'Source: IMF PortWatch'
  }
})

const route = useRoute()

const VALID_IDS = new Set(straitsData.straits.map((s: { id: string }) => s.id))

const straitId = computed(() => {
  const id = route.params.id as string | undefined
  return id || null
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
  straitsData.straits.find((s: { id: string }) => s.id === straitId.value)
)
const straitName = computed(() => selectedStrait.value?.name)
useStraitsHead(straitName)

function onSelect(id: string | null) {
  if (id) {
    navigateTo({ path: `/infographics/straits/${id}` })
  } else {
    navigateTo({ path: '/infographics/straits' })
  }
}
</script>

<template>
  <!-- BF-89: Mobile branch will conditionally render here based on CSS media query -->
  <StraitMap
    :selected-strait-id="straitId"
    class="strait-map"
    @select="onSelect"
  />
</template>
