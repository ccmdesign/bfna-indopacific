/**
 * Shared head configuration for the Straits infographic.
 * Centralises the page title so that every route that renders
 * <StraitsInfographic /> stays in sync.
 *
 * Accepts an optional reactive `straitName` to generate dynamic titles
 * when a specific strait is selected (e.g., "Strait of Malacca -- Indo-Pacific Straits").
 *
 * Pages may pass additional `useHead` options (e.g. `meta`, `link`)
 * that are merged on top of the base configuration.
 */
import type { MaybeRef } from 'vue'
import type { UseHeadInput } from '@unhead/vue'

export function useStraitsHead(straitName?: MaybeRef<string | undefined>, overrides: UseHeadInput = {}) {
  const name = toRef(straitName)

  useHead(computed(() => {
    const title = name.value
      ? `${name.value} — Indo-Pacific Straits`
      : 'Indo-Pacific Straits'

    return {
      title,
      link: [
        {
          rel: 'preload',
          as: 'image',
          type: 'image/webp',
          href: '/assets/map-indo-pacific-2x.webp',
        },
        ...((overrides.link as any[]) || []),
      ],
      meta: [
        ...((overrides.meta as any[]) || []),
      ],
    }
  }))
}
