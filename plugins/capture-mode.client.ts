// BF-100 — flips the page into "capture mode" for scripts/export-tiles.mjs
// when the URL carries `?capture`: adds an `is-capturing` class to <html>,
// which assets/styles.css uses to relax the .master-grid aspect-ratio lock
// and zero out CSS animation/transition durations. See useCaptureMode.ts.
export default defineNuxtPlugin(() => {
  const route = useRoute()
  if (route.query.capture !== undefined) {
    document.documentElement.classList.add('is-capturing')
  }
})
