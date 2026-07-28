// Country profiles consumed by AseanInfographic / dock cards.
//
// Provenance:
// - `keyFacts` is CURATED from the client's Feedback 2 data pass (BF-96):
//   4 economic indicators (GDP growth 2026 — IMF WEO; GDP per capita PPP,
//   trade-to-GDP and FDI net inflows, all 2024 — World Bank) + 3 trade-
//   agreement rows (EU / US / China) per country. FDI figures are normalized
//   to $-billions/millions form from the client's inconsistent raw units;
//   see docs/plans/BF-96-plan.md for the specific unit-normalization calls
//   (Myanmar FDI, Malaysia/Laos off-year figures, Myanmar/Timor-Leste EU-row
//   overrides). Replaces the old `hero` big-number (two-way trade with China)
//   which the client asked to remove from the Description tab.
// - `paragraphs` is CURATED prose, one block per tab (description / trade /
//   minerals), from Marshall Reid + Georgia Kruger's BFNA copy
//   (_data/sources/marshall-infographic-copy-2026-07-17.md, BF-95; supersedes
//   the 2026-06-30 doc from BF-81). Each block is trimmed to ~2–3 sentences
//   (Marshall's explicit permission) while keeping every hard number and named
//   relationship. Deliberate deviations from the source doc: Indonesia nickel
//   share uses USGS MCS2026 (66.7%, 2025) instead of the doc's 62% (2024) to
//   match the minerals chart; Philippines drops the "despite its small size"
//   framing (client correction — PH is mid-sized); Laos folds the Key Facts
//   trade/GDP figure into the Trade paragraph instead of an orphaned footnote.
// - `sources` carries the per-tab attribution footnote shown under each
//   tabpanel's prose. Bilateral-trade / mineral figures keep Marshall's stated
//   year; figures with no named upstream source are attributed "BFNA research
//   brief, Jun 2026". World Bank / IMF series are cited where the block leans on
//   the Key-Facts indicators. Open-flag caveats (Laos trade/GDP is a 2016
//   figure) are surfaced inline where the figure appears.
// - `topExports` / `topImports` are UNVERIFIED PLACEHOLDER composition: no
//   HS-product source exists or is cheaply recoverable. Retained only so the
//   trade-balance card keeps rendering; NOT regenerated or guessed. See
//   todos/BF-57-defer-top-trade-hs-product-composition.md (Decision D1).

export interface TradeItem {
  label: string
  valueUsdB: number
  detail?: string
}

export interface CountryPanelProse {
  description: string
  trade: string
  minerals: string
}

export interface KeyFactRow {
  label: string
  value: string
}

export interface CountryKeyFacts {
  indicators: KeyFactRow[]
  agreements: KeyFactRow[]
}

// FDI-inflow table for the bloc entry (BF-134): Source × years, values kept as
// pre-formatted strings so the doc's figures render digit-for-digit.
export interface FdiInflowTable {
  years: string[]
  rows: { label: string; values: string[] }[]
}

export interface CountryProfile {
  slug: string
  name: string
  flagUrl: string
  tagline: string
  keyFacts: CountryKeyFacts
  paragraphs: CountryPanelProse
  sources: CountryPanelProse
  topExports: TradeItem[]
  topImports: TradeItem[]
  // --- Bloc-entry extensions (BF-134) ---------------------------------------
  // isBloc: the ASEAN bloc-level entry. It has no per-country chart series, so
  // CountryDetail hides the Trade / Critical Minerals tabs and renders the
  // FDI-inflow table instead. Absent (undefined) for the 11 countries.
  isBloc?: boolean
  // Override for CountryKeyFacts' source footnote — the bloc's facts are not
  // the IMF WEO / World Bank series the default line cites.
  keyFactsSource?: string
  // The doc's bloc-level FDI inflow table (US$ millions, ASEANstats).
  fdiInflows?: FdiInflowTable
}

const flag = (cc: string) => `https://flagcdn.com/w160/${cc}.png`

export const PROFILES: Record<string, CountryProfile> = {
  // BF-134: ASEAN bloc-level entry — deliberately FIRST so it leads the mobile
  // card list and the prerendered route set (the "12th country" client ask).
  // The bloc is the whole map, not a clickable country: AseanMap resolves no
  // geo feature for this slug, so docking it keeps the idle full-map frame.
  // paragraphs.trade/minerals + topExports/topImports are intentionally empty:
  // no bloc-level chart series exists in the doc and nothing is fabricated —
  // CountryDetail gates the chart tabs behind `isBloc`.
  asean: {
    slug: 'asean',
    name: 'ASEAN',
    // flagcdn has no ASEAN entry and the official emblem is copyrighted, so a
    // neutral local badge ships instead (see public/assets/flag-asean.svg).
    flagUrl: '/assets/flag-asean.svg',
    tagline: 'Eleven members, one strategic pivot.',
    isBloc: true,
    keyFactsSource: 'BFNA research brief, Jul 2026. FDI shares: ASEANstats.',
    keyFacts: {
      indicators: [
        { label: 'Combined GDP', value: 'US$3.9T' },
        { label: 'GDP growth', value: '4.8%' },
        { label: 'FDI net inflow', value: '$226.0B (+8.5% vs 2023)' },
        { label: 'Top FDI sources', value: 'U.S. 18.6%, EU 13.9%, China 8.6%, HK 8.3%' },
        { label: 'U.S. goods trade', value: '$580.1B' },
        { label: 'EU goods trade', value: '€258.8B' },
        { label: 'PRC goods trade', value: '$772.4B' }
      ],
      agreements: [
        { label: 'EU', value: 'ASEAN-EEC Cooperation Agreement (1980)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006)' },
        { label: 'China', value: 'ASEAN-China FTA (2009)' }
      ]
    },
    paragraphs: {
      // Doc's "ASEAN Overall → Description" trimmed to 3 sentences (Marshall's
      // standing permission), keeping every hard number and named relationship.
      // This is the bloc-entry text, distinct from the site's idle opening
      // intro (hidden while the bloc is docked — no on-screen duplication).
      description:
        'In recent decades, the Association of Southeast Asian Nations (ASEAN) has grown dramatically in geopolitical significance. With 684 million citizens, it plays an increasingly crucial role in the global economy and has emerged as a leading producer of many critical raw materials. ASEAN and China have been each other’s largest trading partners for years, the United States is now the bloc’s largest source of foreign direct investment and ASEAN is projected to be the 4th largest economy in the world by 2030.',
      trade: '',
      minerals: ''
    },
    sources: {
      description: 'BFNA research brief, Jul 2026.',
      trade: '',
      minerals: ''
    },
    fdiInflows: {
      years: ['2023', '2024', '2025'],
      rows: [
        { label: 'EU27', values: ['22,223.69', '16,417.44', '31,323.71'] },
        { label: 'US', values: ['83,540.12', '34,152.08', '30,044.76'] },
        { label: 'PRC', values: ['16,551.01', '26,122.17', '26,243.68'] }
      ]
    },
    topExports: [],
    topImports: []
  },

  indonesia: {
    slug: 'indonesia',
    name: 'Indonesia',
    flagUrl: flag('id'),
    tagline: 'Hedging in absolute terms, drifting in relative ones.',
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '5%' },
        { label: 'GDP per capita PPP', value: '$16,448.3' },
        { label: 'Trade-to-GDP', value: '43%' },
        { label: 'FDI net inflows', value: '$24.28B' }
      ],
      agreements: [
        { label: 'EU', value: 'ASEAN-EEC Cooperation Agreement (1980), EU-Indonesia CEPA (signed 2025)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006)' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs' }
      ]
    },
    paragraphs: {
      description:
        'Indonesia is the most populous country in Southeast Asia — 287 million people across 17,000 islands — and ASEAN’s largest economy. It holds to a longstanding bebas aktif ("free and active") doctrine, refusing to side with any great-power bloc: it trades predominantly with China while anchoring its security to the U.S. and expanding ties with the EU.',
      trade:
        'China is Indonesia’s largest single trade partner, with bilateral trade reaching a record $135.15 billion in 2024. U.S. goods trade totalled an estimated $45.8 billion in 2025 and EU goods trade €27.3 billion ($31.9 billion) in 2024. The top source of foreign direct investment in 2025 was Singapore at $17.4 billion, reflecting deep integration into intra-ASEAN capital flows.',
      minerals:
        'Indonesia is the world’s largest producer of mined nickel at 66.7% of global output (2025), plus the second-largest producer of mined tin (19%) and cobalt (12%). It also produces bauxite, copper, ferroalloys and gold. Those reserves and its geographic position make it essential to the clean-energy transition and one of the most strategically consequential countries in the Indo-Pacific.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'Bilateral-trade figures: BFNA research brief, Jun 2026 (China 2024, U.S. 2025, EU 2024); FDI: BFNA research brief, Jun 2026.',
      minerals: 'Nickel share: USGS Mineral Commodity Summaries 2026 (2025 data), matching the minerals chart. Other shares: BFNA research brief, Jun 2026 (2024).'
    },
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
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '1.5%' },
        { label: 'GDP per capita PPP', value: '$24,712.1' },
        { label: 'Trade-to-GDP', value: '137%' },
        { label: 'FDI net inflows', value: '$14.3B' }
      ],
      agreements: [
        { label: 'EU', value: 'ASEAN-EEC Cooperation Agreement (1980), EU-Thailand FTA (ongoing)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006)' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs' }
      ]
    },
    paragraphs: {
      description:
        'Thailand is an upper-middle-income country and ASEAN’s second-largest economy, growing 2.5% in 2024 and serving as a land bridge linking South Asia, Indochina and maritime Southeast Asia. A U.S. treaty ally that runs regular joint exercises with Washington, it has also held annual military exercises with China since 2005 — a hedging posture, though recent trends suggest a gradual drift toward Beijing.',
      trade:
        'Thailand’s economy is modern, industrialized and export-oriented, with China as its largest trading partner in 2025. It maintains deep ties with the U.S., ranking among its top 10 partners, while the EU is its fourth-largest partner at 7.2% of goods trade in 2025. Thailand ranks as the EU’s 25th-largest partner, with bilateral goods trade totalling €44.3 billion.',
      minerals:
        'Thailand is rich in tin and tungsten — essential for electric-vehicle production, battery storage and renewable-energy technologies. In 2025 the kingdom signed a Memorandum of Understanding with the U.S. to strengthen cooperation on critical-minerals supply-chain development.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'Bilateral-trade and EU-partner figures: BFNA research brief, Jun 2026 (2025).',
      minerals: 'BFNA research brief, Jun 2026 (2025).'
    },
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
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '3.5%' },
        { label: 'GDP per capita PPP', value: '$150,689.3' },
        { label: 'Trade-to-GDP', value: '322%' },
        { label: 'FDI net inflows', value: '$135.08B' }
      ],
      agreements: [
        { label: 'EU', value: 'ASEAN-EEC Cooperation Agreement (1980), EU-Singapore FTA (2019), Investment Protection Agreement (2019), Digital Trade Agreement (2026)' },
        { label: 'US', value: 'US-Singapore FTA (2004), US-ASEAN TIFA (2006)' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs' }
      ]
    },
    paragraphs: {
      description:
        'Singapore is one of the world’s great financial centers, leveraging its position at the mouth of the Strait of Malacca to exercise outsized influence on the global economy. Its ports are vital transshipment hubs for ASEAN, and its banks hold billions in U.S., European and Chinese assets. It produces little of its own, but its position, infrastructure and business-friendly governance have propelled it to the top of global economic rankings.',
      trade:
        'More than almost any other nation, Singapore relies on international trade. Its long, lucrative trading relationship with China ran upwards of $70 billion in 2025, yet it remains a crucial partner for both the U.S. and EU. In 2025 it was the EU’s 21st-largest goods-trade partner worldwide and the largest Asian investor in the EU.',
      minerals:
        'Given its size, Singapore has essentially zero mining capacity, yet it is an essential node in the critical-minerals supply chain. Resources mined across the region flow through its ports in vast quantities — a clearing house for ores and processed goods, much of it onward to China, the U.S. and Europe. It also imports significant volumes of critical minerals to supply its own industries.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'Bilateral-trade and EU-partner figures: BFNA research brief, Jun 2026 (2025).',
      minerals: 'BFNA research brief, Jun 2026.'
    },
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
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '4.7%' },
        { label: 'GDP per capita PPP', value: '$38,779.3' },
        { label: 'Trade-to-GDP', value: '137%' },
        { label: 'FDI net inflows', value: '$15.59B (2022)' }
      ],
      agreements: [
        { label: 'EU', value: 'ASEAN-EEC Cooperation Agreement (1980), EU-Malaysia PCA (signed 2022), MEUFTA (proposed)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006)' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs' }
      ]
    },
    paragraphs: {
      description:
        'One of the region’s most dynamic economies, Malaysia ranks as of 2026 as the world’s 34th-largest economy by nominal GDP and 28th by purchasing power parity. It has benefited from rising foreign investment as U.S. technology firms diversify away from China and Taiwan. It has also carved out a key role in the critical-minerals supply chain — both as a source of raw materials and as a refiner of unprocessed ores.',
      trade:
        'Located astride some of the world’s most important trade routes, Malaysia has long ranked among the most trade-dependent economies, a key link in high-tech supply chains for semiconductors and integrated circuits. While the U.S. and Europe have significant ties with Kuala Lumpur, they lag far behind China: in 2024 bilateral trade between China and Malaysia exceeded $154 billion.',
      minerals:
        'Lacking Indonesia’s stockpiles, Malaysia has still emerged as a key actor in the critical-mineral economy, producing bauxite, aluminum and nickel — most of it flowing into Chinese markets. It is shifting from intensive mining toward refining and processing: in 2025 the Australian firm Lynas opened the first refinery capable of processing heavy rare earths outside China.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'China–Malaysia bilateral trade: BFNA research brief, Jun 2026 (2024).',
      minerals: 'BFNA research brief, Jun 2026 (Lynas refinery 2025).'
    },
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
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '7.1%' },
        { label: 'GDP per capita PPP', value: '$16,385.5' },
        { label: 'Trade-to-GDP', value: '174%' },
        { label: 'FDI net inflows', value: '$20.17B' }
      ],
      agreements: [
        { label: 'EU', value: 'ASEAN-EEC Cooperation Agreement (1980), EU-Vietnam FTA (2020), Investment Protection Agreement (2019)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006)' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs' }
      ]
    },
    paragraphs: {
      description:
        'Vietnam is one of the region’s fastest-growing manufacturing hubs and an emerging alternative to China in global supply chains; as of 2025 it ranked 23rd globally by purchasing power parity, with recorded GDP growth of 7.1%. It shares a 1,297 km land border with China and has seen repeated South China Sea tensions. It holds Comprehensive Strategic Partnerships with both China and the U.S. — a calibrated hedge that maximizes leverage rather than aligning with either side.',
      trade:
        'Vietnam is highly dependent on trade, exporting electrical machinery, apparel, textiles and footwear. As of 2025 China is its largest single trade partner at a record $296 billion, but its relationships are diversified: U.S. goods trade totalled an estimated $209.5 billion in 2025 (its 8th-largest partner), and with €76 billion in bilateral goods trade Vietnam is the EU’s largest trading partner within ASEAN.',
      minerals:
        'Vietnam holds an estimated 3.5 million metric tons of rare-earth reserves — sixth globally — and is rich in bauxite, tungsten, titanium and manganese. It is the world’s second-largest producer of tungsten (4.1% of output), third in cement (2.3%) and fifth in fluorspar (1.4%). It also produces aluminum, antimony, bismuth, cobalt and graphite.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'Bilateral-trade figures: BFNA research brief, Jun 2026 (China 2025, U.S. 2025, EU 2025).',
      minerals: 'Reserve and production figures: BFNA research brief, Jun 2026.'
    },
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
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '4.1%' },
        { label: 'GDP per capita PPP', value: '$11,794.1' },
        { label: 'Trade-to-GDP', value: '66%' },
        { label: 'FDI net inflows', value: '$9.4B' }
      ],
      agreements: [
        { label: 'EU', value: 'ASEAN-EEC Cooperation Agreement (1980), EU-Philippines FTA (ongoing), GSP+ (2014)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006), Mutual Defense Treaty (1951)' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs' }
      ]
    },
    paragraphs: {
      description:
        'The Philippines, a mid-sized archipelagic nation, has built one of the region’s most vibrant economies on a thriving services sector and ranks as the world’s 35th-largest economy by nominal GDP. While Manila keeps extensive diplomatic and military ties with the U.S., it has built strong economic relations with regional partners, most notably China. With fast-developing infrastructure and growth regularly above 5%, it is poised to become a regional leader — though corruption and inequality remain pressing concerns.',
      trade:
        'Much of the Philippines’ recent success has been fuelled by trade. While a large share (~18% in April 2026) of exports flow to the U.S., the country is highly dependent on China for imports, with upwards of 29% of total imports originating in the PRC. Manila has also expanded EU ties, with bilateral goods trade of €17.6 billion in 2025; key exports include semiconductors, integrated circuits and critical minerals.',
      minerals:
        'The Philippines plays a growing role in critical-mineral supply chains, with vast and largely untapped reserves of nickel, copper and cobalt. It is now one of the world’s leading nickel exporters, with reserves estimated above $175 billion — 87% of its nickel-ore exports, by volume, shipped to China in 2024. The government has debated banning raw-nickel-ore exports to build refining capacity and move up the value chain.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'Trade-share and EU figures: BFNA research brief, Jun 2026 (exports Apr 2026, EU 2025).',
      minerals: 'Reserve figures: BFNA research brief, Jun 2026. Nickel-ore export share (by volume, 2024): Heinrich Böll Stiftung Southeast Asia, 2026.'
    },
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
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '2.6%' },
        { label: 'GDP per capita PPP', value: '$89,879.4' },
        { label: 'Trade-to-GDP', value: '133%' },
        { label: 'FDI net inflows', value: '$29.06M' }
      ],
      agreements: [
        { label: 'EU', value: 'ASEAN-EEC Cooperation Agreement (1980)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006)' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs' }
      ]
    },
    paragraphs: {
      description:
        'Despite its small size and population, Brunei is an economic powerhouse, trailing only Singapore among Southeast Asian nations on the Human Development Index (60th globally). Its success rests almost entirely on sizable crude-oil and natural-gas reserves, exports of which account for over half of GDP. Since launching the Wawasan Brunei 2035 plan in 2007, the government has sought to diversify into sectors such as mining and financial services.',
      trade:
        'With a small internal market, Brunei is exceedingly trade-dependent: oil and gas make up 80% of total exports and 53.5% of GDP, most of it sold to Australia, China and Japan. Beyond hydrocarbons it relies heavily on imports — chiefly from fellow ASEAN states, though China’s footprint has grown. The Chinese-partnered Hengyi Industries petrochemical plant now accounts for upwards of 10% of Brunei’s total exports.',
      minerals:
        'With extremely limited landmass and an economy built around oil and gas, Brunei’s current role in the critical-mineral industry is minimal. The government has begun diversifying its energy portfolio and exploring new mineral sources. Mining is unlikely to expand much, but the country is positioned to become an important logistical hub in the regional supply chain.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'Export-share and Hengyi figures: BFNA research brief, Jun 2026.',
      minerals: 'BFNA research brief, Jun 2026.'
    },
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
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '4%' },
        { label: 'GDP per capita PPP', value: '$7,966.9' },
        { label: 'Trade-to-GDP', value: '143%' },
        { label: 'FDI net inflows', value: '$4.39B' }
      ],
      agreements: [
        { label: 'EU', value: 'ASEAN-EEC Cooperation Agreement (1980), EU-Cambodia Cooperation Agreement (1999), Everything But Arms (2001)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006)' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs, China-Cambodia FTA (2022)' }
      ]
    },
    paragraphs: {
      description:
        'Cambodia, one of ASEAN’s smallest nations, has recovered from the COVID-19 pandemic and is experiencing real GDP growth of around 6%. It borders Thailand, Vietnam and Laos and holds direct access to the Gulf of Thailand through the Ream Naval Base, where China — its primary military partner — has secured a strategic foothold. While it leans strongly toward China, it continues to engage both the U.S. and the EU.',
      trade:
        'Cambodia’s key sectors are garments, agriculture and a recovering tourism industry. The U.S. is its largest single export destination at ~38% of total exports, with U.S. goods trade estimated at $15.7 billion in 2025 and EU trade at €4.3 billion in 2024. By comparison, China was its largest overall partner in 2025 at a record $19.73 billion, and accounts for 53% of approved FDI ($3.4 billion in 2024).',
      minerals:
        'Cambodia produces gold, clay, copper, gemstones and iron ore, but its critical-minerals sector remains largely underdeveloped, contributing only 3% of GDP. Other mineral commodities include limestone, salt, sand and gravel, steel and stone.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'Bilateral-trade and FDI figures: BFNA research brief, Jun 2026 (U.S. 2025, EU 2024, China 2025).',
      minerals: 'BFNA research brief, Jun 2026.'
    },
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
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '4.1%' },
        { label: 'GDP per capita PPP', value: '$9,775.8' },
        { label: 'Trade-to-GDP', value: '75% (2016)' },
        { label: 'FDI net inflows', value: '$988.46M' }
      ],
      agreements: [
        { label: 'EU', value: 'ASEAN-EEC Cooperation Agreement (1980), Everything But Arms (2001)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006)' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs' }
      ]
    },
    paragraphs: {
      description:
        'Small in size and population (8 million), Laos is the only landlocked country in Southeast Asia — a critical transit corridor bordered by China, Vietnam, Myanmar, Thailand and Cambodia. Its GDP grew 4.1% in 2024, but it is deeply dependent on China for infrastructure. As of 2026 a Chinese state-owned firm holds a 90% stake and 25-year concession over the national grid, while the $6 billion China–Laos Railway gives Beijing a controlling operational stake — making Laos the ASEAN member most structurally dependent on Beijing.',
      trade:
        'China is Laos’s dominant trade and investment partner by a commanding margin, with bilateral trade of roughly $6.29 billion in 2024. By comparison, U.S. goods trade totalled an estimated $2.1 billion in 2025 and EU goods trade around €500 million. Beijing’s dominance extends to debt: it owns roughly half of Laos’s $10.5 billion foreign debt. Laos’s total trade equalled about 75% of GDP as of 2016, the most recent year available.',
      minerals:
        'In 2024 Laos was the fourth-largest producer of refined bismuth (3.0% of global output) and the sixth-largest producer of potash (5.1%). As it develops its critical-minerals sector — particularly copper, tin and antimony — its importance is rapidly growing.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'Bilateral-trade and debt figures: BFNA research brief, Jun 2026 (China 2024, U.S. 2025, EU 2025). Total trade as % of GDP: World Bank NE.TRD.GNFS.ZS (2016 — most recent available for Laos).',
      minerals: 'BFNA research brief, Jun 2026 (2024).'
    },
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
  },

  myanmar: {
    slug: 'myanmar',
    name: 'Myanmar',
    flagUrl: flag('mm'),
    tagline: 'Small in dollars, decisive in rare earths.',
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '3%' },
        { label: 'GDP per capita PPP', value: '$5,997.5' },
        { label: 'Trade-to-GDP', value: 'Not available' },
        { label: 'FDI net inflows', value: '$1.10B' }
      ],
      agreements: [
        { label: 'EU', value: 'Everything But Arms (2001)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006) — suspended' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs' }
      ]
    },
    paragraphs: {
      description:
        'One of the world’s most ethnically diverse nations, Myanmar has been in near-constant civil war since independence in 1948 and destabilized by repeated military coups, struggling to build a modern economy. Its large population and abundant resources have allowed sporadic bursts of rapid growth. Reforms from 2011 liberalized the economy with significant gains. Those gains were largely reversed after the 2021 coup, as violence and mismanagement drove spiralling inflation and poverty.',
      trade:
        'Despite sitting along busy maritime routes, Myanmar conducts most of its trade overland. Since 2021 the ruling junta has been isolated from many partners, including the U.S., which suspended its bilateral Trade and Investment Framework Agreement that March. As a result the government has deepened trade ties with neighbouring China, with bilateral trade reaching $19.4 billion in 2025.',
      minerals:
        'Myanmar is among the world’s richest sources of heavy rare-earth elements such as dysprosium and terbium, essential for advanced batteries. As part of its drive to dominate the critical-mineral industry, China has invested heavily in extracting these resources, often damaging local ecosystems. The U.S. and Europe have expressed interest in following suit, but the country’s instability has made inroads difficult.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'China bilateral-trade figure: BFNA research brief, Jun 2026 (2025).',
      minerals: 'BFNA research brief, Jun 2026.'
    },
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Natural gas', valueUsdB: 3.5 },
      { label: 'Rare earths', valueUsdB: 1.4 },
      { label: 'Jade & gems', valueUsdB: 1.0 },
      { label: 'Beans & pulses', valueUsdB: 0.8 },
      { label: 'Garments', valueUsdB: 0.6 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
    topImports: [
      { label: 'Refined petroleum', valueUsdB: 1.6 },
      { label: 'Machinery', valueUsdB: 0.9 },
      { label: 'Fabric & textiles', valueUsdB: 0.7 },
      { label: 'Vehicles & parts', valueUsdB: 0.5 }
    ]
  },

  timor_leste: {
    slug: 'timor_leste',
    name: 'Timor-Leste',
    flagUrl: flag('tl'),
    tagline: 'A young petro-economy inching into the minerals game.',
    keyFacts: {
      indicators: [
        { label: 'GDP growth', value: '4.1%' },
        { label: 'GDP per capita PPP', value: '$4,422.8' },
        { label: 'Trade-to-GDP', value: '95%' },
        { label: 'FDI net inflows', value: '$225.47M' }
      ],
      agreements: [
        { label: 'EU', value: 'Everything But Arms (2001)' },
        { label: 'US', value: 'US-ASEAN TIFA (2006) — not yet signed' },
        { label: 'China', value: 'ASEAN-China FTA (2009), RCEP (2021), several MoUs' }
      ]
    },
    paragraphs: {
      description:
        'One of the world’s youngest nations, Timor-Leste is a small, developing economy the UN lists as a Least Developed Country. Since regaining independence from Indonesia in 2002, it has seen modest growth fuelled by government spending, foreign direct investment and a growing petrochemicals industry. Further growth has been hampered by insufficient infrastructure, lagging job creation and a decentralized, heavily rural population.',
      trade:
        'Timor-Leste relies heavily on trade, with exports dominated by crude oil — much of it flowing to Thailand and the U.S. — and limited domestic manufacturing leaving it dependent on imports of refined oil and rice. China accounts for a significant share of those imports, at approximately $266 million in 2024. Bilateral trade with the EU remains limited (€17 million in 2025), though the two sides have signed several agreements to boost trade and investment.',
      minerals:
        'Timor-Leste’s role in the critical-mineral supply chain is currently minimal, but it is taking steps to expand its footprint. The country is believed to hold significant, largely untapped reserves of nickel, copper and manganese. Since 2020 foreign firms have invested in mining, including Australia’s Estrella Resources, which secured rights to mine manganese in the northern regions — investments welcomed by a government keen to diversify beyond oil and gas.'
    },
    sources: {
      description: 'BFNA research brief, Jun 2026.',
      trade: 'Bilateral-trade figures: BFNA research brief, Jun 2026 (China 2024, EU 2025).',
      minerals: 'BFNA research brief, Jun 2026.'
    },
    // UNVERIFIED PLACEHOLDER — no HS-product source; not regenerated.
    // See todos/BF-57-defer-top-trade-hs-product-composition.md (D1).
    topExports: [
      { label: 'Crude petroleum', valueUsdB: 0.4 },
      { label: 'Coffee', valueUsdB: 0.02 }
    ],
    // UNVERIFIED PLACEHOLDER — see topExports note above.
    topImports: [
      { label: 'Refined petroleum', valueUsdB: 0.2 },
      { label: 'Rice', valueUsdB: 0.05 },
      { label: 'Machinery', valueUsdB: 0.05 }
    ]
  }
}

export function profileBySlug(slug: string): CountryProfile | undefined {
  return PROFILES[slug]
}

// --- URL <-> profile-key slug mapping (BF-130) ------------------------------
// Profile keys are lowercase single tokens EXCEPT Timor-Leste, whose key carries
// an underscore (`timor_leste`). URLs read better with a hyphen (`timor-leste`),
// so map hyphen<->underscore both ways. All other keys round-trip unchanged.
export function urlSlugToKey(urlSlug: string): string {
  return urlSlug.replace(/-/g, '_')
}

export function keyToUrlSlug(key: string): string {
  return key.replace(/_/g, '-')
}

// Resolve a profile from a URL slug (hyphen form). Returns undefined for any
// slug that doesn't map to a wired profile — callers degrade to the list.
export function profileByUrlSlug(urlSlug: string): CountryProfile | undefined {
  return PROFILES[urlSlugToKey(urlSlug)]
}

// Every wired country as its URL slug (hyphen form) — used to prerender the
// per-country detail routes.
export const COUNTRY_URL_SLUGS: string[] = Object.keys(PROFILES).map(keyToUrlSlug)
