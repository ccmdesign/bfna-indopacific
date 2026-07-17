import { computed } from 'vue'

/**
 * Capture mode (BF-100) — detects the `?capture` query flag used by
 * scripts/export-tiles.mjs to request a settled, deterministic render for
 * static tile screenshots: no decorative ambient animation, and the
 * `.master-grid` aspect-ratio lock relaxed so the page fills whatever
 * viewport the export script hands it (see assets/styles.css `.is-capturing`
 * rules and plugins/capture-mode.client.ts).
 *
 * Presence-only flag (`?capture`, not `?capture=true`) — any value counts.
 */
export function useCaptureMode() {
  const route = useRoute()
  return computed(() => route.query.capture !== undefined)
}
