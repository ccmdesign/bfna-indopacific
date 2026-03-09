import { ref, readonly, type Ref, type DeepReadonly, onScopeDispose, getCurrentScope } from 'vue'

export type TransitionState =
  | 'idle'
  | 'capturing'
  | 'animating-forward'
  | 'settled'
  | 'animating-back'

interface UseStraitTransitionOptions {
  forwardDuration?: number
  reverseDuration?: number
  forwardEasing?: string
  reverseEasing?: string
}

/** Return type for useStraitTransition composable. */
export interface UseStraitTransitionReturn {
  transitionState: DeepReadonly<Ref<TransitionState>>
  captureCard: (straitId: string, cardEl: HTMLElement) => void
  playForward: (heroCircleEl: HTMLElement) => void
  playReverse: () => Promise<void>
  cardRect: DeepReadonly<Ref<DOMRect | null>>
  scrollY: DeepReadonly<Ref<number>>
}

const DEFAULTS = {
  forwardDuration: 350,
  reverseDuration: 300,
  forwardEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  reverseEasing: 'cubic-bezier(0.4, 0, 0.6, 1)',
  /** Delay for content exit fade (must match CSS .strait-transition-content--exit transition duration) */
  exitDelay: 100,
}

// ----------------------------------------------------------------
// Module-level shared state (singleton across all consumers)
// ----------------------------------------------------------------
const state = ref<TransitionState>('idle')
const cardRect = ref<DOMRect | null>(null)
const storedScrollY = ref(0)

let currentAnimation: Animation | null = null
let cloneEl: HTMLElement | null = null
let capturedStraitId: string | null = null
let reducedMotion = false
let orientationChanged = false
let listenersInitialized = false
/** Stored reference to the hero circle element from playForward, used in playReverse. */
let heroCircleRef: HTMLElement | null = null
/** Guard to prevent double back-navigation from both handleBack and popstate firing. */
let isNavigatingBack = false

// Store listener references for HMR cleanup
let motionMql: MediaQueryList | null = null
let motionListener: ((e: MediaQueryListEvent) => void) | null = null
let orientMql: MediaQueryList | null = null
let orientListener: (() => void) | null = null

// HMR cleanup: remove old listeners and reset state on module replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (motionMql && motionListener) {
      motionMql.removeEventListener('change', motionListener)
    }
    if (orientMql && orientListener) {
      orientMql.removeEventListener('change', orientListener)
    }
    listenersInitialized = false
    motionMql = null
    motionListener = null
    orientMql = null
    orientListener = null
    currentAnimation?.cancel()
    currentAnimation = null
    cloneEl?.remove()
    cloneEl = null
    heroCircleRef = null
    isNavigatingBack = false
    state.value = 'idle'
    cardRect.value = null
    storedScrollY.value = 0
  })
}

/**
 * Shared-element FLIP transition for the strait card-to-detail animation.
 *
 * Manages a floating clone that animates between the card thumbnail
 * and the hero circle, with forward and reverse transitions.
 *
 * Uses module-level shared state so all components (StraitCard,
 * StraitMobileDetail, [[id]].vue) see the same transition state.
 *
 * SSR-safe: returns no-op functions during SSR.
 */
export function useStraitTransition(options?: UseStraitTransitionOptions): UseStraitTransitionReturn {
  // SSR guard — return inert stubs on the server
  if (!import.meta.client) {
    return {
      transitionState: readonly(ref<TransitionState>('idle')),
      captureCard: (_straitId: string, _cardEl: HTMLElement) => {},
      playForward: (_heroCircleEl: HTMLElement) => {},
      playReverse: async () => {},
      cardRect: readonly(ref<DOMRect | null>(null)),
      scrollY: readonly(ref(0)),
    }
  }

  const config = { ...DEFAULTS, ...options }

  // Initialize global listeners once
  if (!listenersInitialized) {
    listenersInitialized = true

    motionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion = motionMql.matches
    motionListener = (e) => { reducedMotion = e.matches }
    motionMql.addEventListener('change', motionListener)

    orientMql = window.matchMedia('(orientation: portrait)')
    orientListener = () => { orientationChanged = true }
    orientMql.addEventListener('change', orientListener)
  }

  // Per-scope cleanup: cancel animations if the consuming component unmounts
  if (getCurrentScope()) {
    onScopeDispose(() => {
      currentAnimation?.cancel()
      removeClone()
    })
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  function removeClone() {
    if (cloneEl) {
      cloneEl.remove()
      cloneEl = null
    }
  }

  function createClone(sourceEl: HTMLElement, rect: DOMRect): HTMLElement {
    const clone = sourceEl.cloneNode(true) as HTMLElement
    // Remove canvas elements from clone (canvas content is not cloned, would show as blank)
    clone.querySelectorAll('canvas').forEach(c => c.remove())
    clone.className = 'strait-transition-clone'
    // Lock dimensions to source rect
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`
    clone.style.left = `${rect.left}px`
    clone.style.top = `${rect.top}px`
    return clone
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Capture the card thumbnail rect on tap (synchronous — must run
   * before Vue processes any reactive updates).
   */
  function captureCard(straitId: string, cardEl: HTMLElement) {
    // Guard against double-tap while animating
    if (state.value !== 'idle') return

    state.value = 'capturing'
    capturedStraitId = straitId
    orientationChanged = false
    isNavigatingBack = false

    // Stop scroll momentum on iOS before measuring
    window.scrollTo(window.scrollX, window.scrollY)

    cardRect.value = cardEl.getBoundingClientRect()
    storedScrollY.value = window.scrollY
  }

  /**
   * Play the forward FLIP animation.
   * Called from StraitMobileDetail's onMounted.
   */
  function playForward(heroCircleEl: HTMLElement) {
    // Store the hero circle reference for use in playReverse
    heroCircleRef = heroCircleEl

    if (state.value !== 'capturing' || !cardRect.value) {
      // No capture happened (e.g., direct URL navigation) — go straight to settled
      state.value = 'settled'
      return
    }

    if (reducedMotion) {
      state.value = 'settled'
      return
    }

    state.value = 'animating-forward'

    // Wait one rAF for the ResizeObserver in StraitMobileDetail to fire
    // so the hero circle settles at its responsive size
    requestAnimationFrame(() => {
      if (state.value !== 'animating-forward') return // guard against cancellation

      const heroRect = heroCircleEl.getBoundingClientRect()
      const first = cardRect.value!

      // Create the floating clone from the hero element (it has the correct image)
      removeClone()
      cloneEl = createClone(heroCircleEl, first)
      document.body.appendChild(cloneEl)

      // Hide the real hero circle during animation
      heroCircleEl.style.opacity = '0'

      // Compute FLIP deltas: animate clone FROM card position TO hero position
      const dx = first.left - heroRect.left
      const dy = first.top - heroRect.top
      const scaleX = first.width / heroRect.width
      const scaleY = first.height / heroRect.height

      // Position clone at hero rect, then animate FROM inverted (card) TO identity (hero)
      cloneEl.style.left = `${heroRect.left}px`
      cloneEl.style.top = `${heroRect.top}px`
      cloneEl.style.width = `${heroRect.width}px`
      cloneEl.style.height = `${heroRect.height}px`

      const animation = cloneEl.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
            filter: 'blur(2px)',
          },
          {
            transform: 'translate(0, 0) scale(1, 1)',
            filter: 'blur(0px)',
            offset: 0.2,
          },
          {
            transform: 'translate(0, 0) scale(1, 1)',
            filter: 'blur(0px)',
          },
        ],
        {
          duration: config.forwardDuration,
          easing: config.forwardEasing,
          fill: 'forwards',
        }
      )

      currentAnimation = animation

      animation.finished
        .then(() => {
          try {
            animation.commitStyles()
            animation.cancel()
          } catch {
            // Element may be detached from DOM (e.g., rapid navigation)
          }
          currentAnimation = null

          // Show the real hero, remove clone
          heroCircleEl.style.opacity = ''
          removeClone()

          state.value = 'settled'
        })
        .catch(() => {
          // Animation was cancelled (component unmounted, etc.)
          heroCircleEl.style.opacity = ''
          removeClone()
          if (state.value === 'animating-forward') {
            state.value = 'settled'
          }
        })
    })
  }

  /**
   * Play the reverse FLIP animation (hero -> card position).
   * Returns a promise that resolves when the animation completes.
   *
   * Uses the stored hero circle reference from playForward instead of
   * querying the DOM by class name.
   *
   * Guarded by isNavigatingBack flag to prevent double navigation
   * from both the in-app back button and the popstate handler.
   */
  async function playReverse(): Promise<void> {
    // Guard against double navigation (both handleBack and popstate firing)
    if (isNavigatingBack) return
    if (state.value !== 'settled') return

    isNavigatingBack = true

    if (reducedMotion || !cardRect.value || orientationChanged) {
      state.value = 'idle'
      cardRect.value = null
      return
    }

    state.value = 'animating-back'

    // Brief delay for content to fade out (driven by CSS .strait-transition-content--exit)
    await new Promise(resolve => setTimeout(resolve, config.exitDelay))

    // Use stored hero circle reference instead of fragile DOM query
    const heroCircleEl = heroCircleRef
    if (!heroCircleEl || !heroCircleEl.isConnected) {
      state.value = 'idle'
      cardRect.value = null
      return
    }

    const heroRect = heroCircleEl.getBoundingClientRect()
    const target = cardRect.value!

    // Create clone at hero position
    removeClone()
    cloneEl = createClone(heroCircleEl, heroRect)
    document.body.appendChild(cloneEl)

    // Hide real hero
    heroCircleEl.style.opacity = '0'

    // FLIP: animate from hero to card position
    const dx = target.left - heroRect.left
    const dy = target.top - heroRect.top
    const scaleX = target.width / heroRect.width
    const scaleY = target.height / heroRect.height

    const animation = cloneEl.animate(
      [
        {
          transform: 'translate(0, 0) scale(1, 1)',
          opacity: 1,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
          opacity: 1,
        },
      ],
      {
        duration: config.reverseDuration,
        easing: config.reverseEasing,
        fill: 'forwards',
      }
    )

    currentAnimation = animation

    try {
      await animation.finished
      animation.commitStyles()
      animation.cancel()
    } catch {
      // cancelled
    }

    currentAnimation = null
    removeClone()
    heroCircleEl.style.opacity = ''

    state.value = 'idle'
    cardRect.value = null
  }

  return {
    transitionState: readonly(state),
    captureCard,
    playForward,
    playReverse,
    cardRect: readonly(cardRect),
    scrollY: readonly(storedScrollY),
  }
}
