# BACI HS6 Critical-Minerals Bilateral Trade — Scout & Pull
Pulled: 2026-04-27

## 1. Source

Same as `baci-trade/`: CEPII BACI HS07 V202601 (1.68 GB ZIP). Re-pulled to `/tmp/baci-pull/`, filtered, deleted ZIP.

## 2. Filter Applied

15 critical-mineral HS6 codes × ASEAN-10 × 16 partners (USA, CHN, JPN, KOR, EU-9, GBR, CAN, AUS, IND) × 2010–2024.

| HS6 | Mineral |
|---|---|
| 260400 | Nickel ore |
| 260500 | Cobalt ore |
| 720260 | Ferronickel |
| 750110 | Nickel matte |
| 750120 | Nickel oxide sinter |
| 750210 | Refined (unalloyed) nickel |
| 760100 | Unwrought aluminum |
| 282736 | Nickel sulfate (battery) |
| 283329 | Other sulfates |
| 250410 | Natural graphite |
| 253090 | Other minerals (Li-bearing) |
| 283691 | Lithium carbonate |
| 260300 | Copper ore |
| 261390 | Molybdenum ore |
| 261210 | Uranium ore |

## 3. Output

`baci-asean-minerals-bilateral-2010-2024.csv` — 8845 rows.

Columns: `t` (year), `hs6`, `i` (exporter ISO numeric), `j` (importer ISO numeric), `trade_usd_thousands`, `qty_tons`, `i_iso3`, `j_iso3`, `mineral` (label).

## 4. Headline Insights (verified from pull)

**Indonesia 2024 nickel-product exports total: $21.0B**
(2010: $2.89B → 2024: $21.0B = 7.3× growth)

**Where Indonesia's nickel goes — 2024 destinations ($M):**
| Destination | Ferronickel | Nickel matte | Sinter | Refined | Total |
|---|---|---|---|---|---|
| **China** | 12,560 | 2,107 | 3,983 | 324 | **~18,974** |
| Japan | 0 | 1,045 | 0 | 15 | 1,060 |
| UK | 38 | 0 | 351 | 6 | 395 |
| Korea | 201 | 0 | 30 | 51 | 282 |
| Netherlands | 50 | 135 | 0 | 19 | 204 |
| EU-rest combined | ~95 | 0 | 18 | 11 | ~125 |
| **USA** | 0 | 0 | 1 | 15 | **16** |

**Counter-narrative for Thesis B:** the literal flow is ASEAN → China, NOT ASEAN → West. China refines + intermediates and re-exports refined material to the West. Single hop in the Sankey will misrepresent. **Two-hop visualization required.**

**Year-over-year Indonesia nickel total ($B):**
2010: 2.9 · 2014: 2.2 · 2019: 5.1 · 2020: 5.9 · 2021: 8.4 · 2022: 19.0 · 2023: 21.8 · 2024: 21.0

The 2021→2022 jump = downstream-processing push (Indonesia 2020 ore export ban + smelter capacity online).

## 5. Re-run Commands

Re-pull BACI to /tmp + run `notebooks/baci_minerals_filter.py` (to be written) to regenerate.

For ad-hoc DuckDB:

```sql
SELECT t, k AS hs6, i, j, SUM(v) trade_usd_thousands, SUM(TRY_CAST(q AS DOUBLE)) qty_tons
FROM read_csv(['BACI_HS07_Y' || y || '_V202601.csv' for y in 2010..2024], header=true)
WHERE k IN (260400,260500,720260,750110,750120,750210,760100,282736,283329,
            250410,253090,283691,260300,261390,261210)
  AND ((i IN (10 ASEAN codes) AND j IN (16 partner codes)) OR reverse)
GROUP BY t, k, i, j
```

## 6. Gotchas

- **Indonesia 2020 ore-export ban discontinuity:** HS 260400 from Indonesia drops to ~zero post-2020; same metal reappears as HS 750110/750120 (intermediates). Annotate this kink in any time-series chart.
- **Singapore as transit:** SG figures include re-exports. CHRTD reconciliation is better here; BACI partial-corrects via reliability weighting but not perfect.
- **HS code aggregation:** Ferronickel (720260) is steel-grade (Class II), used for stainless steel — NOT batteries. Refined nickel (750210) + matte (750110) + sinter (750120) + sulfate (282736) = battery-grade chain (Class I). Split labels in viz.
- **Two-hop reality:** ASEAN → China → West. Map needs to show both hops; one-hop "ASEAN to West" will mislead.

## 7. Fallback (Chatham House when email returns)

Once Chatham House delivers reconciled CHRTD slice, cross-check our BACI numbers. CHRTD's reconciliation is methodologically stronger for resolving the SG/HK re-export distortion. BACI's reliability-weighted method is faster and free.
