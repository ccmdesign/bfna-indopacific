// Country profiles consumed by AseanInfographic / dock cards.
//
// Provenance:
// - `hero` is GENERATED from _data/wrangled/asean-flows-yearly.csv
//   (BACI HS07 V202601) via scripts/build-asean-country-hero.mjs — each
//   country's two-way goods trade with China for 2024. Do not hand-edit the
//   hero values here; they are spread from country-hero.generated.ts.
// - `paragraph` is CURATED prose. Every quantitative or hard-factual claim
//   traces to a named anchor in _data/wrangled/asean-headline-stats.json or a
//   _data/sources/*.SCOUT.md figure (anchor cited inline per country). The
//   anchor inventory is thin and Indonesia-heavy, so paragraphs are uneven
//   by design — specific numbers where a source exists, honest qualitative
//   framing where one does not. No invented figures.
// - `topExports` / `topImports` are UNVERIFIED PLACEHOLDER composition: no
//   HS-product source exists or is cheaply recoverable. Retained only so the
//   trade-balance card keeps rendering; NOT regenerated or guessed. See
//   todos/BF-57-defer-top-trade-hs-product-composition.md (Decision D1).

import { COUNTRY_HERO } from './country-hero.generated'

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
    hero: COUNTRY_HERO.indonesia,
    // Anchors: indonesia_china_trade_2024 (generated hero, ~$143B);
    // indonesia_nickel_exports_2024 ($21.0B total, ~$19.0B to China ≈ 90%);
    // asean_nickel_exports_growth (5.9×); indonesia_esdm_17_2025_quota_cut
    // (44.85%). The old "grown four times as fast as the United States'"
    // claim had no anchor and is removed.
    paragraph:
      'Two-way goods trade with China reached roughly $143B in 2024. Of Indonesia’s ~$21B in nickel-product exports that year, about 90% went to China, and ASEAN nickel exports have grown 5.9× since 2010. Jakarta’s October 2025 mining quota cut (≈45%) signals it wants leverage over that flow — hedging in absolute terms while drifting in relative ones.',
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Coal', valueUsdB: 48 },
      { label: 'Palm oil', valueUsdB: 28 },
      { label: 'Nickel', valueUsdB: 21 },
      { label: 'Ferronickel', valueUsdB: 18 },
      { label: 'Copper', valueUsdB: 6.2 },
      { label: 'Cobalt', valueUsdB: 1.5 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
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
    hero: COUNTRY_HERO.thailand,
    // Anchors: only the generated China-trade hero (~$125B, 2024). No
    // economic anchor in headline-stats for Thailand — paragraph is
    // qualitative beyond the hero figure; no invented numbers.
    paragraph:
      'Bangkok keeps a US treaty alliance and US-anchored defense ties, yet roughly $125B in two-way goods trade with China in 2024 underlines where the economic gravity now sits — autos, machinery, and rubber processing increasingly routed through PRC supply chains. The hedge holds; the gravity has shifted.',
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Vehicles & parts', valueUsdB: 38 },
      { label: 'Machinery', valueUsdB: 26 },
      { label: 'Integrated circuits', valueUsdB: 17 },
      { label: 'Rubber', valueUsdB: 12 },
      { label: 'Rice', valueUsdB: 4.5 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
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
    hero: COUNTRY_HERO.singapore,
    // Anchors: generated China-trade hero (~$95B, 2024 — note BACI does not
    // strip SGP re-exports, so this overstates final-destination demand,
    // _data/sources/baci-trade.SCOUT.md §8); singapore_milex_share_gdp_2024
    // (2.8% of GDP). Hub framing is qualitative.
    paragraph:
      'Singapore’s value lies in being the only place where US, Chinese, and European firms all keep their secrets. Two-way goods trade with China was roughly $95B in 2024 (much of it transhipment), while defense spending near 2.8% of GDP stays tightly bound to Washington. The hub posture is the strategy, not a hedge.',
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Integrated circuits', valueUsdB: 92 },
      { label: 'Refined petroleum', valueUsdB: 48 },
      { label: 'Machinery', valueUsdB: 31 },
      { label: 'Gold', valueUsdB: 17 },
      { label: 'Pharmaceuticals', valueUsdB: 12 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
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
    hero: COUNTRY_HERO.malaysia,
    // Anchors: generated China-trade hero (~$154B, 2024);
    // lynas_lamp_world_rare_earths_share (Lynas Malaysia LAMP ≈ 12–15% of
    // global rare-earths processing). Semiconductor framing is qualitative.
    paragraph:
      'Penang and Johor have absorbed a wave of fab and back-end relocations as US firms diversify away from Taiwan and China, even as two-way goods trade with China ran to roughly $154B in 2024. The Lynas LAMP refinery alone handles an estimated 12–15% of the world’s rare earths. Kuala Lumpur’s leverage is real, but its supply-chain dependencies pull in different directions.',
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Integrated circuits', valueUsdB: 56 },
      { label: 'Palm oil', valueUsdB: 22 },
      { label: 'Refined petroleum', valueUsdB: 19 },
      { label: 'LNG', valueUsdB: 17 },
      { label: 'Machinery', valueUsdB: 14 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
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
    hero: COUNTRY_HERO.vietnam,
    // Anchors: generated China-trade hero (~$253B, 2024 — the largest in
    // ASEAN); china_dev_finance_to_asean_2010_2021 (VNM $21.2B, the #2
    // recipient). The old "$100B-plus surplus with the US" figure had no
    // anchor and is softened to qualitative framing.
    paragraph:
      'Vietnam runs a large surplus with the US and a near-equal deficit with China — assembling Chinese components into goods bound for American shelves, with roughly $253B in two-way goods trade with China in 2024, the largest in ASEAN. China also extended an estimated $21B in development finance to Vietnam over 2010–2021. The hedge is structural; the geopolitics is downstream of the bill of materials.',
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Broadcasting equipment', valueUsdB: 47 },
      { label: 'Telephones', valueUsdB: 41 },
      { label: 'Integrated circuits', valueUsdB: 28 },
      { label: 'Computers', valueUsdB: 21 },
      { label: 'Footwear', valueUsdB: 18 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
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
    hero: COUNTRY_HERO.philippines,
    // Anchors: generated China-trade hero (~$53B, 2024);
    // philippines_nickel_2025 (6.92% of world nickel production). EDCA
    // basing / joint-patrol framing is qualitative — no number invented.
    paragraph:
      'Manila has expanded EDCA basing access and joint patrols, even as two-way goods trade with China reached roughly $53B in 2024 and the Philippines supplies about 7% of world nickel production. Defense alignment is unambiguous; economic dependence is not.',
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Integrated circuits', valueUsdB: 19 },
      { label: 'Computers', valueUsdB: 8 },
      { label: 'Machinery', valueUsdB: 6 },
      { label: 'Gold', valueUsdB: 3.5 },
      { label: 'Copper', valueUsdB: 2.8 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
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
    hero: COUNTRY_HERO.brunei,
    // Anchors: only the generated China-trade hero (~$2.7B, 2024). No
    // economic anchor for Brunei — the old "90%+ of exports" figure had no
    // source and is softened to qualitative ("the overwhelming majority").
    paragraph:
      'Hydrocarbons are the overwhelming majority of exports. Two-way goods trade with China was roughly $2.7B in 2024. The hedge is single-resource — keep Japanese, Korean, and Chinese buyers liquid; defense balanced; sovereign wealth diversified abroad. Geopolitics is downstream of the LNG offtake schedule.',
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Crude petroleum', valueUsdB: 4.1 },
      { label: 'LNG', valueUsdB: 3.6 },
      { label: 'Refined petroleum', valueUsdB: 0.9 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
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
    hero: COUNTRY_HERO.cambodia,
    // Anchors: only the generated China-trade hero (~$16B, 2024). No
    // economic anchor for Cambodia — garment / Ream framing is qualitative.
    paragraph:
      'Cambodia exports finished garments to Western markets while Chinese capital underwrites the factories, ports, and grid — two-way goods trade with China was roughly $16B in 2024. The Ream naval base upgrade has formalised what trade and investment already implied.',
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Garments', valueUsdB: 8.5 },
      { label: 'Footwear', valueUsdB: 1.6 },
      { label: 'Leather goods', valueUsdB: 0.8 },
      { label: 'Rice', valueUsdB: 0.5 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
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
    hero: COUNTRY_HERO.laos,
    // Anchors: generated China-trade hero (~$7.3B, 2024);
    // china_dev_finance_to_asean_2010_2021 (LAO $18.6B, the #3 recipient —
    // larger than its annual two-way trade). Railway/hydropower is
    // qualitative.
    paragraph:
      'The Boten-Vientiane railway didn’t just shorten a freight route — it re-anchored the Lao economy to Yunnan. China extended an estimated $18.6B in development finance over 2010–2021, more than its ~$7.3B in two-way goods trade with Laos in 2024. Hydropower exports follow the same logic: built with PRC capital, sold under PRC offtake.',
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Copper', valueUsdB: 1.8 },
      { label: 'Electricity', valueUsdB: 1.6 },
      { label: 'Gold', valueUsdB: 0.9 },
      { label: 'Rubber', valueUsdB: 0.5 },
      { label: 'Coffee', valueUsdB: 0.3 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
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
