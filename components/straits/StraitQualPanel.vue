<script setup lang="ts">
import type { Strait } from '~/types/strait'

defineProps<{
  strait: Strait
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div class="qual-panel" @click.stop>
    <!-- Header -->
    <div class="qual-panel__header">
      <div>
        <h2 class="qual-panel__name">{{ strait.name }}</h2>
        <p class="qual-panel__share">{{ strait.globalShareLabel }}</p>
      </div>
      <button
        class="qual-panel__close"
        aria-label="Close detail panel"
        @click="emit('close')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- Description -->
    <p v-if="strait.description" class="qual-panel__desc">{{ strait.description }}</p>

    <!-- Top Industries -->
    <div v-if="strait.topIndustries.length" class="qual-panel__section">
      <h3 class="qual-panel__section-title">Top Industries</h3>
      <div class="qual-panel__tags">
        <span v-for="ind in strait.topIndustries" :key="ind" class="qual-panel__tag">{{ ind }}</span>
      </div>
    </div>

    <!-- Threats -->
    <div v-if="strait.threats.length" class="qual-panel__section">
      <h3 class="qual-panel__section-title">Threats</h3>
      <div class="qual-panel__tags">
        <span v-for="threat in strait.threats" :key="threat" class="qual-panel__tag qual-panel__tag--threat">{{ threat }}</span>
      </div>
    </div>

    <!-- Key Facts -->
    <div v-if="strait.keyFacts.length" class="qual-panel__section">
      <h3 class="qual-panel__section-title">Key Facts</h3>
      <ul class="qual-panel__facts">
        <li v-for="fact in strait.keyFacts" :key="fact">{{ fact }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.qual-panel {
  width: 280px;
  max-height: 100%;
  overflow-y: auto;
  padding: 20px;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Encode Sans', sans-serif;
  font-size: 12px;
  line-height: 1.5;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

.qual-panel::-webkit-scrollbar { width: 4px; }
.qual-panel::-webkit-scrollbar-track { background: transparent; }
.qual-panel::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 2px; }

/* --- Header --- */
.qual-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.qual-panel__name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 2px;
  color: #fff;
  letter-spacing: -0.01em;
}

.qual-panel__share {
  margin: 0;
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 500;
}

.qual-panel__close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.qual-panel__close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.85);
}

.qual-panel__close:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 1px;
}

/* --- Description --- */
.qual-panel__desc {
  margin: 0 0 16px;
  padding-bottom: 16px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  line-height: 1.65;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

/* --- Section titles --- */
.qual-panel__section-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 8px;
}

.qual-panel__section {
  margin-bottom: 16px;
}

/* --- Tags --- */
.qual-panel__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.qual-panel__tag {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  white-space: nowrap;
}

.qual-panel__tag--threat {
  color: hsl(348, 80%, 72%);
  background: hsla(348, 60%, 55%, 0.1);
  border-color: hsla(348, 60%, 55%, 0.2);
}

/* --- Key facts list --- */
.qual-panel__facts {
  margin: 0;
  padding: 0;
  list-style: none;
}

.qual-panel__facts li {
  position: relative;
  padding-left: 12px;
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
  line-height: 1.55;
}

.qual-panel__facts li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 4px;
  height: 4px;
  border-radius: 1px;
  background: var(--color-accent);
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .qual-panel__close { transition: none; }
}
</style>
