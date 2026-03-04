/**
 * Composable for generating and copying embed code for an infographic.
 *
 * Generates an <iframe> snippet pointing to /embed/<slug> with
 * recommended 1280x800 dimensions. Provides clipboard copy with
 * reactive feedback state.
 *
 * @param slug - Must be a known infographic slug (e.g., 'renewables', 'straits'),
 *   not user input. The slug is interpolated into the iframe src attribute.
 * @param title - Human-readable title for the iframe's `title` attribute (WCAG 4.1.2).
 *   Defaults to 'BFNA Indo-Pacific infographic'.
 */
export function useEmbedCode(slug: string, title = 'BFNA Indo-Pacific infographic') {
  const copied = ref(false)
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  const embedUrl = computed(() => {
    if (import.meta.client) {
      return `${window.location.origin}/embed/${slug}`
    }
    return `/embed/${slug}`
  })

  const embedCode = computed(() =>
    `<iframe src="${embedUrl.value}" width="1280" height="800" style="border:0" loading="lazy" allowfullscreen title="${title}"></iframe>`
  )

  // IMPORTANT: clipboard write must be the first await in this function
  // for Safari user-gesture compatibility. Do not add awaits before it.
  async function copyEmbedCode(): Promise<boolean> {
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
      return false
    }
  }

  // Clean up the feedback timer if the composable's scope is disposed
  // (e.g., component unmount during the 2-second feedback window).
  onScopeDispose(() => {
    if (resetTimer) clearTimeout(resetTimer)
  })

  return { embedUrl, embedCode, copied, copyEmbedCode }
}
