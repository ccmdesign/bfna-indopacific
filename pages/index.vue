<template>
  <div class="landing-page | master-grid">
    <RotateDeviceOverlay />
    <GridOverlay />

    <header class="landing-header">
      <h1 class="landing-title">Indo-Pacific<br/>Energy Futures</h1>
      <p class="landing-subtitle">Interactive Data Visualizations</p>
    </header>

    <nav class="landing-nav">
      <NuxtLink to="/renewables-on-the-rise" class="nav-card">
        <h2>Renewables on the Rise</h2>
        <p>Explore renewable energy adoption across the Indo-Pacific region</p>
      </NuxtLink>

      <NuxtLink to="/choke-points" class="nav-card">
        <h2>Choke Points</h2>
        <p>Coming soon</p>
      </NuxtLink>
    </nav>

    <footer class="landing-footer">
      <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo-footer" />
    </footer>
  </div>
</template>

<script setup>
import { useHead } from '#app'

useHead({
  title: 'Indo-Pacific Energy Futures | BFNA'
})
</script>

<style scoped>
.landing-page {
  max-width: 100vw;
  min-height: 100vh;
  background: linear-gradient(to bottom, #0D0D0D 5%, #022640 105%);
  position: relative;
}

.landing-page:before {
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

.landing-header {
  grid-row: 2 / 3;
  grid-column: 3 / 11;
  text-align: center;
  z-index: 1;
}

.landing-title {
  font-size: var(--size-5);
  margin: 0 0 var(--space-m) 0;
  text-shadow: 0px 5px 5px rgba(0, 0, 0, 0.25);
}

.landing-subtitle {
  font-size: var(--size-1);
  opacity: 0.7;
  margin: 0;
}

.landing-nav {
  grid-row: 4 / 6;
  grid-column: 3 / 11;
  display: flex;
  gap: var(--space-xl);
  justify-content: center;
  align-items: stretch;
  z-index: 1;
}

.nav-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: var(--space-xl);
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  flex: 1;
  max-width: 400px;
  display: flex;
  flex-direction: column;
}

.nav-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-4px);
}

.nav-card h2 {
  font-size: var(--size-2);
  margin: 0 0 var(--space-s) 0;
}

.nav-card p {
  font-size: var(--size-0);
  opacity: 0.7;
  margin: 0;
}

.landing-footer {
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
  justify-content: flex-end;
  z-index: 20;
}

.landing-footer img {
  max-width: 100px;
}

@media (max-width: 900px) {
  .landing-header {
    grid-row: 2 / 3;
    grid-column: 1 / 13;
    padding: 0 var(--space-m);
  }

  .landing-nav {
    grid-row: 3 / 6;
    grid-column: 1 / 13;
    flex-direction: column;
    padding: 0 var(--space-m);
  }

  .nav-card {
    max-width: none;
  }
}
</style>
