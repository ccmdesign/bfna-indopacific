<script setup lang="ts">
import { computed } from 'vue'
import { profileByUrlSlug } from '~/data/asean/country-profiles'

// BF-130: per-country detail route. suppressRotateOverlay — this page is designed
// for portrait, so the rotate overlay must never fire here. showBackLink:false —
// the layout's top-left "Back to home" would collide/duplicate with the page's
// own back-to-list control (the BF-119 collision); the detail page owns its own
// back affordance instead. Keeps the ASEAN embed + source footer chrome.
definePageMeta({
  layoutClass: 'layout-3',
  embedSlug: 'asean',
  embedTitle: 'ASEAN: Pivot of the Indo-Pacific',
  suppressRotateOverlay: true,
  showBackLink: false,
  footerSource: {
    url: 'https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37',
    label: 'Source: CEPII BACI & USGS'
  }
})

const route = useRoute()

// Dynamic head: name the country in the title/OG for a shareable deep link, but
// fall back to the base head for an unknown slug (which redirects to the list).
const profile = computed(() => {
  const raw = route.params.country as string | undefined
  return raw ? profileByUrlSlug(raw) : undefined
})

const pageTitle = computed(() =>
  profile.value
    ? `${profile.value.name} — ASEAN: Pivot of the Indo-Pacific`
    : 'ASEAN: Pivot of the Indo-Pacific'
)

useAseanHead({ title: pageTitle })

useSeoMeta({
  title: pageTitle,
  description: computed(() =>
    profile.value
      ? `${profile.value.name}'s economic, strategic, and critical-mineral ties to the US, China, and EU.`
      : 'Interactive map of ASEAN member states and their economic, strategic, and resource ties to the US, China, and EU.'
  ),
  ogTitle: pageTitle,
  ogDescription: computed(() =>
    profile.value
      ? `${profile.value.name}'s economic, strategic, and critical-mineral ties to the US, China, and EU.`
      : 'Interactive map of ASEAN member states and their economic, strategic, and resource ties to the US, China, and EU.'
  )
})
</script>

<template>
  <AseanCountryDetailPage back-to="/infographics/asean" />
</template>
