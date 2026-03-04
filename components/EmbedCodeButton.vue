<script setup lang="ts">
const props = defineProps<{
  slug: string
  title?: string
}>()

const { copied, error, isClipboardAvailable, copyEmbedCode } = useEmbedCode(
  () => props.slug,
  () => props.title ?? 'BFNA Indo-Pacific infographic'
)

const buttonLabel = computed(() => {
  if (error.value) return 'Copy failed'
  if (copied.value) return 'Copied!'
  return 'Copy Embed Code'
})

const ariaMessage = computed(() => {
  if (error.value) return 'Failed to copy embed code. Please select and copy manually.'
  if (copied.value) return 'Embed code copied to clipboard'
  return ''
})
</script>

<template>
  <button
    type="button"
    class="embed-code-button"
    :class="{
      'is-copied': copied,
      'is-error': error,
      'is-unavailable': !isClipboardAvailable,
    }"
    :disabled="!isClipboardAvailable"
    :title="!isClipboardAvailable ? 'Clipboard not available in this browser context' : undefined"
    @click="copyEmbedCode"
  >
    {{ buttonLabel }}
    <span class="visually-hidden" aria-live="polite">
      {{ ariaMessage }}
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

.embed-code-button.is-error {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
  color: rgba(239, 68, 68, 0.95);
}

.embed-code-button.is-unavailable {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .embed-code-button {
    transition: none;
  }
}
</style>
