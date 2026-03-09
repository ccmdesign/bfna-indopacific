import { ref, readonly, onScopeDispose, getCurrentScope } from 'vue'

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

const DEFAULTS = {
  forwardDuration: 350,
  reverseDuration: 300,
  forwardEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  reverseEasing: 'cubic-bezier(0.4, 0, 0.6, 1)',
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
export function useStraitTransition(options?: UseStraitTransitionOptions) {
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

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion = mql.matches
    mql.addEventListener('change', (e) => { reducedMotion = e.matches })

    const orientMql = window.matchMedia('(orientation: portrait)')
    orientMql.addEventListener('change', () => { orientationChanged = true })
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
          animation.commitStyles()
          animation.cancel()
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
   */
  async function playReverse(): Promise<void> {
    if (state.value !== 'settled') return

    if (reducedMotion || !cardRect.value || orientationChanged) {
      state.value = 'idle'
      cardRect.value = null
      return
    }

    state.value = 'animating-back'

    // Brief delay for content to fade out (100ms, driven by CSS)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Find the hero circle element in the current DOM
    const heroCircleEl = document.querySelector('.strait-mobile-detail__hero-circle') as HTMLElement | null
    if (!heroCircleEl) {
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
