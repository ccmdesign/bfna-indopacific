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
  return 'Copy Embed Link'
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
    class="embed-code-link"
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
/* Rendered as a plain underlined text link (not a button chrome), matching the
   footer .source-link. Stays a <button> for a11y since it triggers a copy
   action rather than navigation. */
.embed-code-link {
  appearance: none;
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: inherit;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.embed-code-link:hover {
  color: rgba(255, 255, 255, 0.9);
}

.embed-code-link:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

.embed-code-link.is-copied {
  color: rgba(34, 197, 94, 0.95);
}

.embed-code-link.is-error {
  color: rgba(239, 68, 68, 0.95);
}

.embed-code-link.is-unavailable {
  opacity: 0.5;
  cursor: not-allowed;
  text-decoration: none;
}

</style>
