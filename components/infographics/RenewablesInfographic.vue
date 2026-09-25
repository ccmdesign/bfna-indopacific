<script setup>
import RenewableEnergyChart from '~/components/RenewableEnergyChart.vue'

// BF-224: on phones the intro is clamped to a few lines above the chart; this
// only toggles that clamp (the full text is always in the DOM).
const introExpanded = ref(false)
</script>

<template>
  <div class="renewables-infographic">
    <div class="description">
      <h1 class="title">Renewables on the Rise</h1>
      <p id="renewables-intro" class="intro" :class="{ 'is-expanded': introExpanded }">Amid rising concerns about climate change and energy security, a growing number of states have invested in expanding renewable energy infrastructure. This has been especially visible in the Indo-Pacific, where several countries have become global leaders in solar, wind, hydroelectric and geothermal power generation. However, not every state in the region has embraced renewables so enthusiastically. This infographic displays the 2024 renewable energy usage percentages of the region's largest economies, alongside those of the United States and European Union.</p>
      <button
        class="intro-toggle"
        type="button"
        aria-controls="renewables-intro"
        :aria-expanded="introExpanded"
        @click="introExpanded = !introExpanded"
      >
        {{ introExpanded ? 'Show less' : 'Read more' }}
      </button>
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

.intro-toggle {
  display: none;
}

/* BF-224: portrait layout (see .layout-1 in public/styles.css) */
@media (max-width: 879px) {
  .intro:not(.is-expanded) {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    overflow: hidden;
  }

  .intro {
    margin-bottom: 0.25rem;
  }

  .intro-toggle {
    display: inline-block;
    padding: 0.25rem 0;
    font: inherit;
    font-weight: 600;
    color: #fff;
    background: none;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.4);
    cursor: pointer;
  }
}
</style>
