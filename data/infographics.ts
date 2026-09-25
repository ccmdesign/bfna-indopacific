// data/infographics.ts

export type InfographicStatus = 'published' | 'draft'

/**
 * BF-224: design canvas for the scale-to-fit embed stage (components/EmbedStage.vue).
 *
 * The infographic is rendered in an inner iframe at this CSS size, so every vw/svh
 * token and media query resolves exactly as on a desktop screen, then scaled
 * uniformly to fit the host frame. `minAspect`/`maxAspect` bound how far the canvas
 * may stretch to match the host frame's shape before the stage letterboxes instead.
 */
export interface EmbedCanvas {
  width: number
  height: number
  minAspect: number
  maxAspect: number
}

/**
 * BF-224: teaser art for the phone cover card, catalog cards, link previews and the
 * Squarespace tiles. Images are produced by scripts/export-thumbnails.mjs into
 * public/thumbnails/ — regenerate them rather than editing by hand.
 */
export interface InfographicCover {
  /** Headline used on teaser images and the cover card (the in-graphic title). */
  headline: string
  /** CSS object-position for cropping the visual into narrow frames. */
  focal: string
}

export interface InfographicEntry {
  slug: string
  title: string
  description: string
  embedTitle: string
  status: InfographicStatus
  thumbnail?: string
  canvas?: EmbedCanvas
  cover?: InfographicCover
}

export const infographics: InfographicEntry[] = [
  {
    slug: 'renewables',
    title: 'Renewables on the Rise',
    description:
      'Explore how Indo-Pacific nations are expanding renewable energy infrastructure, with 2024 data on solar, wind, hydropower and more.',
    embedTitle: 'Renewables on the Rise',
    status: 'published',
    thumbnail: '/thumbnails/renewables-card.jpg',
    // Composed at the client's 1412×993 source art; at 16:9 its intro overflows the top.
    canvas: { width: 1412, height: 993, minAspect: 1.36, maxAspect: 1.55 },
    cover: { headline: 'Renewables on the Rise', focal: '45% 60%' }
  },
  {
    slug: 'straits',
    title: 'Indo-Pacific Straits',
    description:
      'Visualize maritime traffic through six critical chokepoints, from Malacca to Hormuz, with vessel data from 2019 to 2025.',
    embedTitle: 'Indo-Pacific Straits',
    status: 'published',
    thumbnail: '/thumbnails/straits-card.jpg',
    canvas: { width: 1440, height: 810, minAspect: 1.33, maxAspect: 2.2 },
    cover: { headline: 'Indo-Pacific Maritime Chokepoints', focal: '55% 50%' }
  },
  {
    slug: 'asean',
    title: 'ASEAN: Pivot of the Indo-Pacific',
    description:
      'Interactive map of ASEAN member states and their economic, strategic, and resource ties to the US, China, and EU.',
    embedTitle: 'ASEAN: Pivot of the Indo-Pacific',
    status: 'draft'
  }
]

export const publishedInfographics = infographics.filter(
  (i) => i.status === 'published'
)

export const draftInfographics = infographics.filter(
  (i) => i.status === 'draft'
)

export function findInfographic(slug: string): InfographicEntry | undefined {
  return infographics.find((i) => i.slug === slug)
}
