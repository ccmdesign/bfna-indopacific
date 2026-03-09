import { ref, readonly, onScopeDispose } from 'vue'

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
    onScopeDispose(() => mql.removeEventListener('change', handler))
  }

  return { isMobile: readonly(isMobile) }
}
