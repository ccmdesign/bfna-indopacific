<script setup>
definePageMeta({
  layoutClass: 'layout-3',
  embedSlug: 'asean',
  embedTitle: 'ASEAN: Pivot of the Indo-Pacific',
  footerSource: {
    url: 'https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37',
    label: 'Source: CEPII BACI & USGS'
  }
})

useAseanHead()

useSeoMeta({
  description:
    "Interactive map of ASEAN member states and their economic, strategic, and resource ties to the US, China, and EU.",
  ogTitle: 'ASEAN: Pivot of the Indo-Pacific',
  ogDescription:
    "Interactive map of ASEAN member states and their economic, strategic, and resource ties to the US, China, and EU."
})
</script>

<template>
  <AseanInfographic />
</template>
