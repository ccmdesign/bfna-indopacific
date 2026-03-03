/**
 * Shared head configuration for the Renewables infographic.
 * Centralises the page title and Inter font link so that
 * every route that renders <RenewablesInfographic /> stays in sync.
 *
 * Pages may pass additional `useHead` options (e.g. `meta`) that are
 * merged on top of the base configuration.
 */
import type { UseHeadInput } from '@unhead/vue'

export function useRenewablesHead(overrides: UseHeadInput = {}) {
  const base: UseHeadInput = {
    title: 'Renewables on the Rise',
    link: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap',
        key: 'inter-font'
      }
    ]
  }

  useHead({
    ...base,
    ...overrides,
    link: [...(base.link as any[]), ...((overrides.link as any[]) || [])]
  })
}
