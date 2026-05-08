// Stacked-area trade flows per ASEAN country with CHN / USA / EU partners,
// 2010–2024. Annual two-way trade in USD billions.
//
// End-year values anchored to placeholder-data.ts hero stats (CHN) and
// bigSecondary (USA). Intermediate years use plausible growth curves
// reflecting documented PRC supply-chain expansion through the period.
//
// Numbers are directionally accurate, ranking-correct snapshots — replace
// with the BACI HS07 V202601 cut when it lands.

export interface SeriesPoint {
  year: number
  CHN: number
  USA: number
  EU: number
  [partner: string]: number
}

export interface StackedAreaData {
  country: string
  country_name: string
  metric: string
  unit: string
  source: string
  partners: string[]
  series: SeriesPoint[]
}

const BASE_PARTNERS = ['CHN', 'USA', 'EU']
const BASE_SOURCE = 'BACI HS07 V202601 / IEA (placeholder values)'

export const tradeStackedBySlug: Record<string, StackedAreaData> = {
  indonesia: {
    country: 'IDN',
    country_name: 'Indonesia',
    metric: 'Two-way trade',
    unit: 'USD billions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 36, USA: 21, EU: 25 },
      { year: 2011, CHN: 49, USA: 24, EU: 28 },
      { year: 2012, CHN: 51, USA: 25, EU: 28 },
      { year: 2013, CHN: 52, USA: 27, EU: 28 },
      { year: 2014, CHN: 48, USA: 27, EU: 27 },
      { year: 2015, CHN: 44, USA: 24, EU: 25 },
      { year: 2016, CHN: 47, USA: 24, EU: 25 },
      { year: 2017, CHN: 59, USA: 26, EU: 28 },
      { year: 2018, CHN: 72, USA: 28, EU: 30 },
      { year: 2019, CHN: 73, USA: 27, EU: 27 },
      { year: 2020, CHN: 78, USA: 27, EU: 23 },
      { year: 2021, CHN: 110, USA: 37, EU: 28 },
      { year: 2022, CHN: 133, USA: 41, EU: 32 },
      { year: 2023, CHN: 127, USA: 35, EU: 30 },
      { year: 2024, CHN: 143, USA: 38, EU: 31 }
    ]
  },

  thailand: {
    country: 'THA',
    country_name: 'Thailand',
    metric: 'Two-way trade',
    unit: 'USD billions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 46, USA: 31, EU: 32 },
      { year: 2011, CHN: 58, USA: 35, EU: 36 },
      { year: 2012, CHN: 63, USA: 37, EU: 37 },
      { year: 2013, CHN: 65, USA: 38, EU: 36 },
      { year: 2014, CHN: 64, USA: 38, EU: 35 },
      { year: 2015, CHN: 63, USA: 36, EU: 32 },
      { year: 2016, CHN: 66, USA: 38, EU: 33 },
      { year: 2017, CHN: 73, USA: 40, EU: 36 },
      { year: 2018, CHN: 80, USA: 44, EU: 39 },
      { year: 2019, CHN: 79, USA: 47, EU: 38 },
      { year: 2020, CHN: 79, USA: 49, EU: 33 },
      { year: 2021, CHN: 96, USA: 56, EU: 39 },
      { year: 2022, CHN: 105, USA: 64, EU: 44 },
      { year: 2023, CHN: 99, USA: 60, EU: 45 },
      { year: 2024, CHN: 104, USA: 62, EU: 48 }
    ]
  },

  singapore: {
    country: 'SGP',
    country_name: 'Singapore',
    metric: 'Two-way trade',
    unit: 'USD billions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 67, USA: 51, EU: 58 },
      { year: 2011, CHN: 79, USA: 57, EU: 64 },
      { year: 2012, CHN: 83, USA: 58, EU: 65 },
      { year: 2013, CHN: 88, USA: 61, EU: 66 },
      { year: 2014, CHN: 91, USA: 63, EU: 67 },
      { year: 2015, CHN: 87, USA: 62, EU: 63 },
      { year: 2016, CHN: 89, USA: 64, EU: 62 },
      { year: 2017, CHN: 96, USA: 69, EU: 65 },
      { year: 2018, CHN: 102, USA: 75, EU: 68 },
      { year: 2019, CHN: 104, USA: 79, EU: 67 },
      { year: 2020, CHN: 102, USA: 80, EU: 60 },
      { year: 2021, CHN: 113, USA: 86, EU: 64 },
      { year: 2022, CHN: 122, USA: 93, EU: 68 },
      { year: 2023, CHN: 116, USA: 95, EU: 67 },
      { year: 2024, CHN: 118, USA: 96, EU: 68 }
    ]
  },

  malaysia: {
    country: 'MYS',
    country_name: 'Malaysia',
    metric: 'Two-way trade',
    unit: 'USD billions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 47, USA: 27, EU: 30 },
      { year: 2011, CHN: 56, USA: 30, EU: 33 },
      { year: 2012, CHN: 60, USA: 32, EU: 33 },
      { year: 2013, CHN: 63, USA: 33, EU: 33 },
      { year: 2014, CHN: 65, USA: 34, EU: 33 },
      { year: 2015, CHN: 62, USA: 32, EU: 30 },
      { year: 2016, CHN: 62, USA: 31, EU: 29 },
      { year: 2017, CHN: 71, USA: 34, EU: 31 },
      { year: 2018, CHN: 78, USA: 36, EU: 33 },
      { year: 2019, CHN: 76, USA: 38, EU: 32 },
      { year: 2020, CHN: 74, USA: 39, EU: 28 },
      { year: 2021, CHN: 88, USA: 43, EU: 33 },
      { year: 2022, CHN: 96, USA: 46, EU: 38 },
      { year: 2023, CHN: 92, USA: 44, EU: 36 },
      { year: 2024, CHN: 98, USA: 45, EU: 38 }
    ]
  },

  vietnam: {
    country: 'VNM',
    country_name: 'Vietnam',
    metric: 'Two-way trade',
    unit: 'USD billions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 27, USA: 18, EU: 17 },
      { year: 2011, CHN: 35, USA: 21, EU: 21 },
      { year: 2012, CHN: 41, USA: 25, EU: 26 },
      { year: 2013, CHN: 50, USA: 30, EU: 33 },
      { year: 2014, CHN: 59, USA: 35, EU: 38 },
      { year: 2015, CHN: 66, USA: 41, EU: 41 },
      { year: 2016, CHN: 72, USA: 47, EU: 43 },
      { year: 2017, CHN: 94, USA: 54, EU: 50 },
      { year: 2018, CHN: 107, USA: 60, EU: 56 },
      { year: 2019, CHN: 117, USA: 76, EU: 56 },
      { year: 2020, CHN: 133, USA: 91, EU: 55 },
      { year: 2021, CHN: 166, USA: 112, EU: 64 },
      { year: 2022, CHN: 175, USA: 124, EU: 70 },
      { year: 2023, CHN: 162, USA: 110, EU: 62 },
      { year: 2024, CHN: 172, USA: 124, EU: 65 }
    ]
  },

  philippines: {
    country: 'PHL',
    country_name: 'Philippines',
    metric: 'Two-way trade',
    unit: 'USD billions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 17, USA: 13, EU: 11 },
      { year: 2011, CHN: 19, USA: 14, EU: 12 },
      { year: 2012, CHN: 21, USA: 15, EU: 12 },
      { year: 2013, CHN: 22, USA: 16, EU: 13 },
      { year: 2014, CHN: 23, USA: 17, EU: 13 },
      { year: 2015, CHN: 23, USA: 17, EU: 14 },
      { year: 2016, CHN: 26, USA: 18, EU: 14 },
      { year: 2017, CHN: 31, USA: 19, EU: 15 },
      { year: 2018, CHN: 35, USA: 20, EU: 16 },
      { year: 2019, CHN: 36, USA: 21, EU: 16 },
      { year: 2020, CHN: 35, USA: 19, EU: 14 },
      { year: 2021, CHN: 43, USA: 22, EU: 16 },
      { year: 2022, CHN: 50, USA: 25, EU: 18 },
      { year: 2023, CHN: 47, USA: 23, EU: 17 },
      { year: 2024, CHN: 52, USA: 24, EU: 18 }
    ]
  },

  brunei: {
    country: 'BRN',
    country_name: 'Brunei',
    metric: 'Two-way trade',
    unit: 'USD billions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 0.4, USA: 0.3, EU: 0.3 },
      { year: 2011, CHN: 0.6, USA: 0.3, EU: 0.3 },
      { year: 2012, CHN: 0.8, USA: 0.3, EU: 0.3 },
      { year: 2013, CHN: 1.0, USA: 0.3, EU: 0.3 },
      { year: 2014, CHN: 1.1, USA: 0.3, EU: 0.4 },
      { year: 2015, CHN: 1.0, USA: 0.3, EU: 0.3 },
      { year: 2016, CHN: 0.9, USA: 0.3, EU: 0.3 },
      { year: 2017, CHN: 1.2, USA: 0.3, EU: 0.3 },
      { year: 2018, CHN: 1.5, USA: 0.3, EU: 0.4 },
      { year: 2019, CHN: 1.8, USA: 0.3, EU: 0.4 },
      { year: 2020, CHN: 1.6, USA: 0.3, EU: 0.3 },
      { year: 2021, CHN: 2.2, USA: 0.4, EU: 0.4 },
      { year: 2022, CHN: 2.7, USA: 0.4, EU: 0.5 },
      { year: 2023, CHN: 2.5, USA: 0.4, EU: 0.4 },
      { year: 2024, CHN: 2.8, USA: 0.4, EU: 0.4 }
    ]
  },

  cambodia: {
    country: 'KHM',
    country_name: 'Cambodia',
    metric: 'Two-way trade',
    unit: 'USD billions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 1.5, USA: 2.4, EU: 1.6 },
      { year: 2011, CHN: 2.0, USA: 2.7, EU: 1.9 },
      { year: 2012, CHN: 2.7, USA: 3.0, EU: 2.3 },
      { year: 2013, CHN: 3.3, USA: 3.4, EU: 2.7 },
      { year: 2014, CHN: 3.8, USA: 3.7, EU: 3.1 },
      { year: 2015, CHN: 4.4, USA: 4.0, EU: 3.5 },
      { year: 2016, CHN: 5.0, USA: 4.6, EU: 4.1 },
      { year: 2017, CHN: 5.8, USA: 5.1, EU: 4.6 },
      { year: 2018, CHN: 7.4, USA: 6.0, EU: 5.2 },
      { year: 2019, CHN: 8.5, USA: 6.5, EU: 5.4 },
      { year: 2020, CHN: 8.1, USA: 7.0, EU: 5.0 },
      { year: 2021, CHN: 11.0, USA: 8.2, EU: 5.8 },
      { year: 2022, CHN: 13.0, USA: 9.1, EU: 6.5 },
      { year: 2023, CHN: 12.5, USA: 8.5, EU: 6.6 },
      { year: 2024, CHN: 14.0, USA: 9.0, EU: 7.0 }
    ]
  },

  laos: {
    country: 'LAO',
    country_name: 'Laos',
    metric: 'Two-way trade',
    unit: 'USD billions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 0.7, USA: 0.05, EU: 0.15 },
      { year: 2011, CHN: 1.0, USA: 0.05, EU: 0.18 },
      { year: 2012, CHN: 1.3, USA: 0.06, EU: 0.20 },
      { year: 2013, CHN: 1.7, USA: 0.07, EU: 0.22 },
      { year: 2014, CHN: 2.0, USA: 0.08, EU: 0.25 },
      { year: 2015, CHN: 2.3, USA: 0.09, EU: 0.28 },
      { year: 2016, CHN: 2.7, USA: 0.10, EU: 0.30 },
      { year: 2017, CHN: 3.0, USA: 0.10, EU: 0.32 },
      { year: 2018, CHN: 3.5, USA: 0.12, EU: 0.36 },
      { year: 2019, CHN: 4.1, USA: 0.13, EU: 0.40 },
      { year: 2020, CHN: 4.4, USA: 0.13, EU: 0.38 },
      { year: 2021, CHN: 5.4, USA: 0.15, EU: 0.42 },
      { year: 2022, CHN: 6.6, USA: 0.18, EU: 0.46 },
      { year: 2023, CHN: 7.2, USA: 0.18, EU: 0.48 },
      { year: 2024, CHN: 8.0, USA: 0.20, EU: 0.50 }
    ]
  }
}
