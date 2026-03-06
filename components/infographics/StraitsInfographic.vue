<script setup>
import StraitMap from '~/components/StraitMap.vue'

const emit = defineEmits(['select-strait'])

function onSelectStrait(id) {
  emit('select-strait', id)
}
</script>

<template>
  <div class="straits-infographic">
    <StraitMap class="strait-map" @select-strait="onSelectStrait" />
  </div>
</template>

<style scoped>
.straits-infographic {
  display: contents;
}
</style>
