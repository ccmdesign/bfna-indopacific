<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const LAYERS = ['trade', 'investment', 'raw-materials', 'alignment', 'defense'] as const
type Layer = (typeof LAYERS)[number]

const LABELS: Record<Layer, string> = {
  trade: 'Trade',
  investment: 'Investment',
  'raw-materials': 'Raw materials',
  alignment: 'Alignment',
  defense: 'Defense'
}

function select(layer: Layer) {
  emit('update:modelValue', layer)
}
</script>

<template>
  <div class="asean-toggle" role="tablist" aria-label="Data layer">
    <span class="asean-toggle__label" aria-hidden="true">Data layer</span>
    <button
      v-for="layer in LAYERS"
      :key="layer"
      type="button"
      role="tab"
      :aria-selected="props.modelValue === layer"
      class="asean-toggle__seg"
      :class="{ 'is-active': props.modelValue === layer }"
      @click="select(layer)"
    >
      {{ LABELS[layer] }}
    </button>
  </div>
</template>

<style scoped>
.asean-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  background: rgba(2, 38, 64, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  font-family: 'Encode Sans', sans-serif;
}

.asean-toggle__label {
  font-size: var(--size--1);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  padding: 0 0.75rem 0 0.5rem;
}

.asean-toggle__seg {
  background: transparent;
  border: 1px solid transparent;
  color: rgba(255, 255, 255, 0.6);
  font-family: inherit;
  font-size: var(--size--1);
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 0.5rem 0.85rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
}

.asean-toggle__seg:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.asean-toggle__seg.is-active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: hsl(218, 60%, 58%);
  box-shadow: inset 0 0 0 1px hsl(218, 60%, 58%);
}

.asean-toggle__seg:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .asean-toggle__seg {
    transition: none;
  }
}
</style>
