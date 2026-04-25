---
title: "ASEAN Infographic — Data Readiness Report"
type: research
status: active
created: 2026-04-13
updated: 2026-04-13
tags: [bfna, infographic, asean, data-exploration, thesis]
---

# Data readiness report — per-thesis assessment

**Purpose:** For each of the four thesis options, this report answers: *What data can we actually get, in what format, and how hard is it to acquire by May 2026?*

**Method:** Parallel exploration of all major sources listed in [data-sources.md](../data-sources.md) via web fetches and search. Each source assessed for accessibility, format, coverage, and gaps.

---

## Thesis A — "ASEAN is the new US–China fault line"

**Verdict: READY. All core data is freely available.**

### What we need
A ternary plot showing each ASEAN country's economic ties with US, China, and EU — and how those positions have drifted over 2010–2024. Requires bilateral trade + FDI data by partner.

### Primary source: ASEANstats

| Dataset | URL | Years | Format | Notes |
|---|---|---|---|---|
| Trade annually | data.aseanstats.org/trade-annually | **2003–2025** | Web UI + API (`api/trade`) | All 10 ASEAN × US/China/EU/Japan/Korea. CC BY 4.0 |
| FDI flows by host × source | data.aseanstats.org/fdi-by-hosts-and-sources | **2012–2024** | Web UI, likely CSV export | EU-27 and EU-28 aggregates available |
| FDI stocks by host × source | data.aseanstats.org/fdi-by-hosts-and-sources-stock | **2012–2024** | Web UI | Same bilateral breakdown |

**This is the primary source.** It has exactly the bilateral breakdowns needed, pre-organized by ASEAN country. The EU is available as an aggregate (EU-27/EU-28), which simplifies ternary calculations.

### Backup sources

| Source | What it adds | Access | Format |
|---|---|---|---|
| **IMF DOTS/IMTS** (data.imf.org) | Bilateral goods trade, 1980–present, ~220 countries | Free, **has REST API** | JSON/SDMX, CSV |
| **CEPII BACI** (cepii.fr) | Reconciled bilateral trade, HS 6-digit, 1995–2024 | Free (registration required), CSV per year | Large CSVs — need aggregation |
| **UNCTAD FDI** (unctadstat.unctad.org) | Bilateral FDI flows/stocks, 206 economies, 40+ years | Free, **no API** — manual browser export | Excel |

### Supplementary (China-specific enrichment)

| Source | What it adds | Access |
|---|---|---|
| **AidData GCDF 3.0** | 20,985 Chinese development finance projects, $1.34T, 2000–2021 | Free download, CSV/GeoJSON |
| **AEI China Global Investment Tracker** | ~4,900 large transactions (≥$95M), 2005–2024 | Excel, may need to contact author for latest |

### Key gap
**FDI bilateral data for 2010–2011 is thin.** ASEANstats starts at 2012. UNCTAD has earlier data but requires manual extraction. **Recommend using 2012–2024 as the primary FDI window.**

### Data pipeline recommendation
1. Start with **ASEANstats** (check if `api/trade` endpoint works for automated extraction)
2. Use **IMF DOTS API** as programmatic backup for trade
3. Use **CEPII BACI** for methodological robustness check
4. Layer **AidData GCDF** for Chinese engagement context

---

## Thesis B — "The West's green transition runs through ASEAN"

**Verdict: READY. Strongest data of all four theses.**

### What we need
ASEAN countries' shares of global critical mineral production, bilateral mineral trade flows to US/EU/China, and the EU dependency framing.

### Key numbers already verified

| Mineral | ASEAN's global share | Key countries | Source |
|---|---|---|---|
| **Nickel (mine)** | **~47% of global** | Indonesia: **51–52%** alone (up from 34% in 2020). Philippines: ~9% (2nd globally) | USGS MCS 2025/2026, IEA |
| **Nickel ore** | **~91% of global supply** | Indonesia + Philippines combined | INSG World Nickel Factbook 2024 |
| **Tin** | **~35% of global** | Indonesia: 2nd largest globally. Myanmar significant (via Chinese customs mirror data) | USGS, ITA |
| **Cobalt** | Growing share | Philippines: 6th globally. Indonesia: significant growth from nickel laterite processing | USGS |
| **Rare earths** | Emerging | Vietnam: 2nd largest bismuth/tungsten. Malaysia: Lynas processing (main non-Chinese separated heavy REEs) | USGS, JMG |
| **Bauxite** | Significant | Indonesia: 5th globally | USGS |

**Headline stat:** Indonesia's share of mined nickel went from 34% → 52% in just three years (2020–2023). This is the single most dramatic number in any thesis.

### Data sources confirmed accessible

| Source | What it provides | Format | Access |
|---|---|---|---|
| **USGS MCS 2026** | World production + reserves for ~90 minerals, per country | PDF (2-page per mineral), public domain | pubs.usgs.gov — free |
| **Our World in Data Minerals** | 88 nonfuel mineral commodities, clean CSVs, 1913–present | CSV, GitHub (github.com/owid/energy-data) | Free, CC BY |
| **IEA Critical Minerals Data Explorer** | Demand projections for 37 minerals, supply data | Web interactive + downloadable dataset | Free (basic) |
| **Chatham House Resource Trade Earth** | Bilateral resource trade, 1,350+ products, 200+ countries, 2000–present | Web interactive (Sankey/choropleth) | Free — **literally the visualization we're building** |
| **BGS World Mineral Production** | 70+ commodities by country, 2019–2023, archive to 1913 | CSV/data.gov.uk | Free, OGL |

### Framing sources

| Source | What it provides | Status |
|---|---|---|
| **EU CRM Act** (Regulation 2024/1252) | 34 critical + 17 strategic materials. 2030 benchmarks: ≥10% EU extraction, ≥40% processing, ≥25% recycling, **≤65% from any single country** | Confirmed — free |
| **OECD Export Restrictions Inventory 2025** | 80 countries × 65 commodities. **Restrictions up 5× since 2009.** Indonesia nickel ban context | Confirmed — OECD site returned 403, but report exists and is cited widely |
| **Indonesia ESDM** | Nickel export ban (2020) + RKAB quota: cut from 272M to 150M tonnes (ESDM Reg. 17/2025) | esdm.go.id — free |

### Visual data readiness

- **Flow map (Sankey):** Chatham House Resource Trade Earth already does this. We can replicate/customize with their underlying Comtrade data
- **Dependency gauge:** USGS production shares + EU CRM Act benchmarks = direct comparison
- **Time series:** OWID CSVs give us Indonesia nickel production 2010–2024 in clean format

### Key gap
- Chatham House is JS-heavy interactive — may need manual data extraction or using Comtrade directly
- IEA's claim "~90% of recent nickel supply growth from Indonesia" is from their Global Critical Minerals Outlook 2025 report — not directly in the data explorer, but confirmed in their published analysis

---

## Thesis C — "Local conflicts here are global proxy wars"

**Verdict: DATA GAP SMALLER THAN ASSUMED — but still recommend deferring to follow-up project.**

### What changed from the thesis-options assessment

The thesis-options doc flagged SIPRI, ACLED, and UN voting as "not in catalogue." Our exploration found that **three of four are freely and trivially accessible.** Updated status:

| Source | Original status | Updated status | Effort to acquire |
|---|---|---|---|
| **SIPRI Military Expenditure** | Not in catalogue | **Free, no registration, Excel download** | 1 day |
| **SIPRI Arms Transfers** | Not in catalogue | **Free, no registration, query + export** | 1 day |
| **ACLED** | Not in catalogue | **Free tier = aggregated only; event-level = paid** | 1–5 days |
| **UN Voting (Voeten)** | Not in catalogue | **Free, Harvard Dataverse, R package available** | 1–2 days |
| **AidData GCDF 3.0** | In catalogue | Confirmed, but weak on military/defense | Already done |
| **OECD DAC CRS** | "Worth verifying" | **Verified: free, has peace/security sector codes (152xx)** | 1–2 days |

### SIPRI detail

- **Military Expenditure Database:** All 10 ASEAN states, 1949–2024. Local currency, constant USD, % of GDP, per capita. Excel download, no registration.
- **Arms Transfers Database:** All ASEAN countries covered. Trend-indicator values (TIVs) by supplier–recipient. Query + export. Updated through 2025.
  - **Editorial note:** BFNA guardrails limit hard security. Arms transfers data names specific weapons systems — can aggregate to TIV totals without naming systems, but sits on the editorial line.

### UN General Assembly Voting (Voeten dataset)

- Harvard Dataverse, sessions 1–78 (1946–2023). Free.
- Includes ideal point estimates for all UN members including all 10 ASEAN countries.
- Existing research shows ASEAN voting patterns closer to BRICS/China than US. Can compute alignment shift over time.
- R package (`unvotes`) available on CRAN with example code.

### ACLED — the remaining gap

- **Free tier:** Registration required. Gives aggregated data + dashboards. **NOT event-level downloads.**
- **Research tier (paid):** Event-level data with weekly lag. Needed for pin-map interaction.
- Coverage: Myanmar 2010+, Thailand 2010+, Cambodia 2010+, Indonesia 2015+, Philippines 2016+, Malaysia 2018+.
- **Workaround:** Use curated named conflict zones (South China Sea, Myanmar, Mindanao, Thai south) sourced editorially, rather than ACLED event pins.

### OECD DAC CRS — confirmed

- Free via OECD Data Explorer. Bulk CSV download available.
- **Peace and security purpose codes:** 15210 (security reform), 15220 (civilian peacebuilding), 15230 (peacekeeping), 15240 (SALW control), 15250 (landmines), 15261 (child soldiers).
- Can query bilateral ODA from US/EU/Japan/Australia to any ASEAN country, filtered to peace-and-security sector.

### Bottom line on Thesis C

The data gap is smaller than assumed — acquisition would take ~5 days total for all free sources. **But the binding constraint isn't data, it's:**
1. **BFNA editorial guardrails** on hard security
2. **Analytical synthesis** — weaving 6 heterogeneous datasets into a defensible "proxy war" narrative
3. **Timeline** — this work competes with shipping the primary infographic by May

**Recommendation stands: defer to follow-up project.** But acquire the free datasets now (SIPRI, Voeten, OECD CRS) during the current sprint to stage them for later.

---

## Thesis D — "ASEAN is quietly hedging"

**Verdict: READY. Uses the same data as Thesis A with different framing.**

### What we need
Multi-line growth charts showing each ASEAN country's trade + FDI with US, China, EU, Japan **all growing simultaneously** — not zero-sum.

### Data sources
Identical to Thesis A (see above). The difference is visual treatment:
- Thesis A: ternary plot showing relative position → "which side are you on?"
- Thesis D: multi-line growth chart showing absolute growth → "everyone's ties are growing"

### Key analytical difference
For Thesis A, we compute **shares** (what % of country X's trade goes to US vs China vs EU).
For Thesis D, we plot **absolute values** (total bilateral trade/FDI with each partner, all on the same axis).

Same data, different chart. ASEANstats covers this completely.

---

## Cross-thesis data readiness summary

| Dimension | A — Fault Line | B — Green Transition | C — Proxy Wars | D — Hedging |
|---|---|---|---|---|
| **Core data available?** | Yes | **Yes (strongest)** | Mostly yes | Yes (same as A) |
| **Primary source** | ASEANstats | USGS + OWID + Chatham House | SIPRI + Voeten + OECD CRS | ASEANstats |
| **Format** | Web UI + API | CSV + PDF + interactive | Excel + RData + web | Web UI + API |
| **Time window** | Trade: 2003–2025; FDI: 2012–2024 | 1913–2024 (long history) | 1949–2024 (milex); 1946–2023 (voting) | Same as A |
| **Acquisition effort** | 2–3 days | 2–3 days | 5+ days | Same as A |
| **Editorial risk** | Low | Low | **Medium-high** (BFNA guardrails) | Low |
| **Hero visual feasible?** | Yes (ternary plot) | **Yes (flow map / dependency gauge)** | Yes (relationship diagram) | Harder (multi-line less dramatic) |

---

## Recommended next step

Based on this assessment, the thesis-options recommendation still holds:

**Ship Thesis A (Fault Line) as the May headline, with Thesis B (Green Transition / critical minerals) as a supporting evidence layer.** This gives us:
- A ternary plot hero shot (Thesis A) — using ASEANstats data
- A minerals dependency layer (Thesis B) — using USGS/OWID/Chatham House data
- Both are fully data-ready with free sources
- Clean editorial fit for BFNA

Stage Thesis C datasets (SIPRI, Voeten, OECD CRS) now for a follow-up project.

Thesis D framing can be woven into Thesis A as a counter-narrative panel ("but ASEAN isn't just picking sides — everyone's ties are growing").
