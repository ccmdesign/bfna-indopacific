<script setup lang="ts">
import { countryBySlug } from '~/data/asean/country-tiers'

function onSelect(slug: string) {
  const country = countryBySlug(slug)
  if (country) {
    alert(country.name)
  }
}
</script>

<template>
  <div class="asean-infographic">
    <AseanMap @select="onSelect" />
  </div>
</template>

<style scoped>
.asean-infographic {
  position: fixed;
  inset: 0;
  width: 100svw;
  height: 100svh;
  z-index: 10;
}
</style>
