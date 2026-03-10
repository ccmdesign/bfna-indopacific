/**
 * useReducedMotion — reactive prefers-reduced-motion detection.
 *
 * Returns a `Ref<boolean>` that is `true` when the user prefers reduced motion.
 * SSR-safe: returns `false` on the server, and attaches a `matchMedia` listener
 * on mount that cleans up on unmount.
 */

import { ref, onMounted, onUnmounted } from 'vue'

export function useReducedMotion() {
  const prefersReducedMotion = ref(false)
  let cleanup: (() => void) | null = null

  onMounted(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = mql.matches
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.value = e.matches
    }
    mql.addEventListener('change', handler)
    cleanup = () => mql.removeEventListener('change', handler)
  })

  onUnmounted(() => {
    cleanup?.()
  })

  return prefersReducedMotion
}
