<script setup>
import StraitMap from '~/components/StraitMap.vue'

const emit = defineEmits(['select-strait'])
</script>

<template>
  <div class="straits-infographic">
    <StraitMap class="strait-map" @select-strait="emit('select-strait', $event)" />
  </div>
</template>

<style scoped>
.straits-infographic {
  display: contents;
}
</style>
