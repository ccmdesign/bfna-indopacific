# BACI Trade Data Scout
Scouted: 2026-04-24

## 1. Best Access Method

Direct download — no auth, no signup. Open license (Etalab 2.0, attribution required).

- **HS17 (2017–2024):** https://www.cepii.fr/DATA_DOWNLOAD/baci/data/BACI_HS17_V202601.zip
- **HS07 (2007–2024):** https://www.cepii.fr/DATA_DOWNLOAD/baci/data/BACI_HS07_V202601.zip
- **HS22 (2022–2024):** https://www.cepii.fr/DATA_DOWNLOAD/baci/data/BACI_HS22_V202601.zip
- Release: **V202601**, published 2026-01-22

No CEPII API. OEC Bot Market re-sells BACI via API ($0.01/query, 1,000-row cap) — not useful for bulk.

**Recommended:** HS07 covers 2007–2024 in one ZIP → the single-download path for our 2010–2024 window. Alternatively HS17 (2017–2024) + HS07 (2010–2016) for stricter nomenclature consistency.

---

## 2. File Size and Format

- Format: ZIP of per-year CSVs + country/product metadata files
- HS17 total unzipped: ~943 MB, ~79M rows across 8 years (~120 MB/year unzipped)
- HS92 full history (1995–2024): ~2.4 GB — avoid
- **Do NOT open in Excel.** Use DuckDB, pandas, or R data.table.

---

## 3. Auth Required

None. Public download.

---

## 4. Coverage

V202601 covers through **2024** across all HS revisions. No lag — 2024 confirmed present as of 2026-01-22. Our 2010–2024 window fully covered.

---

## 5. Filter Strategy

**Schema per row:** `t` (year) · `k` (HS6 code) · `i` (exporter ISO numeric 3-digit) · `j` (importer ISO numeric) · `v` (USD thousands) · `q` (metric tons).

**ISO numeric codes for 5×5 matrix:**

| Country | Code | Country | Code |
|---|---|---|---|
| USA | 842 | Indonesia | 360 |
| China | 156 | Thailand | 764 |
| Japan | 392 | Malaysia | 458 |
| South Korea | 410 | Singapore | 702 |
| EU | see §8 | Vietnam | 704 |

**DuckDB filter (per year file; aggregates HS6 to country-pair totals):**

```sql
SELECT t, i, j, SUM(v) AS trade_usd_thousands
FROM read_csv('BACI_HS17_Y2023_V202601.csv')
WHERE (i IN (842,156,392,410) AND j IN (360,764,458,702,704))
   OR (i IN (360,764,458,702,704) AND j IN (842,156,392,410))
GROUP BY t, i, j;
```

Loop over year files 2010–2024. Output: ≤40 rows/year. BACI ships no pre-aggregated totals — `SUM(v) GROUP BY i,j` across all `k` values required.

---

## 6. Product-Level Need

Country totals sufficient for fault-line/hedging thesis. HS chapter breakdowns optional for "what's traded" annotation layer. Pre-filter `WHERE LEFT(k,2) IN ('85','84','27')` (semiconductors, machinery, fuels) before grouping.

---

## 7. Alternative: UN Comtrade API

Not recommended as primary. Requires free registration + API key. Free tier: 500 calls/day, 100K rows/call. Feasible for 5×5×15yr with batching but BACI local-filter is faster, needs no account, already reconciled. Use Comtrade only for spot-check or pre-2007 data.

---

## 8. Gotchas

**Reporter/partner reconciliation:** BACI already reconciles mirror flows via reliability-weighted averaging. No manual reconciliation needed — BACI's core value-add over raw Comtrade.

**Singapore entrepot distortion:** BACI does NOT cleanly strip SGP re-exports (~30–40% of recorded SGP imports are re-exports — petroleum, electronics). SGP bilateral figures overstate final-destination consumption. Label as "trade through Singapore" in methodology notes.

**Hong Kong:** BACI drops HK re-export adjustments; HKG flows underreported. Not in 5×5 but relevant for EU supply-chain routing via HK.

**EU has no single BACI code:** EU is not a Comtrade reporter as a bloc. Proxy: sum DE (276) + FR (251) + NL (528) + IT (380), label "EU-4" with footnote. Full EU requires ~27 member codes in `IN (...)` clause.

**Missing reporters:** BACI fills gaps via partner mirror data with downweighting. IDN, THA, MYS, VNM generally reliable post-2010. Cross-check with `country_codes_V202601.csv` inside each ZIP.

---

## Next action

1. `curl -I` the HS07 ZIP to confirm current size
2. Download if ≤500MB to `_process/asean/data-raw/baci-trade/BACI_HS07_V202601.zip`
3. Extract year files for 2010–2024 only
4. Run DuckDB filter → output `baci-asean-bilateral-totals-2010-2024.csv`
