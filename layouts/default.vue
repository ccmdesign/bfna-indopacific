<script setup>
const route = useRoute()
const layoutClass = computed(() => route.meta.layoutClass || '')
const showBackLink = computed(() => route.meta.showBackLink !== false && route.path !== '/')
const footerSource = computed(() => route.meta.footerSource)
</script>

<template>
  <div class="page-wrapper | master-grid" :class="layoutClass">
    <RotateDeviceOverlay />
    <GridOverlay />

    <nav v-if="showBackLink" aria-label="Back navigation" class="back-link-nav">
      <NuxtLink to="/">Back to home</NuxtLink>
    </nav>

    <slot />

    <footer>
      <a v-if="footerSource"
         :href="footerSource.url"
         target="_blank"
         rel="noopener noreferrer"
         class="source-link">
        {{ footerSource.label }}
      </a>
      <span v-else></span>
      <img src="@/assets/images/bfna.svg" alt="BFNA Logo" class="bfna-logo-footer" />
    </footer>
  </div>
</template>

<style scoped>
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

.back-link-nav {
  position: absolute;
  top: 1rem;
  left: 1.5rem;
  z-index: 20;
}

.back-link-nav a {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s ease;
}

.back-link-nav a:hover {
  color: rgba(255, 255, 255, 0.9);
}

.back-link-nav a:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
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

.source-link:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}
</style>
