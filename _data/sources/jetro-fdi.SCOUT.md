# JETRO Japan Outward FDI — Scout
Pulled: 2026-04-27

## 1. Source

**JETRO statistics hub:** https://www.jetro.go.jp/en/reports/statistics.html
**BOJ (upstream):** https://www.boj.or.jp/en/statistics/br/bop_06/bpdata/index.htm
**MOF (alt):** https://www.mof.go.jp/english/policy/international_policy/reference/balance_of_payments/ebpfdii.htm

## 2. Files Pulled

| File | Size | Use |
|---|---|---|
| `jetro_outward_fdi_flows_2025cy.xlsx` | 42 KB | Annual outward FDI flows 1983–2025 (USD millions) |
| `jetro_outward_fdi_stock_2024.xls` | 53 KB | Year-end positions 1996–2024 (USD millions) |

URLs:
- Flows: `https://www.jetro.go.jp/ext_images/en/reports/statistics/data/country1_e_25cy.xlsx`
- Stocks: `https://www.jetro.go.jp/ext_images/en/reports/statistics/data/24fdistock01_en.xls`

## 3. Auth

None.

## 4. Schema

- Wide format: rows = country/region, columns = years
- Units: **USD millions**
- Hierarchical: Asia → China / Hong Kong / ASEAN4 → individual countries
- Year columns include "r" suffix for revised values (e.g., `2024r`, `2025r`)
- "n.a." for unavailable cells (early years, smaller countries)
- Methodology break: BPM5 pre-2014, BPM6 from 2014 — flagged in source notes

## 5. ASEAN Coverage Verified (from pull, 2024)

| Country | 2024 Stock ($M) | 2024 Flow ($M) |
|---|---|---|
| Singapore | 124,526 | 13,678 |
| Thailand | 76,634 | 3,674 |
| Indonesia | 39,040 | 2,532 |
| Vietnam | 28,482 | 2,840 |
| Malaysia | 21,281 | 2,320 |
| Philippines | 17,927 | 770 |
| **Cambodia** | ❌ not individually reported | — |
| **Laos** | ❌ not individually reported | — |
| **Myanmar** | ❌ not individually reported | — |
| **Brunei** | ❌ not individually reported | — |

**4-country gap:** Cambodia, Laos, Myanmar, Brunei bundled into "Other ASEAN" — not separable in JETRO. For these: use **ASEANstats FDI by host × source** (`https://data.aseanstats.org/fdi-by-hosts-and-sources`) inverted — Japan as source, each ASEAN member as destination = same flows from receiver perspective.

## 6. Derived File

`jetro-japan-outward-fdi-asean-2010-2024.csv` — 180 rows, 6 ASEAN countries × (Flow + Stock) × 2010–2024 long format.

## 7. Headline (verified)

**Indonesia stock 2010 → 2024: $11.9B → $39.0B (3.3× growth).**
**Singapore Japan stock 2024: $124.5B** — Japan's largest single ASEAN partner by stock. SGP figures include regional-hub use.

## 8. Re-fetch Commands

```bash
cd _process/asean/data-raw/jetro-fdi
curl -sSL -o jetro_outward_fdi_flows_2025cy.xlsx \
  "https://www.jetro.go.jp/ext_images/en/reports/statistics/data/country1_e_25cy.xlsx"
curl -sSL -o jetro_outward_fdi_stock_2024.xls \
  "https://www.jetro.go.jp/ext_images/en/reports/statistics/data/24fdistock01_en.xls"
```

## 9. BOJ Fallback (if JETRO files restructure)

Annual flows pattern: `https://www.boj.or.jp/en/statistics/br/bop_06/bpdata/dif{YY}cy.xlsx` (e.g., `dif24cy.xlsx` = 2024)
Year-end positions: `https://www.boj.or.jp/en/statistics/br/bop_06/bpdata/dip{YYYY}.xlsx`
By type (2012–2024 single file): `https://www.boj.or.jp/en/statistics/br/bop_06/bpdata/diti.xlsx`

BOJ coverage starts 2014 (BPM6 only). For 2010–2013, JETRO file carries BPM5 values.

## 10. Gotchas

- BPM5 vs BPM6 series break at 2014 — not directly comparable without MOF bridge
- Cambodia/Laos/Myanmar/Brunei aggregated — must use ASEANstats inverted
- Year labels with "r" suffix (revised) — strip before int conversion
- Singapore stock includes regional hub — annotate
