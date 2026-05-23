import { ref, readonly, onScopeDispose, getCurrentScope } from 'vue'

/**
 * Affix-aware numeric scramble timing engine (BF-72 U2).
 *
 * Animates a numeric-with-affix string (e.g. `"$143B"`, `"$2.7B"`) by churning
 * the unsettled digit positions through random 0–9 glyphs and locking them
 * left→right over ~500 ms, holding non-digit affixes (`$`, `B`, etc.) static
 * throughout. The `.` separator is held static too (it never reads as noise).
 *
 * Owns the animating *string state* + rAF handle + reduced-motion shortcut; the
 * consuming component owns markup. SSR-safe (`import.meta.client` guard);
 * reduced-motion sets the final value immediately. Cleanup via `onScopeDispose`.
 *
 * Patterns mirror `useParticleFlow.ts` (rAF loop + matchMedia gate) and
 * `useViewport.ts` (SSR + scope-dispose).
 */
export interface UseScrambleOptions {
  /** Total scramble duration in ms. Default 500. */
  durationMs?: number
}

const DIGIT = /[0-9]/
const RANDOM_GLYPH = () => String(Math.floor(Math.random() * 10))

export function useScramble(options: UseScrambleOptions = {}) {
  const durationMs = options.durationMs ?? 500

  const displayText = ref('')
  const isScrambling = ref(false)

  let rafId: number | null = null

  function cancelRaf() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function reducedMotion() {
    return import.meta.client
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /**
   * Scramble `value` into place. Cancels any in-flight scramble first. Digit
   * positions churn 0–9 and lock left→right; `$`/`B`/`.`/any non-digit hold
   * their final glyph the whole time.
   */
  function play(value: string) {
    cancelRaf()

    // SSR / reduced-motion / nothing to scramble: show the final value at once.
    const chars = [...value]
    const scrambleIndices = chars
      .map((c, i) => (DIGIT.test(c) ? i : -1))
      .filter((i) => i >= 0)

    if (!import.meta.client || reducedMotion() || scrambleIndices.length === 0) {
      displayText.value = value
      isScrambling.value = false
      return
    }

    // Per-digit lock time, spread left→right across the duration. Each digit
    // settles a bit after the previous one; the last digit locks at durationMs.
    const step = durationMs / scrambleIndices.length
    const lockTimes = new Map<number, number>()
    scrambleIndices.forEach((charIndex, n) => {
      lockTimes.set(charIndex, (n + 1) * step)
    })

    isScrambling.value = true
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const out = chars.map((c, i) => {
        const lockAt = lockTimes.get(i)
        if (lockAt === undefined) return c // held affix / separator
        return elapsed >= lockAt ? c : RANDOM_GLYPH()
      })
      displayText.value = out.join('')

      if (elapsed >= durationMs) {
        displayText.value = value
        isScrambling.value = false
        rafId = null
        return
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
  }

  /** Cancel any in-flight scramble and clear the text. */
  function stop() {
    cancelRaf()
    displayText.value = ''
    isScrambling.value = false
  }

  /**
   * Show `value` immediately with no scramble (and cancel any in-flight one).
   * Used to seed the settled value on first open / non-switch states, where
   * the number must NOT churn.
   */
  function set(value: string) {
    cancelRaf()
    displayText.value = value
    isScrambling.value = false
  }

  if (getCurrentScope()) {
    onScopeDispose(cancelRaf)
  }

  return {
    displayText: readonly(displayText),
    isScrambling: readonly(isScrambling),
    play,
    stop,
    set,
  }
}
