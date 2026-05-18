# WDI Scout — ASEAN Great-Power Infographic
Scouted: 2026-04-24 | API `lastupdated`: 2026-04-08

## 1. Access Method

WDI REST API v2 — no auth, no rate limits for moderate pulls.

Base pattern:

```
https://api.worldbank.org/v2/country/{ISO3_LIST}/indicator/{IND_LIST}?date=2000:2024&format=json&per_page=2000&source=2
```

Multi-country and multi-indicator via semicolons. Max 60 indicators; 1,500-char path limit (15 countries = ~57 chars, well within).

Python: `pip install wbgapi` (v1.0.14, Feb 2026) — WB-authored, auto-paginates, returns DataFrames.

## 2. Indicator Codes

| Indicator | Code |
|---|---|
| GDP (current USD) | `NY.GDP.MKTP.CD` |
| GDP per capita (current USD) | `NY.GDP.PCAP.CD` |
| Population, total | `SP.POP.TOTL` |
| Trade (% of GDP) | `NE.TRD.GNFS.ZS` |
| FDI net inflows (current USD) | `BX.KLT.DINV.CD.WD` |
| GDP constant 2015 USD (time trends) | `NY.GDP.MKTP.KD` |

## 3. Country Codes

ASEAN-10: `BRN;KHM;IDN;LAO;MYS;MMR;PHL;SGP;THA;VNM`
Partners:  `USA;CHN;EUU;JPN;KOR`

EU = `EUU` (World Bank aggregate, confirmed populated 2000–2024).
Composition: 15 (2000) → 25 (2004) → 27 (2007) → 28 (2013) → 27 (2020, post-Brexit).

## 4. Full Pull — Single API Call

```
https://api.worldbank.org/v2/country/BRN;KHM;IDN;LAO;MYS;MMR;PHL;SGP;THA;VNM;USA;CHN;EUU;JPN;KOR/indicator/NY.GDP.MKTP.CD;NY.GDP.PCAP.CD;SP.POP.TOTL;NE.TRD.GNFS.ZS;BX.KLT.DINV.CD.WD?date=2000:2024&format=json&per_page=2000&source=2
```

~1,875 records (15 × 5 × 25, minus Myanmar trade nulls). Single page at per_page=2000. Check `response[0].pages == 1`; if >1, paginate with `&page=N`.

## 5. Sample Pull

See `sample.json` — Indonesia GDP (current USD) 2020–2024, live-tested 2026-04-24.

Response is 2-element JSON array: `[metadata_object, data_records_array]`.
Key record fields: `countryiso3code`, `date`, `value`, `indicator.id`.

## 6. Gotchas

| Issue | Detail |
|---|---|
| **Myanmar Trade NULL** | `NE.TRD.GNFS.ZS` null for MMR all years 2000–2024. WDI does not carry it. Use UN Comtrade or IMF DOT instead. |
| **Myanmar GDP** | Nominal MER post-2021 overstates capacity given kyat collapse. Cross-check IMF WEO. Add caveat. |
| **EU composition** | EUU = 28 through 2019 (incl. UK), 27 from 2020. Not directly comparable across Brexit break. Flag in footnotes. |
| **Nominal vs. real** | `NY.GDP.MKTP.CD` = current USD. Pull `NY.GDP.MKTP.KD` (constant 2015 USD) for time-trend charts. |
| **PPP vs. MER** | MER for trade/financial power comparisons; PPP (`NY.GDP.MKTP.PP.CD`) for welfare. Label explicitly. |
| **2024 coverage** | Most countries have 2024 data as of 2026-04-08. Small economies may stop at 2023. Verify in full pull. |

## Next action

Run the full-pull URL, save JSON to `wdi-full-2000-2024.json`, then flatten to CSV.
