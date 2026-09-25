<!--
  BF-224: design-size render of the Renewables infographic for the embed stage.
  See pages/embed/canvas/straits.vue.
-->
<script setup>
definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-1'
})

useRenewablesHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
useEmbedCanvas()
</script>

<template>
  <RenewablesInfographic />
</template>
