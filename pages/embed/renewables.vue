<script setup>
// BF-224: scale-to-fit stage — see components/EmbedStage.vue.
definePageMeta({
  layout: false
})

useRenewablesHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
useInfographicSeo('renewables')
</script>

<template>
  <EmbedStage slug="renewables" />
</template>
