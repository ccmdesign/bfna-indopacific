# Our World in Data — Minerals Explorer — Scout
Scouted: 2026-04-24

## 1. Source

**Landing:** https://ourworldindata.org/explorers/minerals

## 2. Data

- Sources: World Bank + BGS World Mineral Statistics + USGS MCS — republished as clean CSVs
- 50+ minerals including nickel, cobalt, bauxite, tin, lithium, REEs (graphite, REOs), copper
- **Production + reserves only. NO bilateral trade flows.**
- Years: 1900–2024 varies by mineral (Li from ~2000; Co, Ni, Sn, bauxite have long series)

## 3. Direct CSV Pattern

Global aggregate production (all minerals):
```
https://ourworldindata.org/grapher/global-mine-production-minerals.csv?v=1&csvType=full&useColumnShortNames=false
```

Country-level per-mineral follows pattern:
```
https://ourworldindata.org/grapher/{chart-slug}.csv
```

Example slugs: `nickel-mine-production`, `cobalt-mine-production`, `tin-mine-production` (verify by browsing explorer).

## 4. Auth

None. Free, clean CSVs.

## 5. Use in Infographic

Production context layer (e.g., "Indonesia = 48% of global nickel supply"). NOT the flow dataset. For flows → Chatham House or Comtrade.

## 6. Fetch examples

```bash
curl -sSL -o data-raw/owid-minerals/global-mine-production-minerals.csv \
  "https://ourworldindata.org/grapher/global-mine-production-minerals.csv?v=1&csvType=full&useColumnShortNames=false"

curl -sSL -o data-raw/owid-minerals/nickel-mine-production-by-country.csv \
  "https://ourworldindata.org/grapher/nickel-mine-production.csv?v=1&csvType=full&useColumnShortNames=false"
```
