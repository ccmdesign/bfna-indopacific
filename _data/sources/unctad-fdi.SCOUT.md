# UNCTAD FDI Scout — ASEAN Bilateral Data

Scouted: 2026-04-24

## Verdict

UNCTADstat does NOT carry current bilateral FDI by country pair. `US.FdiFlowsStock`
is aggregate inward/outward per economy — no partner dimension. UNCTAD's old bilateral
publication (2001–2012 Excel workbooks) is discontinued. For US/China/EU/Japan/Korea →
ASEAN bilateral FDI, the correct primary source is the **IMF DIP** (formerly CDIS).

---

## 1. UNCTADstat — What Exists

**Aggregate dataset (no bilateral)**
- Viewer: https://unctadstat.unctad.org/datacentre/dataviewer/US.FdiFlowsStock
- Coverage: Inward/outward flows + stocks, ~200 economies, 1970–~2023
- Format: CSV/XLSX via browser UI; free account to export; no public API or bulk URL
- No partner-country dimension — cannot produce US→Indonesia or China→Vietnam pairs

**Old bilateral publication (discontinued)**
- URL: https://unctad.org/en/Pages/DIAE/FDI%20Statistics/FDI-Statistics-Bilateral.aspx
- Coverage: 2001–2012 only, per-country Excel workbooks
- Contact for custom requests: fdistat@unctad.org

---

## 2. Primary Source: IMF DIP (formerly CDIS)

**Dataset page:** https://data.imf.org/en/datasets/IMF.STA:DIP
**Legacy entry:** https://data.imf.org/CDIS
**Coverage:** Annual bilateral direct investment **positions (stocks)**, 2009–2023;
~110 reporting economies × counterpart economies; IDN, THA, MYS, SGP, VNM all
report inward positions by source country (USA, JPN, KOR; CHN partial via mirror data)
**Format:** Browser export CSV/XLSX; SDMX-JSON API (no auth required)
**API base:** http://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData/DIP/
Rate limit: 10 req/5 s; max 3000 series per call
**Auth:** None

**Gotchas:**
- DIP measures **stocks**, not annual flows. For flows, use OECD FDI_FLOW_PARTNER.
- China does not consistently report outward positions to IMF. Use mirror data
  (derived from what ASEAN hosts report as Chinese-source inward). Label clearly.
- Singapore and Malaysia figures include SPE/pass-through FDI; watch for
  SPE-adjusted series flags.
- 2024 data expected ~mid-2025; current ceiling is 2023.

---

## 3. Supplementary Sources

| Source | URL | Best for |
|---|---|---|
| OECD FDI by Partner | https://stats.oecd.org/Index.aspx?DataSetCode=FDI_FLOW_PARTNER | Annual **flows** AND stocks from OECD reporters (US, JP, KR, EU) 1982–2023 |
| WIR 2024 Annex 1 | https://unctad.org/system/files/official-document/wir2024_annex-1_en.pdf | Aggregate flows 2018–2023 (totals verification) |
| WIR 2024 Annex 2 | https://unctad.org/system/files/official-document/wir2024_annex-2_en.pdf | Aggregate stocks 2000–2023 (totals verification) |
| World Bank Harmonized | https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099800006252213235 | Combined UNCTAD+CDIS+OECD; ~2019 ceiling; research baseline |

---

## 4. Filter Strategy for IMF DIP

1. Open https://data.imf.org/en/datasets/IMF.STA:DIP
2. Select "Inward Direct Investment Positions by Counterpart Economy"
3. Reporting economies: IDN, THA, MYS, SGP, VNM
4. Counterpart: USA, CHN, JPN, KOR, + EU members (DEU, FRA, NLD largest)
5. Years: 2009–2023 → export CSV (expected <300 KB for 5 hosts)

OECD FDI_FLOW_PARTNER fills the flows dimension for non-China sources.

---

## 5. Sample File

Not downloaded — no pre-filtered small file at stable URL. IMF DIP browser export
for 5 ASEAN hosts will be well under 2 MB.

Illustrative SDMX API call (verify dimension key order before production use):
http://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData/DIP/A.IDN+THA+MYS+SGP+VNM.?startPeriod=2009&endPeriod=2023

---

## Next action

Manual browser export from IMF DIP for the 5×5 slice. Save CSV here as `imf-dip-asean-inward-2009-2023.csv`.
