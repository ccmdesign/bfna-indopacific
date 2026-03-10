import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Tracks the mouse position relative to a target element and returns
 * CSS-ready rotateX / rotateY values for a subtle 3D tilt effect.
 *
 * @param elRef  – template ref of the element to tilt
 * @param maxDeg – maximum rotation in degrees per axis (default 10)
 */
export function useTiltOnMouse(elRef: Ref<HTMLElement | null>, maxDeg = 10) {
  const rotateX = ref(0)
  const rotateY = ref(0)

  let rafId = 0

  function clamp(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v))
  }

  function onMove(e: MouseEvent) {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      const el = elRef.value
      if (!el) return
      const rect = el.getBoundingClientRect()
      // normalise to -1…1 then clamp so distant cursor never exceeds max tilt
      const nx = clamp(((e.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1)
      const ny = clamp(((e.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1)
      rotateY.value = nx * maxDeg
      rotateX.value = -ny * maxDeg
    })
  }

  function onLeave() {
    cancelAnimationFrame(rafId)
    rotateX.value = 0
    rotateY.value = 0
  }

  onMounted(() => {
    // Listen on window so the tilt reacts even when the cursor isn't directly over the panel
    window.addEventListener('mousemove', onMove, { passive: true })
  })

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('mousemove', onMove)
  })

  return { rotateX, rotateY }
}
