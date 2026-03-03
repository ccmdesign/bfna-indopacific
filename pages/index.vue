<script setup>
definePageMeta({
  layoutClass: 'layout-1',
  footerSource: {
    url: 'https://ourworldindata.org/grapher/share-of-electricity-production-from-renewable-sources?time=earliest..2024&country=CHN~JPN~IND~KOR~AUS~IDN~TWN~THA~USA~EU+%28Ember%29',
    label: 'Source: Our World in Data'
  }
})

useRenewablesHead()
</script>

<template>
  <RenewablesInfographic />
</template>
