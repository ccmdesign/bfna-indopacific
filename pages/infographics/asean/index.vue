<script setup>
definePageMeta({
  layoutClass: 'layout-3',
  embedSlug: 'asean',
  embedTitle: 'ASEAN: Pivot of the Indo-Pacific',
  // BF-131: on phones the landing is the portrait country-card list (not the
  // map), so the rotate-to-landscape prompt must never fire here. On desktop the
  // overlay never triggers anyway (it gates on mobile UA + portrait).
  suppressRotateOverlay: true,
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
  <!-- BF-131: mobile = country-card list, desktop = the unchanged map. The split
       lives in AseanLanding (shared with the embed index). -->
  <AseanLanding />
</template>
