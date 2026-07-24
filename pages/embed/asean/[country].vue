<script setup>
// BF-130: embed equivalent of the per-country detail route. Same embed layout as
// the base embed page; suppressRotateOverlay so the portrait detail never gets
// the rotate overlay (the embed layout now honours that meta). Whatever BFNA
// drops on Squarespace can therefore deep-link straight to a country detail on a
// phone. Back control returns to the embed list (/embed/asean).
definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-3',
  suppressRotateOverlay: true
})

useAseanHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<template>
  <AseanCountryDetailPage back-to="/embed/asean" />
</template>
