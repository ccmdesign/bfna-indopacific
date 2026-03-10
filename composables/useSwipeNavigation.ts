import { ref, readonly, onMounted, onScopeDispose, type Ref } from 'vue'

/**
 * Module-level flag to signal that a swipe navigation is in progress.
 * Used by StraitMobileDetail to skip the dummy history.pushState on re-mount.
 * Follows the same pattern as `isNavigatingBack` in useStraitTransition.ts.
 */
let _isSwipeNavigation = false

export function setSwipeNavigation(value: boolean) {
  _isSwipeNavigation = value
}

export function isSwipeNavigation(): boolean {
  return _isSwipeNavigation
}

/**
 * Module-level reactive slide direction for the <Transition> wrapper in [[id]].vue.
 * Must be a Vue ref so that computed properties in consuming components re-evaluate.
 * Set before navigateTo() so the transition name is ready when Vue renders.
 */
const _slideDirection = ref<'left' | 'right' | null>(null)

/** Reactive slide direction — use in computed() to derive transition name. */
export const slideDirection = readonly(_slideDirection)

export function clearSlideDirection() {
  _slideDirection.value = null
}

interface SwipeOptions {
  /** Callback when a valid horizontal swipe completes. */
  onSwipe: (direction: 'left' | 'right') => void
  /** Minimum horizontal distance in px to trigger (default: 50). */
  minDistance?: number
  /** Max |deltaY|/|deltaX| ratio — gesture must be more horizontal than this (default: 0.5). */
  maxVerticalRatio?: number
  /** Edge zone in px to ignore (iOS Safari back/forward gesture zone, default: 25). */
  edgeZone?: number
}

/**
 * Zero-dependency horizontal swipe composable using native touch events.
 *
 * - All listeners are passive (never blocks scroll).
 * - Single-touch only (ignores pinch-zoom).
 * - Ignores touches starting in iOS Safari edge zones.
 * - Debounces rapid swipes with a navigating guard.
 * - SSR-safe (no-op on server).
 *
 * Attach listeners in onMounted, cleanup via onScopeDispose.
 */
export function useSwipeNavigation(
  containerRef: Ref<HTMLElement | null>,
  options: SwipeOptions
) {
  // SSR guard
  if (!import.meta.client) return

  const minDistance = options.minDistance ?? 50
  const maxVerticalRatio = options.maxVerticalRatio ?? 0.5
  const edgeZone = options.edgeZone ?? 25

  let startX = 0
  let startY = 0
  let startTime = 0
  let rejected = false
  let isNavigating = false

  function onTouchStart(e: TouchEvent) {
    // Single-touch only
    if (e.touches.length !== 1) {
      rejected = true
      return
    }

    const x = e.touches[0].clientX

    // Ignore edge-zone touches (iOS Safari back/forward gesture area)
    if (x < edgeZone || x > window.innerWidth - edgeZone) {
      rejected = true
      return
    }

    startX = x
    startY = e.touches[0].clientY
    startTime = Date.now()
    rejected = false
  }

  function onTouchMove(e: TouchEvent) {
    if (rejected) return

    const dx = Math.abs(e.touches[0].clientX - startX)
    const dy = Math.abs(e.touches[0].clientY - startY)

    // Early rejection: if the gesture is clearly vertical, stop tracking
    if (dx > 0 && dy / dx > maxVerticalRatio) {
      rejected = true
    }
  }

  function onTouchEnd(e: TouchEvent) {
    if (rejected || isNavigating) return

    const endX = e.changedTouches[0].clientX
    const dx = endX - startX

    if (Math.abs(dx) < minDistance) return

    // Direction: negative dx = swiped left (next), positive = swiped right (prev)
    const direction: 'left' | 'right' = dx < 0 ? 'left' : 'right'

    // Set module-level state before firing callback
    _slideDirection.value = direction
    _isSwipeNavigation = true

    // Debounce guard
    isNavigating = true
    setTimeout(() => { isNavigating = false }, 500)

    options.onSwipe(direction)
  }

  function onTouchCancel() {
    // Reset tracking state
    rejected = true
  }

  onMounted(() => {
    const el = containerRef.value
    if (!el) return

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchCancel, { passive: true })

    onScopeDispose(() => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
    })
  })
}
