<script setup>
definePageMeta({
  layoutClass: 'layout-2',
  embedSlug: 'straits',
  embedTitle: 'Indo-Pacific Straits',
  footerSource: {
    url: 'https://portwatch.imf.org/',
    label: 'Source: IMF PortWatch'
  }
})

useStraitsHead()
</script>

<template>
  <StraitsInfographic />
</template>
