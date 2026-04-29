// Country tiering for the ASEAN infographic. Decisions locked in
// _process/asean/interface-concept.md and the v1 shape brief:
//
//   inScope  -- interactive, full panel
//   stretch  -- visible, low-fi popup (name + tier note in v1)
//   inert    -- visible, no interaction
//   context  -- orientation only, ghostly fill
//
// Numeric IDs (string) match ISO 3166-1 numeric and the `id` field in
// data/asean/countries.geo.json.

export type CountryTier = 'inScope' | 'stretch' | 'inert' | 'context'

export interface CountryDescriptor {
  id: string
  slug: string
  name: string
  flag: string
  tier: CountryTier
}

export const COUNTRIES: Record<string, CountryDescriptor> = {
  thailand: {
    id: '764',
    slug: 'thailand',
    name: 'Thailand',
    flag: '🇹🇭',
    tier: 'inScope'
  },
  indonesia: {
    id: '360',
    slug: 'indonesia',
    name: 'Indonesia',
    flag: '🇮🇩',
    tier: 'inScope'
  },
  singapore: {
    id: '702',
    slug: 'singapore',
    name: 'Singapore',
    flag: '🇸🇬',
    tier: 'inScope'
  },
  malaysia: {
    id: '458',
    slug: 'malaysia',
    name: 'Malaysia',
    flag: '🇲🇾',
    tier: 'inScope'
  },
  vietnam: {
    id: '704',
    slug: 'vietnam',
    name: 'Vietnam',
    flag: '🇻🇳',
    tier: 'inScope'
  },
  philippines: {
    id: '608',
    slug: 'philippines',
    name: 'Philippines',
    flag: '🇵🇭',
    tier: 'stretch'
  },
  brunei: {
    id: '096',
    slug: 'brunei',
    name: 'Brunei',
    flag: '🇧🇳',
    tier: 'stretch'
  },
  cambodia: {
    id: '116',
    slug: 'cambodia',
    name: 'Cambodia',
    flag: '🇰🇭',
    tier: 'stretch'
  },
  laos: {
    id: '418',
    slug: 'laos',
    name: 'Laos',
    flag: '🇱🇦',
    tier: 'stretch'
  },
  myanmar: {
    id: '104',
    slug: 'myanmar',
    name: 'Myanmar',
    flag: '🇲🇲',
    tier: 'inert'
  },
  timor_leste: {
    id: '626',
    slug: 'timor_leste',
    name: 'Timor-Leste',
    flag: '🇹🇱',
    tier: 'inert'
  }
}

export const IN_SCOPE_SLUGS = Object.values(COUNTRIES)
  .filter((c) => c.tier === 'inScope')
  .map((c) => c.slug)

export const STRETCH_SLUGS = Object.values(COUNTRIES)
  .filter((c) => c.tier === 'stretch')
  .map((c) => c.slug)

export function countryBySlug(slug: string): CountryDescriptor | undefined {
  return COUNTRIES[slug]
}

export function countryById(id: string): CountryDescriptor | undefined {
  return Object.values(COUNTRIES).find((c) => c.id === id)
}
