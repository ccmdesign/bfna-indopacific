<script setup lang="ts">
const props = defineProps<{
  slug: string
  title?: string
}>()

const { copied, copyEmbedCode } = useEmbedCode(props.slug, props.title)
</script>

<template>
  <button
    type="button"
    class="embed-code-button"
    :class="{ 'is-copied': copied }"
    @click="copyEmbedCode"
  >
    {{ copied ? 'Copied!' : 'Copy Embed Code' }}
    <span class="visually-hidden" aria-live="polite">
      {{ copied ? 'Embed code copied to clipboard' : '' }}
    </span>
  </button>
</template>

<style scoped>
.embed-code-button {
  font-family: 'Encode Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.embed-code-button:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.35);
}

.embed-code-button:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

.embed-code-button.is-copied {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
  color: rgba(34, 197, 94, 0.95);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .embed-code-button {
    transition: none;
  }
}
</style>
