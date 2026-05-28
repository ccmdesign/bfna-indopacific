// Per-ASEAN-country hero figure: two-way goods trade with China, 2024,
// in USD billions, formatted "$<n>B".
//
// GENERATED FILE — do not hand-edit. Regenerate with:
//   node scripts/build-asean-country-hero.mjs   (or: npm run gen:country-hero)
//
// Source: _data/wrangled/asean-flows-yearly.csv (BACI HS07 V202601, long
// format). For each country the two 2024 CHN trade directions are summed
// into one two-way figure, then rounded to USD billions (integer >= $10B,
// one decimal < $10B). Consumed by data/asean/country-profiles.ts (the
// curated paragraph + deferred top-trade arrays live there, not here).

export interface CountryHero {
  value: string
  label: string
}

export const COUNTRY_HERO: Record<string, CountryHero> = {
  indonesia: { value: '$143B', label: 'Two-way trade with China, 2024' },
  thailand: { value: '$125B', label: 'Two-way trade with China, 2024' },
  singapore: { value: '$95B', label: 'Two-way trade with China, 2024' },
  malaysia: { value: '$154B', label: 'Two-way trade with China, 2024' },
  vietnam: { value: '$253B', label: 'Two-way trade with China, 2024' },
  philippines: { value: '$53B', label: 'Two-way trade with China, 2024' },
  brunei: { value: '$2.7B', label: 'Two-way trade with China, 2024' },
  cambodia: { value: '$16B', label: 'Two-way trade with China, 2024' },
  laos: { value: '$7.3B', label: 'Two-way trade with China, 2024' }
}
