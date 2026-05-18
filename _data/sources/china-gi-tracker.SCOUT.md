# China Global Investment Tracker (CGIT) — Scout Report
**Date:** 2026-04-24
**Project:** BFNA Indo-Pacific — ASEAN Great-Power Competition Infographic

## 1. Source & Download URLs

**Landing page:** https://www.aei.org/china-global-investment-tracker/
**Publisher:** AEI + Heritage Foundation. Maintained by Derek Scissors.

**Confirmed public XLSX downloads (no auth):**

| Release | Direct URL | Size |
|---|---|---|
| **2023 Fall** ← use this | https://aei.org/wp-content/uploads/2024/01/China-Global-Investment-Tracker-2023-Fall-1.xlsx | 684 KB |
| 2022 Fall (comparison) | https://aei.org/wp-content/uploads/2023/02/China-Global-Investment-Tracker-2022-FALL-1.xlsx | 645 KB |

**2024 full-year release (Jan 2026):** Announced (tweet: https://x.com/DerekScissors1/status/1881734528559194137; graphic: https://www.aei.org/wp-content/uploads/2025/01/China-Tracker-Investment-Graphic-January-2026.pdf) but XLSX not at any discoverable public URL as of 2026-04-24. Request from Derek Scissors (scissors@aei.org).

## 2. File Format & Row Counts

Single XLSX, ~684 KB (2023-Fall). Three tabs:

| Tab | Approx rows | Notes |
|---|---|---|
| Investments | ~1,700 | Equity M&A + greenfield FDI |
| Construction | ~1,800 | EPC / construction contracts |
| Troubled | ~300 | Cancelled/disputed deals |

## 3. Coverage

- **Years:** 2005–2023 (XLSX) / 2005–2024 (full release, email Scissors)
- **Threshold:** ~$95–100M minimum. AEI reports say "$95M floor"; tracker page says "$100M." Use $100M for planning.
- **ASEAN all 10** present. By value 2018–2024: Indonesia + Vietnam ~56%, Thailand ~18%, Malaysia ~14%. Singapore/Philippines/Myanmar/Cambodia/Laos/Brunei present but sparse.

## 4. Key Fields

**Investments:** `Year | Month | Investor | Quantity in Millions (USD) | Share Size (%) | Transaction Partner | Sector | Subsector | Country | Region | BRI | Greenfield`

**Construction:** Same minus Greenfield.

**Troubled:** Same as Investments minus Share Size.

No "completed" flag — all records announced/in-progress.

## 5. Filter Strategy

```
1. Open 2023-Fall XLSX (this dir) or request 2024-Fall from Scissors
2. Investments tab → Country IN {10 ASEAN members}
3. Construction tab → same Country filter
4. Group by Country + Year → sum(Quantity in Millions)
5. Keep Investments and Construction as SEPARATE series (different phenomena)
6. BRI=TRUE → BRI-specific sub-series
7. Sector breakdown: Energy, Transport, Metals, Real Estate, Agriculture, Technology
8. Join Troubled tab on entity+year for deal-quality annotation
9. 3- or 5-year rolling average to smooth lumpy annual deal flow
```

## 6. Gotchas

**$100M floor:** Sub-threshold Chinese manufacturing FDI invisible. Vietnam + Cambodia host many factories below this. Supplement with Rhodium Group CBM or UNCTAD for small-deal context.

**Announced ≠ completed:** Recorded at announcement. Some never close; capital lags 2–4 years.

**Singapore as transit hub:** SG appears both as genuine FDI destination AND as SPV routing node. SG figures inflated, downstream-country figures understated. Annotate SG as "includes regional hub flows."

**Hong Kong entities:** Pre-2020 some Chinese firms invested via HK-domiciled vehicles. Check Investor field.

## 7. CGIT vs. AidData GCDF Reconciliation

| Dimension | CGIT | AidData GCDF |
|---|---|---|
| Captures | Commercial M&A + EPC construction (≥$100M) | Official development finance (loans, grants, guarantees) |
| State role | Mixed — SOEs + private | Explicitly official-sector only |
| Deal floor | ~$100M | None |
| ASEAN strength | Indonesia, Vietnam, Malaysia, Thailand | Cambodia, Myanmar, Laos, Vietnam |
| **Overlap risk** | CDB-funded road (GCDF) + CCCC build contract (CGIT) = 2 records, 1 project | Deduplicate by project name + country + year |
| CGIT-only | Private M&A (Alibaba, Tencent, Didi) | — |
| GCDF-only | Small concessional loans, TA, debt swaps | — |

**Infographic rule:** CGIT as "commercial investment & construction" layer; GCDF as "development finance" layer. Never sum — double-counting on large BRI infra.

## 8. Downloaded File

`china-global-investment-tracker-2023-fall.xlsx` (684 KB) — saved in this dir.
Source: https://aei.org/wp-content/uploads/2024/01/China-Global-Investment-Tracker-2023-Fall-1.xlsx

## Sources

- AEI CGIT: https://www.aei.org/china-global-investment-tracker/
- AEI 20-year: https://www.aei.org/research-products/report/2-5-trillion-20-years-of-chinas-global-investment-and-construction/
- AEI 2025: https://www.aei.org/research-products/report/steady-not-soaring-chinese-investment-in-2025/
- Release tweet: https://x.com/DerekScissors1/status/1881734528559194137
- ChinaPower CSIS: https://chinapower.csis.org/data/china-global-investment-tracker/
- R package fields: https://knapply.github.io/bluesky/reference/cgit.html
