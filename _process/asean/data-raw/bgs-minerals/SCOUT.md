# BGS World Mineral Production 2019–2023 — Scout
Scouted: 2026-04-24

## 1. Source

**Landing:** https://www.bgs.ac.uk/mineralsuk/statistics/world-mineral-statistics/
**Latest release:** https://www.bgs.ac.uk/news/latest-mineral-production-statistics-for-2019-to-2023-released/
**Archive (1913→):** https://www.bgs.ac.uk/mineralsuk/statistics/world-mineral-statistics/world-mineral-statistics-archive/

## 2. Best Download

| Asset | URL | Size |
|---|---|---|
| **Complete PDF 2019–2023** | https://nora.nerc.ac.uk/id/eprint/539285/1/WMP_2019-2023_COMPLETE.pdf | 2 MB |
| Interactive tool + per-commodity XLSX | https://www.bgs.ac.uk/mineralsuk/statistics/world-mineral-statistics/world-mineral-statistics-data-download/world-mineral-statistics-data/ | varies |
| OGC API (JSON) | https://ogcapi.bgs.ac.uk/collections/world-mineral-statistics | — |

## 3. Auth

None.

## 4. Coverage

- Latest volume: **2019–2023** (no 2024 yet — use USGS MCS2026 for 2024)
- 70+ commodities, country-by-country production
- Interactive tool: historical back to 1970 (some commodities to 1960)
- Trade data ends 2002 for most non-European countries — **production is primary use case**

## 5. Gotchas

- **Myanmar tin:** Wa State production post-2014 largely artisanal/ASM. BGS + USGS flag as estimated/uncertain. Government figures varied 40× across sources. Treat as floor estimate.
- **10% cross-check rule vs. USGS**: if BGS country sum deviates >10% from USGS global, row flagged/excluded. Datasets partially self-consistent but not identical.
- **Malaysia REEs**: BGS figures reflect processing/separation of monazite from tin tailings, not primary mining. Country share looks smaller than economic influence.

## 6. Fetch

```bash
curl -sSL -o data-raw/bgs-minerals/WMP_2019-2023_COMPLETE.pdf \
  "https://nora.nerc.ac.uk/id/eprint/539285/1/WMP_2019-2023_COMPLETE.pdf"
```

For XLSX pulls, use the interactive tool per commodity/country (no single bulk XLSX URL).
