<template>
  <div class="page-wrapper | master-grid">
    <RotateDeviceOverlay />
    <GridOverlay />

    <NuxtLink to="/" class="back-link">
      &larr; Back
    </NuxtLink>

    <div class="coming-soon">
      <h1 class="title">Choke Points</h1>
      <p class="subtitle">Coming Soon</p>
      <p class="description">This infographic is currently under development.</p>
    </div>

    <footer>
      <span></span>
      <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo-footer" />
    </footer>
  </div>
</template>

<script setup>
import { useHead } from '#app'

useHead({
  title: 'Choke Points'
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

.page-wrapper {
  max-width: 100vw;
  min-height: 100vh;
  background: linear-gradient(to bottom, #0D0D0D 5%, #022640 105%);
  position: relative;
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

.coming-soon {
  grid-row: 3 / 5;
  grid-column: 3 / 11;
  text-align: center;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: var(--size-5);
  margin: 0 0 var(--space-s) 0;
  text-shadow: 0px 5px 5px rgba(0, 0, 0, 0.25);
}

.subtitle {
  font-size: var(--size-2);
  margin: 0 0 var(--space-m) 0;
  opacity: 0.8;
}

.description {
  font-size: var(--size-0);
  opacity: 0.6;
  max-width: 50ch;
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
</style>
