// Country profiles consumed by AseanInfographic / CountryNarrativeCard /
// CountryTradeBalanceCard / CountryParagraphCard.
//
// Schema reconstructed from cached backup of working build. Indonesia values
// extracted from the rendered HTML. Other countries to be wired alongside the
// May 2026 data drop.

export interface TradeItem {
  label: string
  valueUsdB: number
  detail?: string
}

export interface CountryProfile {
  slug: string
  name: string
  flagUrl: string
  tagline: string
  hero: { value: string; label: string }
  paragraph: string
  topExports: TradeItem[]
  topImports: TradeItem[]
}

export const PROFILES: Record<string, CountryProfile> = {
  indonesia: {
    slug: 'indonesia',
    name: 'Indonesia',
    flagUrl: 'https://flagcdn.com/w160/id.png',
    tagline: 'Hedging in absolute terms, drifting in relative ones.',
    hero: {
      value: '$143B',
      label: 'Two-way trade with China, 2024'
    },
    paragraph:
      'Indonesia’s ties with every major partner have grown — but China’s have grown four times as fast as the United States’. ~90% of refined nickel exports now land in China. Jakarta is hedging in absolute terms while drifting in relative ones.',
    topExports: [
      { label: 'Coal', valueUsdB: 48 },
      { label: 'Palm oil', valueUsdB: 28 },
      { label: 'Nickel', valueUsdB: 21 },
      { label: 'Ferronickel', valueUsdB: 18 },
      { label: 'Copper', valueUsdB: 6.2 },
      { label: 'Cobalt', valueUsdB: 1.5 }
    ],
    topImports: [
      { label: 'Refined petroleum', valueUsdB: 23 },
      { label: 'Crude petroleum', valueUsdB: 11 },
      { label: 'Vehicles & parts', valueUsdB: 8.5 },
      { label: 'Iron & steel', valueUsdB: 3.0 }
    ]
  }
}

export function profileBySlug(slug: string): CountryProfile | undefined {
  return PROFILES[slug]
}
