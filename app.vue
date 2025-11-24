<template>
  <div class="page-wrapper | master-grid layout-1">
    <GridOverlay />
    <h1 class="title">Renewables <br/>  on the Rise</h1>
    <p class="description">Amid rising concerns about climate change and energy security, a growing number of states have invested in expanding renewable energy infrastructure. This has been especially visible in the Indo-Pacific, where several countries have become global leaders in solar, wind, hydroelectric and geothermal power generation. However, not every state in the region has embraced renewables so enthusiastically. This infographic displays the 2024 renewable energy usage percentages of the region's largest economies, alongside those of the United States and European Union.</p>
    <RenewableEnergyChart class="chart"/>
    <div class="bg-image">
      <img src="@/assets/images/planet.png" alt="Planet Background" />
    </div>
    <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo" />

    <footer>
      <h4>Indo-Pacific Project</h4>
      <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo-footer" />
    </footer>
  </div>
</template>

<style scoped>
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
  background: linear-gradient(to bottom, #022640 5%, #0B4672 105%);
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
  
  img {
    max-width: 100px;
  }

}


</style>

<script setup>
import { useHead } from '#app'

useHead({
  title: 'Renewables on the Rise',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap' }
  ]
})
</script>