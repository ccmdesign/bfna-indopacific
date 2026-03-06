<script setup>
definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-2'
})

useStraitsHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>

<template>
  <StraitMap class="strait-map" />
</template>
