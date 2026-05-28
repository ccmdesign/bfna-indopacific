// Shared head config for the ASEAN infographic. Mirrors useRenewablesHead /
// useStraitsHead so embed and standalone pages stay in sync.
import type { UseHeadInput } from '@unhead/vue'

export function useAseanHead(overrides: UseHeadInput = {}) {
  const base: UseHeadInput = {
    title: 'ASEAN: Pivot of the Indo-Pacific'
  }

  useHead({
    ...base,
    ...overrides,
    link: [...((base.link as any[]) || []), ...((overrides.link as any[]) || [])],
    meta: [...((base.meta as any[]) || []), ...((overrides.meta as any[]) || [])]
  })
}
