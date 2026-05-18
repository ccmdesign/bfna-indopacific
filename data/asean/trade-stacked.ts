// Stacked-area trade flows per ASEAN country with CHN / USA / EU partners,
// 2010–2024. Annual two-way goods trade in USD millions.
//
// GENERATED FILE — do not hand-edit. Regenerate with:
//   node scripts/build-asean-trade-stacked.mjs   (or: npm run gen:trade-stacked)
//
// Source: _data/wrangled/asean-flows-yearly.csv (BACI HS07 V202601, long
// format). For each country x partner x year the two trade directions are
// summed into one two-way figure. Values are USD millions: the chart's
// Y-axis label divides by 1000 to render "$NNNB".

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
const BASE_SOURCE = 'BACI HS07 V202601'

export const tradeStackedBySlug: Record<string, StackedAreaData> = {
  indonesia: {
    country: 'IDN',
    country_name: 'Indonesia',
    metric: 'Two-way trade',
    unit: 'USD millions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 41166.6, USA: 27251.9, EU: 25246.3 },
      { year: 2011, CHN: 54739, USA: 31308.2, EU: 31224.3 },
      { year: 2012, CHN: 57958.5, USA: 30308.8, EU: 30052.6 },
      { year: 2013, CHN: 59138, USA: 28800, EU: 28553.6 },
      { year: 2014, CHN: 54281.6, USA: 28525.6, EU: 29521.3 },
      { year: 2015, CHN: 49165.4, USA: 27939.4, EU: 26189.3 },
      { year: 2016, CHN: 51450.9, USA: 27468.5, EU: 25048.7 },
      { year: 2017, CHN: 64487, USA: 29584.4, EU: 27162.6 },
      { year: 2018, CHN: 78284.5, USA: 32277.7, EU: 28507.8 },
      { year: 2019, CHN: 77658.9, USA: 30715.9, EU: 25048.1 },
      { year: 2020, CHN: 75953.2, USA: 29821.3, EU: 22937.2 },
      { year: 2021, CHN: 117440.5, USA: 39215.5, EU: 28038.8 },
      { year: 2022, CHN: 142493.3, USA: 47926.3, EU: 32317 },
      { year: 2023, CHN: 133777.5, USA: 38550.9, EU: 30776 },
      { year: 2024, CHN: 142568, USA: 41648.2, EU: 28824.1 }
    ]
  },

  thailand: {
    country: 'THA',
    country_name: 'Thailand',
    metric: 'Two-way trade',
    unit: 'USD millions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 55794.9, USA: 34004, EU: 28113.8 },
      { year: 2011, CHN: 68544, USA: 37728.7, EU: 33743.9 },
      { year: 2012, CHN: 73370.6, USA: 39448, EU: 32615.2 },
      { year: 2013, CHN: 73062.5, USA: 40169.2, EU: 35278.6 },
      { year: 2014, CHN: 74018.3, USA: 41168.9, EU: 33815 },
      { year: 2015, CHN: 74913.5, USA: 42235.3, EU: 29737.6 },
      { year: 2016, CHN: 74864.2, USA: 41907.2, EU: 31503.1 },
      { year: 2017, CHN: 82185.3, USA: 44687, EU: 34593.8 },
      { year: 2018, CHN: 91135.5, USA: 47298.3, EU: 37030.1 },
      { year: 2019, CHN: 94844.1, USA: 50930.1, EU: 35213.5 },
      { year: 2020, CHN: 96117.5, USA: 52029.5, EU: 29985.9 },
      { year: 2021, CHN: 115697.4, USA: 64637.7, EU: 36520.4 },
      { year: 2022, CHN: 122357.6, USA: 79154.9, EU: 38561.1 },
      { year: 2023, CHN: 116735.5, USA: 76928.5, EU: 39792.5 },
      { year: 2024, CHN: 124897.3, USA: 83932.7, EU: 41328.8 }
    ]
  },

  singapore: {
    country: 'SGP',
    country_name: 'Singapore',
    metric: 'Two-way trade',
    unit: 'USD millions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 56685, USA: 48070.1, EU: 44760.4 },
      { year: 2011, CHN: 67124.9, USA: 52163, EU: 53118.3 },
      { year: 2012, CHN: 69367.5, USA: 54153, EU: 54749.6 },
      { year: 2013, CHN: 75966.8, USA: 51883.8, EU: 51144.9 },
      { year: 2014, CHN: 81981.9, USA: 51895.8, EU: 50322.4 },
      { year: 2015, CHN: 76635.4, USA: 48114.1, EU: 38748.7 },
      { year: 2016, CHN: 70131.2, USA: 46660.1, EU: 45591.1 },
      { year: 2017, CHN: 79418.9, USA: 50500.5, EU: 49451.5 },
      { year: 2018, CHN: 86304.5, USA: 58707, EU: 59039.6 },
      { year: 2019, CHN: 87581, USA: 57192.1, EU: 52737.5 },
      { year: 2020, CHN: 82869.9, USA: 59327.8, EU: 43978.4 },
      { year: 2021, CHN: 95577.5, USA: 65603.9, EU: 49827.8 },
      { year: 2022, CHN: 99686, USA: 72021.2, EU: 55529.4 },
      { year: 2023, CHN: 99323.1, USA: 76599.2, EU: 53493.7 },
      { year: 2024, CHN: 95052.4, USA: 81462.7, EU: 50678.9 }
    ]
  },

  malaysia: {
    country: 'MYS',
    country_name: 'Malaysia',
    metric: 'Two-way trade',
    unit: 'USD millions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 66709.2, USA: 40264.8, EU: 33336.7 },
      { year: 2011, CHN: 81151.6, USA: 43365.6, EU: 39429.7 },
      { year: 2012, CHN: 82358.3, USA: 38271.8, EU: 37513 },
      { year: 2013, CHN: 88591.3, USA: 43080.5, EU: 38544.8 },
      { year: 2014, CHN: 87303, USA: 46329.3, EU: 40456.3 },
      { year: 2015, CHN: 82386.4, USA: 47889.5, EU: 34930.2 },
      { year: 2016, CHN: 79499.8, USA: 49724.7, EU: 34635.9 },
      { year: 2017, CHN: 89619.4, USA: 49798.2, EU: 38393.7 },
      { year: 2018, CHN: 98896.2, USA: 54763.3, EU: 41852.6 },
      { year: 2019, CHN: 106842.3, USA: 56129, EU: 40076.4 },
      { year: 2020, CHN: 103386.6, USA: 58834.8, EU: 35963 },
      { year: 2021, CHN: 138319.6, USA: 71402.5, EU: 42108.6 },
      { year: 2022, CHN: 144576.6, USA: 75741.3, EU: 44375.7 },
      { year: 2023, CHN: 139049.9, USA: 63082.4, EU: 41490.1 },
      { year: 2024, CHN: 153557.7, USA: 78904.1, EU: 40302.3 }
    ]
  },

  vietnam: {
    country: 'VNM',
    country_name: 'Vietnam',
    metric: 'Two-way trade',
    unit: 'USD millions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 28439.2, USA: 20378.4, EU: 17208.4 },
      { year: 2011, CHN: 35788, USA: 23498.6, EU: 22362 },
      { year: 2012, CHN: 45726.3, USA: 26955.8, EU: 25571.2 },
      { year: 2013, CHN: 53047.5, USA: 31648.5, EU: 28995.9 },
      { year: 2014, CHN: 64514.4, USA: 38277.1, EU: 31008.7 },
      { year: 2015, CHN: 70847.9, USA: 47692.3, EU: 35898.9 },
      { year: 2016, CHN: 77134.6, USA: 51929.5, EU: 38705.3 },
      { year: 2017, CHN: 97667.1, USA: 56598.6, EU: 43686.6 },
      { year: 2018, CHN: 115400.2, USA: 62590.8, EU: 46707.1 },
      { year: 2019, CHN: 132503.4, USA: 81345.4, EU: 47392.5 },
      { year: 2020, CHN: 155143.8, USA: 93183.9, EU: 43250.3 },
      { year: 2021, CHN: 188503.7, USA: 117605, EU: 49029 },
      { year: 2022, CHN: 198857.6, USA: 142550.7, EU: 55156.9 },
      { year: 2023, CHN: 187078.6, USA: 126907.4, EU: 56916.5 },
      { year: 2024, CHN: 252801.9, USA: 153060.8, EU: 60054.8 }
    ]
  },

  philippines: {
    country: 'PHL',
    country_name: 'Philippines',
    metric: 'Two-way trade',
    unit: 'USD millions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 27758.8, USA: 14884.2, EU: 9411.7 },
      { year: 2011, CHN: 32243, USA: 16522.7, EU: 10180.1 },
      { year: 2012, CHN: 36375.4, USA: 17124.5, EU: 10482.9 },
      { year: 2013, CHN: 38048, USA: 16957.8, EU: 11858.7 },
      { year: 2014, CHN: 44453.6, USA: 18261.3, EU: 13755.6 },
      { year: 2015, CHN: 45635.6, USA: 17891.9, EU: 11248.5 },
      { year: 2016, CHN: 47213.2, USA: 17711.2, EU: 11568.7 },
      { year: 2017, CHN: 39535.1, USA: 20414.1, EU: 14620.7 },
      { year: 2018, CHN: 43236.9, USA: 21624.8, EU: 16197 },
      { year: 2019, CHN: 43048, USA: 21735.6, EU: 16879.9 },
      { year: 2020, CHN: 38135.4, USA: 19126.8, EU: 12467.4 },
      { year: 2021, CHN: 48075.9, USA: 22823.4, EU: 15943.2 },
      { year: 2022, CHN: 49287.5, USA: 26100.5, EU: 18543.9 },
      { year: 2023, CHN: 47951.3, USA: 22388.1, EU: 17139.4 },
      { year: 2024, CHN: 52572.5, USA: 22334, EU: 16771.7 }
    ]
  },

  brunei: {
    country: 'BRN',
    country_name: 'Brunei',
    metric: 'Two-way trade',
    unit: 'USD millions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 883.5, USA: 267.3, EU: 159.8 },
      { year: 2011, CHN: 964.3, USA: 365.4, EU: 227.4 },
      { year: 2012, CHN: 819.2, USA: 356, EU: 291.6 },
      { year: 2013, CHN: 667.7, USA: 446.2, EU: 292.5 },
      { year: 2014, CHN: 786.3, USA: 352, EU: 618.3 },
      { year: 2015, CHN: 612, USA: 404.6, EU: 465.9 },
      { year: 2016, CHN: 613, USA: 302.4, EU: 233.7 },
      { year: 2017, CHN: 1046.3, USA: 311.6, EU: 292 },
      { year: 2018, CHN: 1969.7, USA: 441.2, EU: 300.4 },
      { year: 2019, CHN: 1160.9, USA: 363.9, EU: 550.6 },
      { year: 2020, CHN: 2122.2, USA: 360.9, EU: 285 },
      { year: 2021, CHN: 2849.2, USA: 225.5, EU: 243.2 },
      { year: 2022, CHN: 2976.1, USA: 382, EU: 290 },
      { year: 2023, CHN: 2684.2, USA: 509.2, EU: 283.8 },
      { year: 2024, CHN: 2730.6, USA: 484.5, EU: 268 }
    ]
  },

  cambodia: {
    country: 'KHM',
    country_name: 'Cambodia',
    metric: 'Two-way trade',
    unit: 'USD millions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 1638.6, USA: 3250.5, EU: 1653 },
      { year: 2011, CHN: 2646.5, USA: 3666.3, EU: 2314.8 },
      { year: 2012, CHN: 2966.6, USA: 3622.1, EU: 2562.4 },
      { year: 2013, CHN: 4014, USA: 3954.8, EU: 3136.6 },
      { year: 2014, CHN: 3998.4, USA: 4050.2, EU: 3856.1 },
      { year: 2015, CHN: 4438.4, USA: 4226.4, EU: 4350.5 },
      { year: 2016, CHN: 4941.7, USA: 3685.1, EU: 5316.7 },
      { year: 2017, CHN: 6249.6, USA: 3784.6, EU: 5769.9 },
      { year: 2018, CHN: 7425.5, USA: 4715.4, EU: 6560.1 },
      { year: 2019, CHN: 9161.2, USA: 6486.7, EU: 6789.1 },
      { year: 2020, CHN: 8944.3, USA: 7673.9, EU: 5243.6 },
      { year: 2021, CHN: 11541.2, USA: 10260.8, EU: 5591.3 },
      { year: 2022, CHN: 13259.2, USA: 13639.2, EU: 6936.9 },
      { year: 2023, CHN: 13274.1, USA: 12653.2, EU: 7464.6 },
      { year: 2024, CHN: 16288.8, USA: 13800.5, EU: 8204.3 }
    ]
  },

  laos: {
    country: 'LAO',
    country_name: 'Laos',
    metric: 'Two-way trade',
    unit: 'USD millions',
    source: BASE_SOURCE,
    partners: BASE_PARTNERS,
    series: [
      { year: 2010, CHN: 1179.4, USA: 83.2, EU: 283.5 },
      { year: 2011, CHN: 1330, USA: 98.9, EU: 432.6 },
      { year: 2012, CHN: 1749.7, USA: 62.2, EU: 599.6 },
      { year: 2013, CHN: 2942.7, USA: 80.9, EU: 463.6 },
      { year: 2014, CHN: 3595.7, USA: 85.9, EU: 497.9 },
      { year: 2015, CHN: 2813.8, USA: 94.3, EU: 331.4 },
      { year: 2016, CHN: 2589.6, USA: 95.4, EU: 289.5 },
      { year: 2017, CHN: 3244.6, USA: 142.6, EU: 342.5 },
      { year: 2018, CHN: 3274.1, USA: 172.3, EU: 345.5 },
      { year: 2019, CHN: 4014.4, USA: 220.9, EU: 423.1 },
      { year: 2020, CHN: 3273.6, USA: 211, EU: 430.5 },
      { year: 2021, CHN: 4235.4, USA: 364.4, EU: 546.4 },
      { year: 2022, CHN: 5064.8, USA: 473.9, EU: 597.1 },
      { year: 2023, CHN: 5972.1, USA: 432.5, EU: 604.9 },
      { year: 2024, CHN: 7344.7, USA: 869.4, EU: 584.8 }
    ]
  }
}
