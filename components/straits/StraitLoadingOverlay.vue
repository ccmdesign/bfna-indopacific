<script setup lang="ts">
/**
 * StraitLoadingOverlay — minimalist loading indicator shown over
 * the particle canvas while the MarineTraffic iframe loads.
 *
 * A 10s progress bar with a pulse animation + label, styled to
 * match the StraitQuantPanel Swiss typography.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

const progress = ref(0)
const visible = ref(false)
let raf: number | null = null
let startTime = 0
const DURATION_MS = 20_000

function tick(now: number) {
  if (!startTime) startTime = now
  progress.value = Math.min(((now - startTime) / DURATION_MS) * 100, 100)
  if (progress.value < 100) {
    raf = requestAnimationFrame(tick)
  }
}

onMounted(() => {
  raf = requestAnimationFrame(tick)
  requestAnimationFrame(() => { visible.value = true })
})

onBeforeUnmount(() => {
  if (raf != null) cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="loading-overlay" :class="{ 'loading-overlay--visible': visible }" aria-hidden="true">
    <span class="loading-label">Loading Live Data</span>
    <div class="loading-track">
      <div class="loading-fill" :style="{ width: progress + '%' }" />
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s ease;
  /* Counter-scale to appear the same size regardless of circle zoom */
  scale: calc(1 / var(--zoom-scale, 1));
}

.loading-overlay--visible {
  opacity: 1;
}

.loading-label {
  font-family: 'Encode Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.45);
  animation: label-pulse 2s ease-in-out infinite;
}

.loading-track {
  width: 80px;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.loading-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
  transition: width 0.1s linear;
  animation: fill-pulse 2s ease-in-out infinite;
}

@keyframes label-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes fill-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (prefers-reduced-motion: reduce) {
  .loading-overlay { transition: none; }
  .loading-label { animation: none; }
  .loading-fill { animation: none; }
}
</style>
