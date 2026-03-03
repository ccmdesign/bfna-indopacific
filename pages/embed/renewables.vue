<script setup>
import { useHead } from '#app'

definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-1'
})

useHead({
  title: 'Renewables on the Rise',
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap', key: 'inter-font' }
  ],
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>

<template>
  <RenewablesInfographic />
</template>
