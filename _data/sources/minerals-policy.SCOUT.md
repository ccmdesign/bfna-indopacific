# Minerals Policy Sources — Scout
Scouted: 2026-04-24

Reference/citation sources for Thesis B editorial frame. Not bulk datasets.

---

## 1. OECD Inventory of Export Restrictions on Industrial Raw Materials 2025

**Landing:** https://www.oecd.org/en/publications/oecd-inventory-of-export-restrictions-on-industrial-raw-materials-2025_facc714b-en.html
**Direct PDF:** https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/05/oecd-inventory-of-export-restrictions-on-industrial-raw-materials-2025_a16b8932/facc714b-en.pdf
**Press release:** https://www.oecd.org/en/about/news/press-releases/2025/05/export-restrictions-on-critical-raw-materials-rise-sharply-amid-growing-demand.html
**Companion data:** OECD.Stat links to underlying inventory dataset (CSV/XLSX)
**Released:** 12 May 2025; data through end 2023

**Cite-ready stats:**
- Export restrictions on industrial raw materials rose **more than fivefold 2009–2023** (confirmed exact phrasing)
- 2023 alone: ~3.4% more raw material products gained ≥1 restriction vs. end 2022
- **14% of global trade in non-waste industrial raw materials** faced ≥1 restriction (2021–2023 avg)
- **67% of cobalt trade** and **46% of REE trade** affected by ≥1 restriction

---

## 2. EU Critical Raw Materials Act — Regulation (EU) 2024/1252

**EC page:** https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials/critical-raw-materials-act_en
**EUR-Lex text:** https://eur-lex.europa.eu/eli/reg/2024/1252/oj/eng
**JRC Annex I list:** https://rmis.jrc.ec.europa.eu/critical-and-strategic-materials
**In force:** 23 May 2024

**2030 benchmarks (EU annual consumption):**
- Extraction: ≥**10%**
- Processing: ≥**40%**
- Recycling: ≥**25%**
- Single-country cap: ≤**65%** from one third country

**Annex I — 17 Strategic Raw Materials:**
Bauxite/Alumina/Aluminium, Bismuth, Boron (metallurgy grade), Cobalt, Copper, Gallium, Germanium, **Graphite (battery grade)**, **Lithium (battery grade)**, Magnesium metal, Manganese (battery grade), **Nickel (battery grade)**, Platinum group metals, Rare earths for magnets, Silicon metal, Titanium metal, Tungsten

---

## 3. Indonesia ESDM / MEMR — Nickel Quota (RKAB 2025)

**Regulation:** **ESDM Ministerial Regulation No. 17 of 2025** — Procedures for Preparation, Submission, and Approval of Work Plans and Budgets. Effective **3 October 2025**. Governs 2026 RKAB cycle, reverts to annual approvals (from multi-year).

**RKAB = Rencana Kerja dan Anggaran Biaya** — annual mining Work Plan and Budget required per IUP/IUPK licence. ESDM approval sets legal production quota.

**Primary coverage URLs:**
- Carbon Credits: https://carboncredits.com/indonesian-government-reduces-national-nickel-mining-quotas-by-120-million-tons-impacting-global-supply/
- S&P Global: https://www.spglobal.com/energy/en/news-research/latest-news/metals/122925-indonesia-navigates-nickel-market-with-output-cuts-policy-shifts
- SMM Analysis: https://www.metal.com/en/newscontent/103558390

**Cite-ready numbers:**
- **2024 approved quota: 272 Mt → 2025 quota: 150 Mt → cut: 122 Mt (~44% reduction, "unprecedented")**
- "120 Mt" figure widely cited is rounded; exact = 122 Mt
- 2026 RKAB target set at ~250 Mt (vs. 379 Mt targeted under 2025 RKAB)

---

## 4. Malaysia — JMG & Lynas LAMP

**JMG stats:** https://jmg.gov.my/en/component/rsfiles/files?folder=media&Itemid=437
**Open data:** https://archive.data.gov.my/data/en_US/organization/jabatan-mineral-dan-geosains-malaysia-jmg
**Lynas LAMP:** https://lynasrareearths.com/kuantan-malaysia-2/
**Lynas FY2024 AR:** https://www.annualreports.com/HostedData/AnnualReports/PDF/ASX_LYC_2024.pdf

**Cite-ready FY2024 (ends 30 June 2024):**
- **NdPr production: 5,655 t** (down 8% from 6,142 t FY2023; major-works program)
- Total REO production: 10,908 t
- Separation capacity post-upgrade: ~10,500 t/yr NdPr family
- LAMP processes **12–15% of world's REEs** (Lynas facility-level claim)
- FY2024 milestone: **first Dysprosium + Terbium oxide production** at LAMP (heavy REEs, not just NdPr)
- Kalgoorlie (Australia) MREC shipments to LAMP commenced Jun 2024 quarter

**Gotcha:** JMG granular 2024 stats not yet in English; open data portal historicals through 2022–2023.

---

## 5. Fetch

```bash
# OECD Inventory 2025 PDF
curl -sSL -o data-raw/minerals-policy/OECD-Inventory-Export-Restrictions-2025.pdf \
  "https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/05/oecd-inventory-of-export-restrictions-on-industrial-raw-materials-2025_a16b8932/facc714b-en.pdf"
```
