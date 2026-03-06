/**
 * useStraitTransition
 *
 * Encapsulates the GSAP timeline for the circle-to-lens transition.
 * Forward: fades non-selected circles, scales selected circle to fill
 * the viewport, and cross-fades the lens overlay into view.
 * Reverse: plays the timeline in reverse, restoring the overview state.
 *
 * Uses gsap.context() for automatic cleanup and gsap.matchMedia() for
 * prefers-reduced-motion support (instant show/hide when reduced).
 *
 * SSR-safe: all GSAP calls are guarded behind import.meta.client.
 */
import { gsap } from 'gsap'
import { ref, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export interface TransitionTargets {
  /** The root container wrapping the map (used for viewport rect) */
  mapContainer: Ref<HTMLElement | null>
  /** The SVG element containing circle groups */
  circleOverlay: ComputedRef<SVGSVGElement | null> | Ref<SVGSVGElement | null>
  /** The lens overlay container (available only when lens is mounted) */
  lensContainer: Ref<HTMLElement | null>
}

export interface TransitionCallbacks {
  /** Called when reverse animation completes (before lens unmount) */
  onReverseComplete?: () => void
}

export function useStraitTransition(
  targets: TransitionTargets,
  callbacks?: TransitionCallbacks,
) {
  let ctx: gsap.Context | null = null
  let timeline: gsap.core.Timeline | null = null
  const isAnimating = ref(false)

  // Store the element that triggered the open for focus restoration
  const triggerElement = ref<Element | null>(null)

  function open(straitId: string, straitData: { cx: number; cy: number }) {
    if (isAnimating.value || !import.meta.client) return

    // Store the currently focused element for restoration on close
    triggerElement.value = document.activeElement

    const svg = targets.circleOverlay.value
    const circleGroups = svg?.querySelectorAll('.strait-circle-group')
    if (!circleGroups || !svg) return

    const selected = svg.querySelector(`[data-strait-id="${straitId}"]`)
    if (!selected) return

    const others = Array.from(circleGroups).filter(
      (g) => g.getAttribute('data-strait-id') !== straitId,
    )

    // Cache geometry BEFORE any GSAP transforms
    const viewportRect = targets.mapContainer.value?.getBoundingClientRect()
    const circleRect = selected.getBoundingClientRect()

    // Clean up any previous context
    ctx?.revert()

    ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      mm.add(
        {
          isMotionOk: '(prefers-reduced-motion: no-preference)',
          isReduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { isReduced } = context.conditions!

          if (isReduced) {
            // Instant transition — no motion
            gsap.set(others, { opacity: 0 })
            gsap.set(selected, { opacity: 0 })
            if (targets.lensContainer.value) {
              gsap.set(targets.lensContainer.value, { opacity: 1, scale: 1 })
            }
            return
          }

          isAnimating.value = true
          timeline = gsap.timeline({
            defaults: { ease: 'power2.out' },
            onComplete: () => {
              isAnimating.value = false
            },
            onReverseComplete: () => {
              isAnimating.value = false
              // Restore focus to the circle that was clicked
              ;(triggerElement.value as HTMLElement)?.focus()
              // Notify parent so it can clear selectedStrait and unmount lens
              callbacks?.onReverseComplete?.()
            },
          })

          // Step 1: Fade out non-selected circles and labels
          timeline.to(others, { opacity: 0, duration: 0.25 }, 0)

          // Step 2: Scale + translate selected circle to viewport center
          if (viewportRect && circleRect) {
            const scaleX = viewportRect.width / circleRect.width
            const scaleY = viewportRect.height / circleRect.height
            const scaleFactor = Math.max(scaleX, scaleY)
            const dx =
              viewportRect.width / 2 -
              (circleRect.left - viewportRect.left + circleRect.width / 2)
            const dy =
              viewportRect.height / 2 -
              (circleRect.top - viewportRect.top + circleRect.height / 2)

            timeline.to(
              selected,
              {
                x: dx,
                y: dy,
                scale: scaleFactor,
                duration: 0.4,
                svgOrigin: `${straitData.cx} ${straitData.cy}`,
              },
              0.15,
            )
          }

          // Step 2b: Fade out selected circle as lens fades in
          timeline.to(selected, { opacity: 0, duration: 0.15 }, 0.4)

          // Step 3: Cross-fade lens into view
          if (targets.lensContainer.value) {
            timeline.fromTo(
              targets.lensContainer.value,
              { opacity: 0, scale: 0.95 },
              { opacity: 1, scale: 1, duration: 0.3 },
              0.35,
            )
          }
        },
      )
    })
  }

  function close() {
    if (!import.meta.client) return

    // Check if reduced motion — instant revert
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reducedMotion) {
      // Instantly reset everything
      if (targets.lensContainer.value) {
        gsap.set(targets.lensContainer.value, { opacity: 0 })
      }
      targets.circleOverlay.value
        ?.querySelectorAll('.strait-circle-group')
        .forEach((el) => gsap.set(el, { opacity: 1, scale: 1, x: 0, y: 0 }))
      ;(triggerElement.value as HTMLElement)?.focus()
      callbacks?.onReverseComplete?.()
      return
    }

    if (timeline) {
      isAnimating.value = true
      timeline.timeScale(1.2) // slightly snappier close
      timeline.reverse()
    }
  }

  function kill() {
    ctx?.revert()
    ctx = null
    timeline = null
    isAnimating.value = false
  }

  onUnmounted(() => {
    kill()
  })

  return { open, close, kill, isAnimating, triggerElement }
}
