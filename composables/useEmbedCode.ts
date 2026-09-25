import { toValue, type MaybeRefOrGetter } from 'vue'
import { findInfographic } from '~/data/infographics'

/**
 * BF-224: phones get a taller frame so the embed's cover card has room for its
 * visual and copy. Applied from a <style> rule in the snippet — if a CMS strips
 * <style>, the inline aspect-ratio still sizes the frame and the stage adapts.
 */
export const EMBED_PHONE_ASPECT = '4 / 5'
export const EMBED_PHONE_BREAKPOINT = 640

/** Frame shape for an infographic's embed: its design canvas, or 16:10 without one. */
export function embedAspectFor(slug: string): string {
  const canvas = findInfographic(slug)?.canvas
  return canvas ? `${canvas.width} / ${canvas.height}` : '16 / 10'
}

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
 * Generates an <iframe> snippet pointing to /embed/<slug>. The frame is
 * full-width at the infographic's design aspect ratio (4:5 on phones); the
 * embed stage scales the infographic to whatever size results (BF-224), so
 * hosts can also size the frame however they like.
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
  const origin = ref('')
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  // Prerender and hydration must use the same URL; resolve the host after mounting.
  onMounted(() => {
    origin.value = window.location.origin
  })

  // Check clipboard availability on the client
  if (import.meta.client) {
    isClipboardAvailable.value = typeof navigator !== 'undefined'
      && typeof navigator.clipboard !== 'undefined'
      && typeof navigator.clipboard.writeText === 'function'
  }

  const embedUrl = computed(() => {
    const s = toValue(slug)
    return `${origin.value}/embed/${s}`
  })

  const embedCode = computed(() => {
    const safeTitle = escapeHtml(toValue(title))
    const aspect = embedAspectFor(toValue(slug))
    return `<style>@media (max-width:${EMBED_PHONE_BREAKPOINT}px){iframe.bfna-embed{aspect-ratio:${EMBED_PHONE_ASPECT}!important}}</style>\n`
      + `<iframe class="bfna-embed" src="${embedUrl.value}" title="${safeTitle}" style="display:block;width:100%;aspect-ratio:${aspect};border:0" loading="lazy" allowfullscreen></iframe>`
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
