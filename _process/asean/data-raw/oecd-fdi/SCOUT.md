# OECD FDI by Counterpart Area (BMD4) — Scout
Scouted + pulled: 2026-04-27

## 1. Source

**Landing:** https://data-explorer.oecd.org/
**SDMX API base:** https://sdmx.oecd.org/public/rest/

**Dataflows used:**
| ID | Use |
|---|---|
| `OECD.DAF.INV,DSD_FDI@DF_FDI_FLOW_CTRY,1.0` | **FDI flows by counterpart area, BMD4** |
| `OECD.DAF.INV,DSD_FDI@DF_FDI_POS_CTRY,1.0` | **FDI positions (stocks) by counterpart area, BMD4** |

Other available: `DF_FDI_INC_CTRY` (income), `DF_FDI_AGGR_SUMM` (simplified aggregates), `DF_FDI_FLOW_IND` (by industry).

## 2. Auth

None. SDMX-CSV public API.

## 3. Pulled Files

| File | Rows | Use |
|---|---|---|
| `oecd-fdi-flows-asean-2010-2024.csv` | 1440 | OECD-12 reporters → ASEAN-10, annual flows 2010–2024 |
| `oecd-fdi-positions-asean-2010-2024.csv` | 1400 | Same scope, year-end stocks |

## 4. SDMX Key Used

13 dimensions in DSD order:
`REF_AREA . MEASURE . UNIT_MEASURE . MEASURE_PRINCIPLE . ACCOUNTING_ENTRY . TYPE_ENTITY . FDI_COMP . SECTOR . COUNTERPART_AREA . LEVEL_COUNTERPART . ACTIVITY . FREQ . FDI_COLLECTION_ID`

Filter:
- REF_AREA: `USA+JPN+KOR+DEU+FRA+NLD+ITA+ESP+BEL+POL+SWE+GBR` (12 OECD reporters)
- MEASURE: `T_FA_F` (flows total) / `LE_FA_F` (positions total)
- UNIT_MEASURE: `USD_EXC` (USD exchange-rate converted)
- MEASURE_PRINCIPLE: `DO` (directional outward — partner gets the investment)
- ACCOUNTING_ENTRY: `NET_FDI`
- TYPE_ENTITY: `ROU` (resident operating units, **excludes SPEs**)
- FDI_COMP: `D` (total direct investment)
- SECTOR: `S1` (total economy)
- COUNTERPART_AREA: `BRN+KHM+IDN+LAO+MYS+MMR+PHL+SGP+THA+VNM` (ASEAN-10)
- LEVEL_COUNTERPART: `IMC` (immediate counterpart)
- ACTIVITY: `_T` (all activities)
- FREQ: `A` (annual)
- FDI_COLLECTION_ID: blank
- TIME_PERIOD: 2010–2024

## 5. Fetch Commands (re-runnable)

```bash
# Flows
URL_FLOWS="https://sdmx.oecd.org/public/rest/data/OECD.DAF.INV,DSD_FDI@DF_FDI_FLOW_CTRY,1.0/USA+JPN+KOR+DEU+FRA+NLD+ITA+ESP+BEL+POL+SWE+GBR.T_FA_F.USD_EXC.DO.NET_FDI.ROU.D.S1.BRN+KHM+IDN+LAO+MYS+MMR+PHL+SGP+THA+VNM.IMC._T.A./?startPeriod=2010&endPeriod=2024&format=csvfilewithlabels"
curl -sSL -o data-raw/oecd-fdi/oecd-fdi-flows-asean-2010-2024.csv "$URL_FLOWS"

# Positions
URL_POS="https://sdmx.oecd.org/public/rest/data/OECD.DAF.INV,DSD_FDI@DF_FDI_POS_CTRY,1.0/USA+JPN+KOR+DEU+FRA+NLD+ITA+ESP+BEL+POL+SWE+GBR.LE_FA_F.USD_EXC.DO.NET_FDI.ROU.D.S1.BRN+KHM+IDN+LAO+MYS+MMR+PHL+SGP+THA+VNM.IMC._T.A./?startPeriod=2010&endPeriod=2024&format=csvfilewithlabels"
curl -sSL -o data-raw/oecd-fdi/oecd-fdi-positions-asean-2010-2024.csv "$URL_POS"
```

## 6. Coverage Verified

**Reporters with non-null data for ASEAN partners:** Belgium, France, Germany, Italy, Korea, Netherlands, Poland, Spain, Sweden, UK (10 of 12).

**Reporters with all-NaN values (SPE-exclusion gap):**
- **USA**: 60 rows present, OBS_VALUE = NaN throughout. US BEA Direct Investment data does not feed into OECD's ROU (non-SPE) cut for ASEAN partners.
- **Japan**: same pattern. JPN reports under `ALL` (all resident units), not under `ROU` for these counterparts.

**Workaround for US + Japan:**
- US → use **BEA Direct Investment by Country and Industry**: https://www.bea.gov/data/intl-trade-investment/direct-investment-country-and-industry
- Japan → use **JETRO Statistics** (BOJ/MOF source): https://www.jetro.go.jp/en/reports/statistics.html

These are listed in `data-sources.md` Part 2 already.

## 7. Schema (44 cols, key ones)

| Col | Use |
|---|---|
| `REF_AREA` / `Reference area` | Reporter ISO3 / name |
| `COUNTERPART_AREA` / `Counterpart area` | Partner ISO3 / name |
| `TIME_PERIOD` | Year |
| `OBS_VALUE` | Value in USD millions |
| `MEASURE` / `Measure` | T_FA_F (flows) / LE_FA_F (positions) |
| `MEASURE_PRINCIPLE` | DO (outward) |
| `TYPE_ENTITY` | ROU (excl SPE) |
| `OBS_STATUS` | A=normal; suppressed/null otherwise |
| `UNIT_MULT` | 6 (millions) |
| `CURRENCY` | USD |

## 8. Headline (verified from pull)

**Korea outward FDI cumulative flows 2010–2024 to ASEAN-10:** Singapore $51.6B, Vietnam $35.9B, Indonesia $14.9B, Malaysia $4.6B, Myanmar $3.6B, Thailand $3.3B, Cambodia $2.8B. Confirms Korea–Vietnam corridor as second-largest after Korea–Singapore (where SG figures include hub flows).

**Netherlands outward FDI flows to Singapore 2010–2024:** $40.4B (largest single EU member → ASEAN partner pair) — but Singapore-as-hub distortion applies.

**Germany outward FDI positions in Singapore (2024):** $16.1B — direct presence vs. hub use unclear without SPE-adjusted view.

## 9. Gotchas

- **US + Japan all NaN in ROU cut** — see §6 for workarounds
- **Korea reports under directional-outward (DO)** — values reflect the Korean OUTWARD-investor view, not ASEAN-host inward. For ASEAN-host perspective, IMF DIP is needed (see `unctad-fdi/SCOUT.md`)
- **Singapore figures inflated by hub/SPV use** — ROU filter excludes SPEs but doesn't catch all pass-through. Annotate "includes regional hub flows" in viz
- **Negative values are real** — represent net divestment, equity withdrawal, debt repayment. Don't filter to positive-only for cumulative tallies
- **ESP/POL/SWE coverage thin** — many cells suppressed for low-significance pairs

## 10. Next action

Cross-join with IMF DIP (ASEAN-host inward perspective) once that's manually exported. Together they give: OECD = OECD-reporter outward to ASEAN; IMF DIP = ASEAN-reporter inward from world. Reconciliation gives "OECD-investment view" + "ASEAN-host view" check.
