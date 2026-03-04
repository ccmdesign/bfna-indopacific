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
    class="embed-code-button btn-secondary"
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
/* Base button styles are provided by the global .btn-secondary class (public/styles.css).
   Only component-specific state styles (copied, error, unavailable) are scoped here. */

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

</style>
