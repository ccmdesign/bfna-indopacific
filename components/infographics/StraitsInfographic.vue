<script setup>
import { shallowRef } from 'vue'
import StraitMap from '~/components/StraitMap.vue'
import StraitLensZoom from '~/components/StraitLensZoom.vue'
import straitsData from '~/data/straits/straits.json'

const selectedStrait = shallowRef(null)

function onSelectStrait(id) {
  const strait = straitsData.straits.find(s => s.id === id)
  selectedStrait.value = strait ?? null
}

function onCloseLens() {
  selectedStrait.value = null
}
</script>

<template>
  <div class="straits-infographic">
    <StraitMap class="strait-map" @select-strait="onSelectStrait" />
    <StraitLensZoom
      v-if="selectedStrait"
      :strait="selectedStrait"
      @close="onCloseLens"
    />
  </div>
</template>

<style scoped>
.straits-infographic {
  display: contents;
}
</style>
