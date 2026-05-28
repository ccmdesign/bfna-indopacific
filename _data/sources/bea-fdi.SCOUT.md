# BEA U.S. Direct Investment Abroad — Scout
Pulled: 2026-04-27

## 1. Source

**Landing:** https://www.bea.gov/international/di1usdbal
**2024 release:** https://www.bea.gov/news/2025/direct-investment-country-and-industry-2024
**Reporting countries guide (codes):** https://www.bea.gov/sites/default/files/2023-05/Guide-to-Reporting-Countries-on-BEA-Surveys.pdf

## 2. Files Pulled

| File | Size | Use |
|---|---|---|
| `usdia-detailedcountry-2009-2019.xlsx` | 87 KB | Position (historical-cost basis) by country, 2009–2019 |
| `usdia-detailedcountry-2020-2024.xlsx` | 55 KB | Position 2020–2024 |
| `usdia-ctrybyindfinancialtransactions-2010-2019.xlsx` | 125 KB | Financial-transaction flows by country × industry, 2010–2019 |
| `usdia-ctrybyindfinancialtransactions-2020-2024.xlsx` | 77 KB | Same, 2020–2024 |

**XLSX URL pattern:** `https://apps.bea.gov/international/xls/usdia-current/usdia-{tab}-{period}.xlsx`

## 3. Auth

None. Direct XLSX, no key, no login.

## 4. Tabs (per detailedcountry XLSX)

`Position | Financial transactions | Income | Notes` — same workbook serves position + flows + income.

## 5. Schema

- Country labels in column 0; years across columns (1 column per year)
- Units: **USD millions, historical-cost basis**
- Suppression markers: `(D)` = disclosure-suppressed; `(*)` = absolute value < $0.5M

## 6. ASEAN Coverage Verified (from pull)

| Country | Position 2010 ($M) | Position 2024 ($M) | Status |
|---|---|---|---|
| Singapore | (need 2024 — not in pulled data) | $467,621 (per BEA news release) | Full |
| Indonesia | 10,558 | (varies; 2014 $15.7B) | Full |
| Thailand | 12,999 | (2014 $18.1B) | Full |
| Malaysia | 11,791 | (2014 $14.6B) | Full |
| Philippines | 5,399 | (2014 $4.1B) | Full |
| Vietnam | 799 | (2014 $1.7B) | Full |
| Brunei | 103 | sparse | Suppressed often |
| Cambodia | 30 | sparse | Suppressed often |
| Laos | 0 | sparse | Suppressed often |
| Myanmar (Burma) | sparse | sparse | Suppressed often |

**Practical note:** SGP, IDN, THA, MYS, PHL, VNM are usable for time series. BRN, KHM, LAO, MMR will show as suppressed/zero — flag in viz.

## 7. Derived File

`bea-usdia-asean-2010-2024-detailedcountry.csv` — 300 rows, ASEAN-10 × (Position + Financial transactions) × 2010–2024 long format. Ready for join.

## 8. Re-fetch Commands

```bash
cd _process/asean/data-raw/bea-fdi
curl -sSL -o usdia-detailedcountry-2009-2019.xlsx \
  "https://apps.bea.gov/international/xls/usdia-current/usdia-detailedcountry-2009-2019.xlsx"
curl -sSL -o usdia-detailedcountry-2020-2024.xlsx \
  "https://apps.bea.gov/international/xls/usdia-current/usdia-detailedcountry-2020-2024.xlsx"
curl -sSL -o usdia-ctrybyindfinancialtransactions-2010-2019.xlsx \
  "https://apps.bea.gov/international/xls/usdia-current/usdia-ctrybyindfinancialtransactions-2010-2019.xlsx"
curl -sSL -o usdia-ctrybyindfinancialtransactions-2020-2024.xlsx \
  "https://apps.bea.gov/international/xls/usdia-current/usdia-ctrybyindfinancialtransactions-2020-2024.xlsx"
```

## 9. BEA API (fallback)

Free key registration: https://apps.bea.gov/api/signup/
Dataset `MNE`, table 31 (position by country):
```
https://apps.bea.gov/api/data?UserID={KEY}&method=GetData&datasetname=MNE&DirectionOfInvestment=outward&Classification=Country&Year=2010,...,2024&TableID=31&ResultFormat=JSON
```

## 10. Gotchas

- Historical-cost basis ≠ current-cost ≠ market-value. Don't mix series.
- `(D)` suppression real — countries with few US affiliates → cells hidden
- BEA includes equity + debt instruments; reinvested earnings split available in `Income` tab
- Singapore figures large but include US affiliates' regional headquarters serving wider Asia — annotate as "regional hub"
