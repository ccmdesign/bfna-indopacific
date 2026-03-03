<script setup>
import RenewableEnergyChart from '~/components/RenewableEnergyChart.vue'
</script>

<template>
  <div class="renewables-infographic">
    <div class="description">
      <h1 class="title">Renewables on the Rise</h1>
      <p>Amid rising concerns about climate change and energy security, a growing number of states have invested in expanding renewable energy infrastructure. This has been especially visible in the Indo-Pacific, where several countries have become global leaders in solar, wind, hydroelectric and geothermal power generation. However, not every state in the region has embraced renewables so enthusiastically. This infographic displays the 2024 renewable energy usage percentages of the region's largest economies, alongside those of the United States and European Union.</p>
      <p class="source-description"><em>Percentage of electricity produced from renewable sources, which include solar, wind, hydropower, bioenergy, geothermal, wave, and tidal.</em></p>
    </div>
    <RenewableEnergyChart class="chart" />
    <div class="bg-image">
      <img src="@/assets/images/background.png" alt="" role="presentation" />
    </div>
  </div>
</template>

<style scoped>
.renewables-infographic {
  display: contents;
}

.bg-image {
  --size: 75svh;
  max-width: var(--size);
  aspect-ratio: 1 / 1;
  position: absolute;
  top: calc(var(--size) / 6);
  left: calc(var(--size) / -2);
  z-index: 0;
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0svh);
  }
  50% {
    transform: translateY(-1svh);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bg-image {
    animation: none;
  }
}

.source-description {
  font-size: 0.875rem;
  opacity: 0.6;
}
</style>
