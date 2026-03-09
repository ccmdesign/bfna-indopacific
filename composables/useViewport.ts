import { ref, readonly, onScopeDispose, getCurrentScope } from 'vue'

/**
 * Reactive viewport detection composable.
 * Returns `isMobile` (true when viewport <= 899px).
 * SSR-safe: defaults to `false` during SSR, hydrates on mount.
 */
export function useViewport() {
  const isMobile = ref(false)

  if (import.meta.client) {
    const mql = window.matchMedia('(max-width: 899px)')
    isMobile.value = mql.matches

    const handler = (e: MediaQueryListEvent) => { isMobile.value = e.matches }
    mql.addEventListener('change', handler)

    if (getCurrentScope()) {
      onScopeDispose(() => mql.removeEventListener('change', handler))
    } else {
      console.warn('[useViewport] Called outside Vue scope — listener will not be cleaned up automatically.')
    }
  }

  return { isMobile: readonly(isMobile) }
}
