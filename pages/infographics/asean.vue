<script setup>
definePageMeta({
  layoutClass: 'layout-3',
  embedSlug: 'asean',
  embedTitle: 'ASEAN: Pivot of the Indo-Pacific',
  footerSource: {
    url: 'https://unctadstat.unctad.org/',
    label: 'Source: placeholder, real attribution wires May 2026'
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
