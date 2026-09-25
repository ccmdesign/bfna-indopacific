<script setup>
definePageMeta({
  layoutClass: 'layout-1',
  // BF-224: has a portrait layout now (public/styles.css .layout-1), so no rotate prompt.
  suppressRotateOverlay: true,
  embedSlug: 'renewables',
  embedTitle: 'Renewables on the Rise',
  footerSource: {
    url: 'https://ourworldindata.org/grapher/share-of-electricity-production-from-renewable-sources?time=earliest..2024&country=CHN~JPN~IND~KOR~AUS~IDN~TWN~THA~USA~EU+%28Ember%29',
    label: 'Source: Our World in Data'
  }
})

useRenewablesHead()
useInfographicSeo('renewables')
</script>

<template>
  <RenewablesInfographic />
</template>
