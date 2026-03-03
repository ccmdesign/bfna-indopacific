<script setup lang="ts">
const route = useRoute()
const layoutClass = computed(() => (route.meta.layoutClass as string) || '')
</script>

<template>
  <div class="page-wrapper | master-grid" :class="layoutClass">
    <RotateDeviceOverlay />
    <GridOverlay />

    <slot />
  </div>
</template>

<style scoped>
/*
 * NOTE: Background gradient styles (.page-wrapper, ::before, ::after) are
 * intentionally duplicated from layouts/default.vue to keep each layout
 * self-contained. Update BOTH files when changing the gradient.
 * See BF-70 plan for rationale.
 */
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
</style>
