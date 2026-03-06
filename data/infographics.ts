// data/infographics.ts

export type InfographicStatus = 'published' | 'draft'

export interface InfographicEntry {
  slug: string
  title: string
  description: string
  embedTitle: string
  status: InfographicStatus
  thumbnail?: string
}

export const infographics: InfographicEntry[] = [
  {
    slug: 'renewables',
    title: 'Renewables on the Rise',
    description:
      'Explore how Indo-Pacific nations are expanding renewable energy infrastructure, with 2024 data on solar, wind, hydropower and more.',
    embedTitle: 'Renewables on the Rise',
    status: 'published'
  },
  {
    slug: 'straits',
    title: 'Indo-Pacific Straits',
    description:
      'Visualize maritime traffic through six critical chokepoints, from Malacca to Hormuz, with vessel data from 2019 to 2025.',
    embedTitle: 'Indo-Pacific Straits',
    status: 'draft'
  }
]

export const publishedInfographics = infographics.filter(
  (i) => i.status === 'published'
)

export const draftInfographics = infographics.filter(
  (i) => i.status === 'draft'
)
