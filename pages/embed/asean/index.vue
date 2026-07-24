<script setup>
definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-3',
  // BF-131: mobile embed shows the portrait card list — drop the rotate prompt
  // (the embed layout honours this meta).
  suppressRotateOverlay: true
})

useAseanHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<template>
  <!-- BF-131: same landing split as the public index; cards link into the embed
       detail surface (/embed/asean/<country>) so a tap stays inside the embed. -->
  <AseanLanding base-path="/embed/asean" />
</template>
