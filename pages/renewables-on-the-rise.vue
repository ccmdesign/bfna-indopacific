<template>
  <div class="page-wrapper | master-grid">
    <RotateDeviceOverlay />
    <GridOverlay />

    <NuxtLink to="/" class="back-link">
      &larr; Back
    </NuxtLink>

    <div class="center">
      <h1 class="title">Renewables on the Rise</h1>
      <div class="description">
        <p>Amid rising concerns about climate change and energy security, a growing number of states have invested in expanding renewable energy infrastructure. This has been especially visible in the Indo-Pacific, where several countries have become global leaders in solar, wind, hydroelectric and geothermal power generation. However, not every state in the region has embraced renewables so enthusiastically. This infographic displays the 2024 renewable energy usage percentages of the region's largest economies, alongside those of the United States and European Union.</p>
        <p class="source-description"><em>Percentage of electricity produced from renewable sources, which include solar, wind, hydropower, bioenergy, geothermal, wave, and tidal.</em></p>
      </div>
      <RenewableEnergyChart class="chart"/>
    </div>
    <footer>
      <a href="https://ourworldindata.org/grapher/share-of-electricity-production-from-renewable-sources?time=earliest..2024&country=CHN~JPN~IND~KOR~AUS~IDN~TWN~THA~USA~EU+%28Ember%29" target="_blank" rel="noopener noreferrer" class="source-link">Source: Our World in Data</a>
      <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo-footer" />
    </footer>
  </div>
</template>

<script setup>
import { useHead } from '#app'

useHead({
  title: 'Renewables on the Rise'
})
</script>

<style scoped>
.back-link {
  position: absolute;
  top: 1.5rem;
  left: 2rem;
  z-index: 25;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: var(--size-0);
  transition: color 0.2s ease;
}

.back-link:hover {
  color: rgba(255, 255, 255, 1);
}

.bfna-logo {
  position: absolute;
  bottom: 3rem;
  left: 3rem;
  width: 140px;
  z-index: 20;
  opacity: 1;

  @media (max-width: 900px) {
    top: 2rem;
    right: 2rem;
    width: 100px;
    left: auto;
    bottom: auto;
  }
}

.page-wrapper {
  max-width: 100vw;
  max-height: 100vh;
  background: linear-gradient(to bottom, #0D0D0D 5%, #022640 105%);
  position: relative;

  @media (max-width: 900px) {
    max-height: 100%;
    height: 100%;
  }
}

.page-wrapper:before {
  content: '';
  position: absolute;
  pointer-events: none;
  mix-blend-mode: color;
  z-index: 10;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 0%, rgba(0, 0, 200, 0.2) 0%, rgba(0, 0, 200, 0) 100%);
}

.page-wrapper:after {
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: 0;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 100%);
}

footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.2);
  height: 4rem;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 20;
}

footer img {
  max-width: 100px;
}

.source-link {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: color 0.2s ease;
  flex-shrink: 0;
}

.source-link:hover {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
}

.source-description {
  font-size: 0.875rem;
  opacity: 0.6;
}
</style>
