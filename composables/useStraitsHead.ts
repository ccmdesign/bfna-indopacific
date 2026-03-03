/**
 * Shared head configuration for the Straits infographic.
 * Centralises the page title so that every route that renders
 * <StraitsInfographic /> stays in sync.
 *
 * Pages may pass additional `useHead` options (e.g. `meta`, `link`)
 * that are merged on top of the base configuration.
 */
import type { UseHeadInput } from '@unhead/vue'

export function useStraitsHead(overrides: UseHeadInput = {}) {
  const base: UseHeadInput = {
    title: 'Indo-Pacific Straits',
    link: []
  }

  useHead({
    ...base,
    ...overrides,
    link: [...(base.link as any[]), ...((overrides.link as any[]) || [])],
    meta: [...((base.meta as any[]) || []), ...((overrides.meta as any[]) || [])]
  })
}
