<script setup>
// BF-224: the stage renders /embed/canvas/straits at design size and scales it to
// fit the host frame (or shows a cover card on phones) — see components/EmbedStage.vue.
definePageMeta({
  layout: false
})

useStraitsHead(undefined, {
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
useInfographicSeo('straits')
</script>

<template>
  <EmbedStage slug="straits" />
</template>
