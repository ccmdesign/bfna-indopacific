import { toValue, type MaybeRefOrGetter } from 'vue'

/**
 * Escape HTML-special characters to prevent injection when interpolating
 * values into an HTML attribute context (e.g., the iframe `title`).
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Composable for generating and copying embed code for an infographic.
 *
 * Generates an <iframe> snippet pointing to /embed/<slug> with a
 * responsive aspect-ratio wrapper (16:10, matching the 1280x800 design).
 * Provides clipboard copy with reactive feedback and error state.
 *
 * @param slug - A reactive or plain string for the infographic slug
 *   (e.g., 'renewables', 'straits'). Interpolated into the iframe src.
 * @param title - A reactive or plain human-readable title for the iframe's
 *   `title` attribute (WCAG 4.1.2). Defaults to 'BFNA Indo-Pacific infographic'.
 *   HTML-special characters are escaped automatically.
 */
export function useEmbedCode(
  slug: MaybeRefOrGetter<string>,
  title: MaybeRefOrGetter<string> = 'BFNA Indo-Pacific infographic'
) {
  const copied = ref(false)
  const error = ref(false)
  const isClipboardAvailable = ref(true)
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  // Check clipboard availability on the client
  if (import.meta.client) {
    isClipboardAvailable.value = typeof navigator !== 'undefined'
      && typeof navigator.clipboard !== 'undefined'
      && typeof navigator.clipboard.writeText === 'function'
  }

  const embedUrl = computed(() => {
    const s = toValue(slug)
    if (import.meta.client) {
      return `${window.location.origin}/embed/${s}`
    }
    return `/embed/${s}`
  })

  const embedCode = computed(() => {
    const safeTitle = escapeHtml(toValue(title))
    return `<iframe src="${embedUrl.value}" width="1280" height="800" style="border:0;max-width:100%;aspect-ratio:16/10" loading="lazy" allowfullscreen title="${safeTitle}"></iframe>`
  })

  // IMPORTANT: clipboard write must be the first await in this function
  // for Safari user-gesture compatibility. Do not add awaits before it.
  async function copyEmbedCode(): Promise<boolean> {
    error.value = false

    if (!isClipboardAvailable.value) {
      error.value = true
      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        error.value = false
      }, 3000)
      return false
    }

    try {
      await navigator.clipboard.writeText(embedCode.value)
      copied.value = true
      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        copied.value = false
      }, 2000)
      return true
    } catch {
      copied.value = false
      error.value = true
      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        error.value = false
      }, 3000)
      return false
    }
  }

  // Clean up the feedback timer if the composable's scope is disposed
  // (e.g., component unmount during the 2-second feedback window).
  onScopeDispose(() => {
    if (resetTimer) clearTimeout(resetTimer)
  })

  return { embedUrl, embedCode, copied, error, isClipboardAvailable, copyEmbedCode }
}
