// Country profiles consumed by AseanInfographic / dock cards.
//
// Hero values mirror placeholder-data.ts (China two-way trade) so the layout
// matches the cached backup. Top exports/imports use OEC 2023 / UN Comtrade
// composition snapshots — directionally accurate, ranking-correct; exact
// numbers refresh against the May 2026 BACI HS07 V202601 cut.

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

const flag = (cc: string) => `https://flagcdn.com/w160/${cc}.png`

export const PROFILES: Record<string, CountryProfile> = {
  indonesia: {
    slug: 'indonesia',
    name: 'Indonesia',
    flagUrl: flag('id'),
    tagline: 'Hedging in absolute terms, drifting in relative ones.',
    hero: { value: '$143B', label: 'Two-way trade with China, 2024' },
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
  },

  thailand: {
    slug: 'thailand',
    name: 'Thailand',
    flagUrl: flag('th'),
    tagline: 'A long-time US ally drifting toward Beijing’s gravity.',
    hero: { value: '$104B', label: 'Two-way trade with China, 2024' },
    paragraph:
      'Bangkok keeps a US treaty alliance and US-anchored defense ties, yet trade composition has tilted decisively to China — autos, machinery, and rubber processing now move through PRC supply chains. The hedge holds; the gravity has shifted.',
    topExports: [
      { label: 'Vehicles & parts', valueUsdB: 38 },
      { label: 'Machinery', valueUsdB: 26 },
      { label: 'Integrated circuits', valueUsdB: 17 },
      { label: 'Rubber', valueUsdB: 12 },
      { label: 'Rice', valueUsdB: 4.5 }
    ],
    topImports: [
      { label: 'Crude petroleum', valueUsdB: 32 },
      { label: 'Machinery', valueUsdB: 21 },
      { label: 'Integrated circuits', valueUsdB: 14 },
      { label: 'Vehicle parts', valueUsdB: 9 }
    ]
  },

  singapore: {
    slug: 'singapore',
    name: 'Singapore',
    flagUrl: flag('sg'),
    tagline: 'The neutral hub everyone trusts to launder the contradiction.',
    hero: { value: '$118B', label: 'Two-way trade with China, 2024' },
    paragraph:
      'Singapore’s value lies in being the only place where US, Chinese, and European firms all keep their secrets. Trade is a routing problem; defense remains tightly bound to Washington. The hub posture is the strategy, not a hedge.',
    topExports: [
      { label: 'Integrated circuits', valueUsdB: 92 },
      { label: 'Refined petroleum', valueUsdB: 48 },
      { label: 'Machinery', valueUsdB: 31 },
      { label: 'Gold', valueUsdB: 17 },
      { label: 'Pharmaceuticals', valueUsdB: 12 }
    ],
    topImports: [
      { label: 'Integrated circuits', valueUsdB: 88 },
      { label: 'Crude petroleum', valueUsdB: 36 },
      { label: 'Refined petroleum', valueUsdB: 27 },
      { label: 'Gold', valueUsdB: 15 }
    ]
  },

  malaysia: {
    slug: 'malaysia',
    name: 'Malaysia',
    flagUrl: flag('my'),
    tagline: 'Semiconductor packaging is the new geopolitics.',
    hero: { value: '$98B', label: 'Two-way trade with China, 2024' },
    paragraph:
      'Penang and Johor have absorbed a wave of fab and back-end relocations as US firms diversify away from Taiwan and China. Kuala Lumpur’s leverage is real, but its supply-chain dependencies — silicon, palm oil, LNG — pull in different directions.',
    topExports: [
      { label: 'Integrated circuits', valueUsdB: 56 },
      { label: 'Palm oil', valueUsdB: 22 },
      { label: 'Refined petroleum', valueUsdB: 19 },
      { label: 'LNG', valueUsdB: 17 },
      { label: 'Machinery', valueUsdB: 14 }
    ],
    topImports: [
      { label: 'Integrated circuits', valueUsdB: 48 },
      { label: 'Refined petroleum', valueUsdB: 16 },
      { label: 'Machinery', valueUsdB: 12 },
      { label: 'Vehicles & parts', valueUsdB: 7 }
    ]
  },

  vietnam: {
    slug: 'vietnam',
    name: 'Vietnam',
    flagUrl: flag('vn'),
    tagline: 'The factory floor for the US-China decoupling.',
    hero: { value: '$172B', label: 'Two-way trade with China, 2024' },
    paragraph:
      'Vietnam runs a $100B-plus surplus with the US and a near-equal deficit with China — assembling Chinese components into goods bound for American shelves. The hedge is structural; the geopolitics is downstream of the bill of materials.',
    topExports: [
      { label: 'Broadcasting equipment', valueUsdB: 47 },
      { label: 'Telephones', valueUsdB: 41 },
      { label: 'Integrated circuits', valueUsdB: 28 },
      { label: 'Computers', valueUsdB: 21 },
      { label: 'Footwear', valueUsdB: 18 }
    ],
    topImports: [
      { label: 'Integrated circuits', valueUsdB: 36 },
      { label: 'Telephones', valueUsdB: 18 },
      { label: 'Refined petroleum', valueUsdB: 9 },
      { label: 'Fabric', valueUsdB: 7 }
    ]
  },

  philippines: {
    slug: 'philippines',
    name: 'Philippines',
    flagUrl: flag('ph'),
    tagline: 'The treaty ally turning EDCA into reality.',
    hero: { value: '$52B', label: 'Two-way trade with China, 2024' },
    paragraph:
      'Manila has expanded EDCA basing access and run more joint patrols since 2023, even as China remains its second-largest trade partner. Defense alignment is unambiguous; economic dependence is not.',
    topExports: [
      { label: 'Integrated circuits', valueUsdB: 19 },
      { label: 'Computers', valueUsdB: 8 },
      { label: 'Machinery', valueUsdB: 6 },
      { label: 'Gold', valueUsdB: 3.5 },
      { label: 'Copper', valueUsdB: 2.8 }
    ],
    topImports: [
      { label: 'Integrated circuits', valueUsdB: 14 },
      { label: 'Refined petroleum', valueUsdB: 10 },
      { label: 'Vehicles & parts', valueUsdB: 5 },
      { label: 'Crude petroleum', valueUsdB: 4 }
    ]
  },

  brunei: {
    slug: 'brunei',
    name: 'Brunei',
    flagUrl: flag('bn'),
    tagline: 'A petrostate with one revenue stream and three customers.',
    hero: { value: '$2.8B', label: 'Two-way trade with China, 2024' },
    paragraph:
      'Hydrocarbons are 90%+ of exports. The hedge is single-resource — keep Japanese, Korean, and Chinese buyers liquid; defense balanced; sovereign wealth diversified abroad. Geopolitics is downstream of the LNG offtake schedule.',
    topExports: [
      { label: 'Crude petroleum', valueUsdB: 4.1 },
      { label: 'LNG', valueUsdB: 3.6 },
      { label: 'Refined petroleum', valueUsdB: 0.9 }
    ],
    topImports: [
      { label: 'Machinery', valueUsdB: 0.6 },
      { label: 'Vehicles & parts', valueUsdB: 0.3 },
      { label: 'Food products', valueUsdB: 0.3 }
    ]
  },

  cambodia: {
    slug: 'cambodia',
    name: 'Cambodia',
    flagUrl: flag('kh'),
    tagline: 'Garments out, Chinese capital in.',
    hero: { value: '$14B', label: 'Two-way trade with China, 2024' },
    paragraph:
      'Cambodia exports finished garments to Western markets while Chinese capital underwrites the factories, ports, and grid. The Ream naval base upgrade has formalised what trade and FDI already implied.',
    topExports: [
      { label: 'Garments', valueUsdB: 8.5 },
      { label: 'Footwear', valueUsdB: 1.6 },
      { label: 'Leather goods', valueUsdB: 0.8 },
      { label: 'Rice', valueUsdB: 0.5 }
    ],
    topImports: [
      { label: 'Textile fabric', valueUsdB: 4.2 },
      { label: 'Gold', valueUsdB: 2.8 },
      { label: 'Machinery', valueUsdB: 2.1 },
      { label: 'Vehicles & parts', valueUsdB: 1.4 }
    ]
  },

  laos: {
    slug: 'laos',
    name: 'Laos',
    flagUrl: flag('la'),
    tagline: 'A landlocked ledger denominated in Chinese yuan.',
    hero: { value: '$8B', label: 'Two-way trade with China, 2024' },
    paragraph:
      'The Boten-Vientiane railway didn’t just shorten a freight route — it re-anchored the Lao economy to Yunnan. Hydropower exports follow the same logic: built with PRC capital, sold under PRC offtake.',
    topExports: [
      { label: 'Copper', valueUsdB: 1.8 },
      { label: 'Electricity', valueUsdB: 1.6 },
      { label: 'Gold', valueUsdB: 0.9 },
      { label: 'Rubber', valueUsdB: 0.5 },
      { label: 'Coffee', valueUsdB: 0.3 }
    ],
    topImports: [
      { label: 'Refined petroleum', valueUsdB: 0.9 },
      { label: 'Vehicles & parts', valueUsdB: 0.7 },
      { label: 'Machinery', valueUsdB: 0.5 },
      { label: 'Electrical apparatus', valueUsdB: 0.4 }
    ]
  }
}

export function profileBySlug(slug: string): CountryProfile | undefined {
  return PROFILES[slug]
}
