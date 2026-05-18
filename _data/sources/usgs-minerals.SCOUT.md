# USGS Mineral Commodity Summaries 2026 — Scout
Scouted: 2026-04-24

## 1. Source

**Landing:** https://pubs.usgs.gov/publication/mcs2026
**Data release (ScienceBase):** https://www.sciencebase.gov/catalog/item/696a75d5d4be0228872d3bf8
**DOI:** https://doi.org/10.5066/P1WKQ63T

## 2. Best Download

| File | Size | Use |
|---|---|---|
| `MCS2026_Commodities_Data.csv` | 3.04 MB | **Primary** — 90+ commodities, world production + reserves, all countries |
| `MCS2026_T7_Critical_Minerals_Salient.csv` | 4.6 KB | Critical minerals 5-yr salient stats |
| Full PDF (222pp) | ~25 MB | Narrative + commodity 2-pagers |
| Per-commodity PDFs | 100–200 KB | https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-{commodity}.pdf |

Confirmed working commodity slugs: `nickel`, `cobalt`, `rare-earths`, `tin`, `bauxite`, `copper`.

## 3. Auth

None. Free public.

## 4. Coverage

- Data years: 2021–2025 in Commodities_Data.csv
- MCS2026 = 2024 production estimates (preliminary) + 2025 where available
- Reserves as of year-end 2025

## 5. Headline Stats (MCS2026 — cite-ready)

- **Indonesia nickel: ~2.2 Mt (2024 est.), >60% of global mine production** (world total ~3.7 Mt)
- Indonesia production up ~8% YoY despite market surplus
- **Indonesia cobalt: ~14% of world** (DRC ~73%)
- Australia, Philippines nickel each -20% to -26% YoY due to Indonesia price pressure

## 6. Gotchas

- **Nickel reported in contained metal**, not ore weight — shares comparable cross-country
- Indonesia's NPI (Class II, stainless) + HPAL/MHP (Class I, battery) aggregated as one "mine production" — MCS does NOT break out Class I vs. Class II. Footnote this for EV narratives.
- 2024/2025 figures = estimates, revised in MCS2027
- "W" (withheld) entries in smaller producers

## 7. Fetch

```bash
# Commodities_Data CSV (primary)
curl -sSL -o data-raw/usgs-minerals/MCS2026_Commodities_Data.csv \
  "https://www.sciencebase.gov/catalog/file/get/696a75d5d4be0228872d3bf8?name=MCS2026_Commodities_Data.csv"

# Full PDF
curl -sSL -o data-raw/usgs-minerals/mcs2026.pdf \
  "https://pubs.usgs.gov/periodicals/mcs2026/mcs2026.pdf"
```

Exact ScienceBase file URL needs verification — browse https://www.sciencebase.gov/catalog/item/696a75d5d4be0228872d3bf8 to get direct download link.
