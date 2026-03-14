<script setup lang="ts">
import type { Strait } from '~/types/strait'

defineProps<{
  strait: Strait
  tiltX: number
  tiltY: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div
    class="qual-plane"
    :style="{
      transform: `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
    }"
    @click.stop
  >
    <!-- Thin top rule -->
    <div class="plane-rule" />

    <!-- Header -->
    <div class="plane-header">
      <div>
        <h2 class="plane-header__name">{{ strait.name }}</h2>
        <p class="plane-header__share">{{ strait.globalShareLabel }}</p>
      </div>
      <button
        class="plane-close"
        aria-label="Close detail panel"
        @click="emit('close')"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="square" />
        </svg>
      </button>
    </div>

    <!-- Description -->
    <p v-if="strait.description" class="plane-desc">{{ strait.description }}</p>

    <!-- Top Industries -->
    <div v-if="strait.topIndustries.length" class="plane-section">
      <h3 class="plane-section__title">Top Industries</h3>
      <div class="plane-tags">
        <span v-for="ind in strait.topIndustries" :key="ind" class="plane-tag">{{ ind }}</span>
      </div>
    </div>

    <!-- Threats -->
    <div v-if="strait.threats.length" class="plane-section">
      <h3 class="plane-section__title">Threats</h3>
      <div class="plane-tags">
        <span v-for="threat in strait.threats" :key="threat" class="plane-tag plane-tag--threat">{{ threat }}</span>
      </div>
    </div>

    <!-- Key Facts -->
    <div v-if="strait.keyFacts.length" class="plane-section">
      <h3 class="plane-section__title">Key Facts</h3>
      <ul class="plane-facts">
        <li v-for="fact in strait.keyFacts" :key="fact">{{ fact }}</li>
      </ul>
    </div>

  </div>
</template>

<style scoped>
/* ─── 3D Glass Plane ─── */
.qual-plane {
  width: 100%;
  max-width: 320px;
  max-height: 100%;
  overflow-y: auto;
  padding: 24px 24px 20px;

  /* Swiss typography base */
  color: #fff;
  font-family: 'Encode Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;

  /* No background */
  background: transparent;
  border: none;
  border-radius: 0;

  /* 3D setup */
  transform-style: preserve-3d;
  will-change: transform;
  transition: transform 0.15s ease-out;
}

.qual-plane::-webkit-scrollbar { width: 3px; }
.qual-plane::-webkit-scrollbar-track { background: transparent; }
.qual-plane::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 1px; }

/* ─── Top rule ─── */
.plane-rule {
  width: 100%;
  height: 1px;
  background: #fff;
  margin-bottom: 20px;
  opacity: 0.6;
}

/* ─── Header ─── */
.plane-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.plane-header__name {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 2px;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.plane-header__share {
  margin: 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.plane-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.plane-close:hover {
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

.plane-close:focus-visible {
  outline: 1px solid rgba(255, 255, 255, 0.6);
  outline-offset: 1px;
}

/* ─── Description ─── */
.plane-desc {
  margin: 0 0 20px;
  padding-bottom: 20px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
  line-height: 1.7;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* ─── Section titles ─── */
.plane-section {
  margin-bottom: 20px;
}

.plane-section__title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 10px;
}

/* ─── Tags (Swiss: rectangular, minimal) ─── */
.plane-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.plane-tag {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0;
  white-space: nowrap;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.plane-tag--threat {
  color: hsl(348, 80%, 72%);
  border-color: hsla(348, 60%, 55%, 0.3);
}

/* ─── Key facts list ─── */
.plane-facts {
  margin: 0;
  padding: 0;
  list-style: none;
}

.plane-facts li {
  position: relative;
  padding-left: 14px;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  line-height: 1.6;
}

.plane-facts li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 1px;
  background: rgba(255, 255, 255, 0.35);
}

@media (prefers-reduced-motion: reduce) {
  .qual-plane { transition: none; }
  .plane-close { transition: none; }
}
</style>
