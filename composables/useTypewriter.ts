import { ref, readonly, onScopeDispose, getCurrentScope } from 'vue'

/**
 * Char-by-char typewriter timing engine.
 *
 * Owns the animating *string state* + timer + reduced-motion shortcut; the
 * consuming component owns markup (e.g. the blinking caret element). This is
 * what lets `AseanMap.vue` render `displayText` into an SVG <text>/<tspan>
 * while the sidebar renders it into an HTML element — the visible cadence is
 * identical (~40 ms/char by default).
 *
 * SSR-safe: during SSR (`import.meta.client` false) `play()` simply sets the
 * full string with no timer. Reduced-motion: `play()` sets the full string
 * immediately and leaves `isTyping=false`.
 *
 * Extracted from the original inline typewriter in `AseanMap.vue` with no
 * behavior change (BF-72 U1).
 */
export interface UseTypewriterOptions {
  /** Per-character delay in ms. Default 40 (matches AseanMap hover label). */
  speedMs?: number
}

export function useTypewriter(options: UseTypewriterOptions = {}) {
  const speedMs = options.speedMs ?? 40

  const displayText = ref('')
  const isTyping = ref(false)

  let timer: ReturnType<typeof setInterval> | null = null

  function clearTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function reducedMotion() {
    return import.meta.client
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /** Clear then type `text` char-by-char. Cancels any in-flight animation. */
  function play(text: string) {
    clearTimer()

    // SSR or reduced-motion: show the final string immediately, no animation.
    if (!import.meta.client || reducedMotion()) {
      displayText.value = text
      isTyping.value = false
      return
    }

    displayText.value = ''
    if (!text) {
      isTyping.value = false
      return
    }

    let i = 0
    isTyping.value = true
    timer = setInterval(() => {
      i++
      displayText.value = text.slice(0, i)
      if (i >= text.length) {
        clearTimer()
        isTyping.value = false
      }
    }, speedMs)
  }

  /** Cancel any in-flight animation and clear the text. */
  function stop() {
    clearTimer()
    displayText.value = ''
    isTyping.value = false
  }

  /**
   * Show `text` immediately with no animation (and cancel any in-flight one).
   * Used to seed the settled value on first open / non-switch states, where
   * the typewriter must NOT animate.
   */
  function set(text: string) {
    clearTimer()
    displayText.value = text
    isTyping.value = false
  }

  if (getCurrentScope()) {
    onScopeDispose(clearTimer)
  }

  return {
    displayText: readonly(displayText),
    isTyping: readonly(isTyping),
    play,
    stop,
    set,
  }
}
