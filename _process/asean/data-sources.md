---
title: "ASEAN Infographic — Dataset Catalogue (Verified)"
type: research
status: active
created: 2026-04-10
updated: 2026-04-25
tags: [bfna, infographic, asean, data-sources]
---

> **Verification update — 2026-04-25:** First wave of data pulls completed for theses A + D + B. Several entries below have been updated inline with findings from the actual fetches. Where a source has been pulled, see the per-source `SCOUT.md` under `data-raw/<source>/` for verified URLs, fetch commands, schema, and gotchas. Key corrections:
> - **UNCTAD FDI Statistics** does NOT carry current bilateral pairs. Bilateral FDI moved to **IMF DIP** (formerly CDIS). UNCTAD bilateral publication discontinued after 2012.
> - **AidData GCDF 3.0** confirmed for **9 of 10** ASEAN countries (Singapore absent — TUFF methodology excludes always-high-income recipients; Brunei present with 53 records).
> - **CGIT** — 2023-Fall XLSX publicly downloadable (684 KB); 2024 full-year release announced but not at any discoverable public URL — request from Derek Scissors.
> - **BACI HS07 V202601** = 1.68 GB ZIP, free, no auth. EU has no single Comtrade reporter code — must aggregate member codes (DE+FR+NL+IT+ESP+BE+POL+SWE = "EU-8" proxy).
> - **WDI** — Myanmar `NE.TRD.GNFS.ZS` (Trade % GDP) is null for all years 2000–2024 in WDI; use IMF DOTS/DOT mirror data instead. Laos has 8 null years for the same series.
> - **USGS MCS2026** confirms Indonesia 2025 nickel mine production at **2.6 Mt (~74% of world)** — an even stronger headline than the IEA "90% of recent supply growth" figure.

# ASEAN infographic — dataset catalogue

**Scope:** Public datasets covering ASEAN countries (Brunei, Cambodia, Indonesia, Laos, Malaysia, Myanmar, Philippines, Singapore, Thailand, Vietnam, Timor-Leste) and their major partners (US, China, EU, Japan, South Korea, India, Australia, UK), across three dimensions: **bilateral trade**, **foreign direct investment**, and **critical minerals & energy**.

**Compiled:** April 10, 2026. Every source listed here has been live-verified. Sources that exist but were not verified are listed at the end under "worth verifying if needed."

**Companion files (deeper detail, longer lists):**
- [compass_artifact_wf-92add9c4-2263-462e-8bbc-0168a7813d59_text_markdown.md](compass_artifact_wf-92add9c4-2263-462e-8bbc-0168a7813d59_text_markdown.md) — full trade catalogue
- [data-sources-fdi.md](data-sources-fdi.md) — full FDI catalogue
- [data-sources-critical-minerals.md](data-sources-critical-minerals.md) — full minerals catalogue

---

## How to use this catalogue

1. **Start broad, narrow by thesis.** Once Marshall/Georgia lock in a direction, 8–12 datasets from this list will actually be needed. The rest becomes supporting reference.
2. **Pair trade + FDI + minerals** wherever possible. A single-dimension view will miss the interesting story. The Indonesia nickel moment, for example, needs ESDM quotas + USGS world share + IEA demand + OECD export restrictions + Comtrade/BACI bilateral flows to tell the full story.
3. **Know the methodological traps.** Approvals vs realizations (BKPM, MIDA, BOI), immediate vs ultimate investor (Singapore/Netherlands distortion), CIF/FOB asymmetries (all bilateral trade), mined vs refined output (Indonesia nickel), registered vs ultimate ownership (Vietnam FIA). These are flagged in the companion files.
4. **Free-tier first.** Everything marked free here is enough to build V1 of any plausible thesis. Paywalled sources are only required for facility-level depth.

---

## Part 1 — Bilateral trade

### Global aggregators

**UN Comtrade / Comtrade+** — `https://comtradeplus.un.org/TradeFlow`
Bilateral merchandise trade for ~200 reporters, HS 6-digit, annual + monthly, 1962–present. Services trade from 2000. Free query and API (bulk download is paid).

**CEPII BACI** — `https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37`
Reconciled bilateral trade based on Comtrade (reliability-weighted mirror-flow averaging). HS 6-digit, ~5,000 products, 1989–present. Annual CSVs per year. Free, Etalab 2.0. **This is the cleanest single dataset for bilateral goods trade** — start here for any serious data work. **Latest release V202601** (Jan 2026), covers through 2024. Direct download URLs: `BACI_HS07_V202601.zip` (1.68 GB, 2007–2024) at `https://www.cepii.fr/DATA_DOWNLOAD/baci/data/BACI_HS07_V202601.zip`; HS17 (2017–2024) and HS22 (2022–2024) variants also available. Schema per row: `t,i,j,k,v,q` (year, exporter ISO numeric, importer ISO numeric, HS6, USD thousands, metric tons). **EU has no single Comtrade reporter code** — aggregate member codes manually (DE 276, FR 251, NL 528, IT 380, ESP 724, BEL 56, POL 616, SWE 752 = "EU-8" proxy; full EU = ~27 codes). Singapore figures still include re-exports (~30–40% of recorded SGP imports) — label as "trade through Singapore." See `data-raw/baci-trade/SCOUT.md`.

**IMF DOTS / IMTS** — `https://data.imf.org/en/datasets/IMF.STA:IMTS`
Bilateral goods trade by partner, ~220 countries, 1960–present, monthly/annual. No commodity detail. Free, SDMX API. Current, but CIF/FOB asymmetries.

**World Bank WITS** — `https://wits.worldbank.org/`
Aggregates Comtrade + UNCTAD TRAINS + WTO IDB/CTS. Best single portal for tariff data. Free (registration for custom queries).

**WTO Stats + BaTiS** — `https://stats.wto.org/`
Merchandise at product-group level + **Balanced Trade in Services (BaTiS)**: 202 reporters × partners, 26 EBOPS 2010 categories, 2005–2024. Free, bulk CSV. **The only usable bilateral services trade dataset globally.** ~75% of bilateral services cells are gravity-model estimates — know this before building claims on specific pairs.

**Harvard Atlas of Economic Complexity** — `https://atlas.hks.harvard.edu/data-downloads`
HS 6-digit + SITC Rev 2 back to 1962. Economic Complexity Index, Product Complexity Index. Free CSV. Visualization-ready.

**OEC (Observatory of Economic Complexity)** — `https://oec.world`
Bilateral trade visualizations (tree maps, Sankey, network). Free profile pages; **API and bulk downloads require Pro/Premium subscription.** 50% academic discount.

**ITC Trade Map** — `https://www.trademap.org/`
220 countries, HS 2/4/6-digit, bilateral flows including re-exports. **Free full access for EU users through Nov 2028** (EU-funded). Free registration; subscription tier for non-EU developed-country users.

### ASEAN regional

**ASEANstats** — `https://data.aseanstats.org/`
- Annual merchandise: `https://data.aseanstats.org/trade-annually` — HS 8-digit (AHTN) from 2012, bilateral US/China/EU/Japan/Korea/India/Australia.
- Services (SITS): `https://data.aseanstats.org/sits-by-reporters-and-services` — by category; **limited bilateral partner detail** (important gap).
- Last update: March 2026. Free, CC BY 4.0. **Canonical regional dataset.**

**ADB Multi-Regional Input-Output (MRIO)** — `https://mrio.adbx.online/`
62 economies including all 10 ASEAN members + major partners. 35 industries. 2000, 2007–2022. Free for academic use. **Best source for value-added / GVC participation analysis** — use this instead of WIOD (which stopped in 2014).

### ASEAN national sources (best-in-class tier)

**Malaysia — OpenDOSM** — `https://open.dosm.gov.my/`
CSV, Parquet, JSON API, live dashboard. CC BY 4.0. **Gold standard for machine-readable trade data in ASEAN.** Direct CSV example: `https://storage.dosm.gov.my/trade/trade_sitc_1d.csv`

**Singapore — SingStat + data.gov.sg** — `https://tablebuilder.singstat.gov.sg/`
HS 2-digit bilateral in Table Builder. **Rare feature: services trade by major trading partner** (imports: `/table/TS/M060271`, exports: `/table/TS/M060361`). API via data.gov.sg. Free.

**Thailand — MOC Trade Report System** — `https://tradereport.moc.go.th/en`
Full HS depth, bilateral by all partners. **7 public API endpoints** including `https://tradereport.moc.go.th/opendata/exportharmonizecountries`. Free.

**Indonesia — BPS** — `https://www.bps.go.id/en`
HS classification, commodity × country. **PDF-primary** (annual and monthly publications). Less machine-readable than the top three above.

**Philippines — PSA OpenSTAT** — `https://openstat.psa.gov.ph/International-Merchandise-Trade-Statistics-IMTS`
CSV, Excel, PC-Axis via PXWeb interface. 1991–present. Free. Detailed HS × partner cross-tabs may require data request.

**Vietnam — NSO / GSO** — `https://www.nso.gov.vn/en/import-export/`
Excel downloads, by commodity group × country (85–108 partners). English pages limited.

**Timor-Leste — INETL** — `https://inetl-ip.gov.tl/external-trade-statistics/`
Monthly PDFs from 2004. Small economy, oil/gas dominates.

### Partner-country mirror sources (use when ASEAN-side data is thin)

**United States — USITC DataWeb** — `https://dataweb.usitc.gov/`
HTS 10-digit imports, HS 6-digit exports, 1989–present. Free.

**United States — USA Trade Online (Census)** — `https://usatrade.census.gov/`
Reimagined portal launched March 2026. No account required. HS 2/4/6/10-digit.

**European Union — Eurostat Comext** — `https://ec.europa.eu/eurostat/comext/newxtweb/`
CN 8-digit, 1988–present, updated daily. Each EU member state as reporter. **Bulk CSV download free.** Goods only (no services in Comext).

**Japan — Customs Trade Statistics** — `https://www.customs.go.jp/toukei/info/index_e.htm`
HS 9-digit, monthly. CSV downloads. Also via `https://www.e-stat.go.jp/` with API.

**South Korea — UNI-PASS** — `https://unipass.customs.go.kr/ets/index_eng.do`
Monthly, HS level, all ASEAN selectable. **Korea Open Data API** (monthly, with registration): `https://www.data.go.kr/en/data/15101636/openapi.do`

**Australia — DFAT Pivot Tables** — `https://www.dfat.gov.au/trade/trade-and-investment-data-information-and-publications/trade-statistics/trade-statistical-pivot-tables`
XLSX pivot tables. SITC Rev 4 3-digit by country, 2006–2024. Free.

**Australia — ABS** — `https://www.abs.gov.au/statistics/economy/international-trade/international-trade-goods/latest-release`
Data Explorer, CSV downloads. Monthly through Feb 2026.

### Commercial trade sources (all paywalled)

**Panjiva** (S&P Global) — shipment-level, 22 customs sources including Indonesia, Vietnam, Philippines directly.
**CEIC Data** — dedicated ASEAN premium database; best macro aggregator.
**Trade Data Monitor** — direct-from-NSO HS-level bilateral, often faster than Comtrade.
**ImportGenius** — bill of lading / customs, strong on US–ASEAN corridors.

---

## Part 2 — Foreign direct investment

### Global aggregators

**UNCTAD FDI Statistics** — `https://unctadstat.unctad.org/datacentre/dataviewer/US.FdiFlowsStock`
**⚠ Aggregate only — NO bilateral country-pair dimension.** Inflows, outflows, inward stocks, outward stocks **by reporting economy** (no partner). 206 economies. Annual, 1970s–2024. Free, but CSV/XLSX export requires browser UI + free account; no public bulk URL or open API. UNCTAD's old bilateral FDI publication (per-country Excel workbooks, 2001–2012) was discontinued after 2012. **Use only for aggregate totals**; for bilateral pairs, see IMF DIP and OECD FDI by Partner below. WIR annexes (PDFs) carry aggregate flows + stocks for verification: `https://unctad.org/system/files/official-document/wir2024_annex-1_en.pdf` (flows), `wir2024_annex-2_en.pdf` (stocks). See `data-raw/unctad-fdi/SCOUT.md`.

**IMF Direct Investment Positions (DIP, formerly CDIS)** — `https://data.imf.org/en/datasets/IMF.STA:DIP`
**Primary bilateral source.** Annual bilateral direct investment **positions (stocks)** by counterpart economy, 2009–2023; ~110 reporting economies. IDN, THA, MYS, SGP, VNM all report inward positions by source country. Free, no auth. SDMX-JSON API at `http://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData/DIP/` (rate limit 10 req/5 s). Browser export from the dataset page is the easiest route for one-time pulls. **Caveats:** stocks not flows (pair with OECD for flows); China does not consistently report outward positions (use mirror data from ASEAN hosts); SG/MYS reporters include SPE/pass-through FDI (watch for SPE-adjusted flag). 2024 data expected mid-2025.

**OECD FDI Statistics by Partner Country (BMD4)** — `https://stats.oecd.org/Index.aspx?DataSetCode=FDI_FLOW_PARTNER`
Annual FDI **flows** AND stocks, OECD-member reporters (US, JP, KR, EU members) → all destinations including ASEAN, 1982–2023. Free. **Pairs with IMF DIP**: DIP gives ASEAN-host inward stocks (including Chinese sources via mirror); OECD gives partner-country outward flows from US/JP/KR/EU. Together they fill both perspectives. Legacy table URLs still live; new browser at `https://data-explorer.oecd.org/`.

**OECD FDI Statistics (BMD4)** — `https://data-explorer.oecd.org/`
OECD members as reporters + non-OECD G20. Legacy table URLs still live: `https://stats.oecd.org/Index.aspx?DataSetCode=FDI_POS_CTRY`. Quarterly FDI in Figures. SPE/non-SPE split where available. Free. **Best for "where US/EU/Japan/Korea money actually goes in ASEAN"** once SPE filtering is applied.

**World Bank WDI — FDI indicators** — `https://data.worldbank.org/indicator/BX.KLT.DINV.CD.WD`
Aggregate inflows/outflows, % of GDP, net. No partner or sector detail. Free, CSV/API. Baseline scale context only. **Full WDI v2 REST API** — no auth, no rate limits, semicolon-delimited multi-country/multi-indicator pulls in a single call (max 60 indicators, 1,500-char path limit). Use `EUU` for EU aggregate (composition: 28 members through 2019, 27 from 2020 — flag the Brexit break in time-series). **Coverage gaps for ASEAN:** Myanmar `NE.TRD.GNFS.ZS` (Trade % GDP) null all years 2000–2024 — use IMF DOTS/DOT mirror data instead; Laos same indicator null 8 years. Latest data ceiling 2024 for most countries (some small economies stop at 2023). See `data-raw/worldbank-wdi/SCOUT.md`.

### ASEAN regional

**ASEANstats FDI** — `https://data.aseanstats.org/`
- FDI by host × source (flows): `https://data.aseanstats.org/fdi-by-hosts-and-sources`
- FDI by host × source (stocks): `https://data.aseanstats.org/fdi-by-hosts-and-sources-stock`
- FDI by source × industry: `https://data.aseanstats.org/fdi-by-sources-and-sectors`
- Quarterly inflows: `https://data.aseanstats.org/asean-fdi-inw-quarterly`
- Total inflows: `https://data.aseanstats.org/indicator/FDI.AMS.TOT.INF`
Partners individually identifiable (US, China, EU27, EU28, Japan, Korea, India, Australia, intra-ASEAN). Free, CC BY 4.0. **Canonical regional bilateral FDI dataset.**

**ASEAN Investment Report 2024** — `https://asean.org/book/asean-investment-report-2024-asean-economic-community-2025-and-foreign-direct-investment/`
Annual narrative + statistical annex, co-published with UNCTAD.

### ASEAN national (best-in-class tier)

**Indonesia — BKPM (now Ministry of Investment & Downstreaming)** — `https://www.bkpm.go.id/en/info/realisasi-investasi/2025`
Quarterly realization: DDI vs FDI × source country × sector × province. Satu Data portal: `https://data.bkpm.go.id/`. FY2025: IDR 1,931.2T, 101% of target. Free. **Best national-level source in ASEAN for real-time bilateral FDI.** Caveat: BKPM (investment-project methodology) and Bank Indonesia (BOP methodology) figures are not reconcilable — pick one lens.

**Malaysia — MIDA** — `https://www.mida.gov.my/why-malaysia/investment-statistics/`
Approved investments by source country × sector. FY2025 record: RM426.7B (+11% YoY), manufacturing 30.8% of total. Media releases: `https://www.mida.gov.my/media-release/`. Free.

**Singapore — SingStat FDI** — `https://www.singstat.gov.sg/fdi`
Bilateral FDI stocks by partner, by industry. End-2024 stock: S$3,130.4B. Top source economies: US, UK, Japan, Mainland China, Ireland. Dashboard: `https://www.singstat.gov.sg/find-data/search-by-theme/trade-and-investment/foreign-direct-investment/visualising-data/foreign-direct-investment-in-singapore-dashboard`. **Rare bilateral FDI stock detail, but interpret cautiously due to Singapore's holding-company hub role.**

**Thailand — BOI** — `https://www.boi.go.th/index.php?page=press_releases2&language=en`
Promoted-project applications and approvals by source country × sector. FY2025: record THB 1.876T (+11% YoY), digital sector (data centres) dominant at THB 612.8B. Free.

**Philippines — BSP External Sector** — `https://www.bsp.gov.ph/SitePages/Statistics/External.aspx?TabId=7`
BOP-based FDI flows (BPM6) by country of origin, Table 10: `https://www.bsp.gov.ph/statistics/external/Table%2010.pdf`. FY2025: $7.79B (-17.1%). Top sources Jan–Oct: Japan, US, Singapore. Free.

**Vietnam — FIA (now under Ministry of Finance)** — `http://fia.mpi.gov.vn/Home/en`
Registered vs realized FDI by source × sector × province. FY2025: $38.42B registered, record $27.62B realized. Singapore is largest investor. ⚠ **MPI was absorbed into MOF in 2025 — FIA URL still live but domain migration likely.** Free.

### Partner-country mirror sources

**United States — BEA Direct Investment by Country and Industry** — `https://www.bea.gov/data/intl-trade-investment/direct-investment-country-and-industry`
Positions, transactions, operations of majority-owned affiliates. End-2024 USDIA position: $6.83T. Next release July 2026. Free, API. **Deepest operational detail of any FDI source for US → ASEAN.**

**European Union — Eurostat FDI (BPM6)** — `https://ec.europa.eu/eurostat/databrowser/view/bop_fdi6_pos/default/table?lang=en`
EU → ASEAN flows and positions by member state × partner. Also by ultimate counterpart: `https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Foreign_direct_investment_positions_by_ultimate_counterpart`. Free.

**Japan — JETRO Statistics** — `https://www.jetro.go.jp/en/reports/statistics.html`
Japanese outward FDI by destination × industry. Underlying source: BOJ/MOF Balance of Payments. **Essential for Japan–ASEAN bilateral FDI** (Japan is top or second source for several ASEAN economies).

**South Korea — Korea Eximbank FDI Statistics** — `https://stats.koreaexim.go.kr/en/enMain.do`
Korean outward FDI by destination × industry, with committed vs implemented split. **Best source for the Korea–Vietnam corridor.**

### Academic / NGO specialty trackers

**AidData Global Chinese Development Finance Dataset (GCDF 3.0)** — `https://www.aiddata.org/data/aiddatas-global-chinese-development-finance-dataset-version-3-0`
**20,985 projects, 165 countries, $1.34 trillion**, 2000–2021 commitments (implementation tracked to 2023). Project-level with sector, lending terms, lender, geography. Direct ZIP: `https://docs.aiddata.org/ad4/datasets/AidDatas_Global_Chinese_Development_Finance_Dataset_Version_3_0.zip` (~27 MB). Geospatial version: `https://www.aiddata.org/data/aiddatas-geospatial-global-chinese-development-finance-dataset-version-3-0`. CSV, Excel, GeoJSON, Shapefile. Free, CC BY 4.0. **Definitive academic dataset for Chinese state-backed finance flows.** **ASEAN coverage (verified by ISO-3 filter):** 9 of 10 — Indonesia (437 rows), Vietnam (191), Thailand (116), Malaysia (176), Cambodia (418), Laos (346), Myanmar (495), Philippines (267), Brunei (53). **Singapore absent** — TUFF methodology excludes always-high-income recipients. Always apply `Recommended For Aggregates = Yes` filter first to drop umbrella double-counts and pledges. Amounts in constant 2021 USD only. See `data-raw/aiddata-gcdf/SCOUT.md`.

**China Global Investment Tracker (AEI + Heritage)** — `https://www.aei.org/china-global-investment-tracker/`
~4,900 large transactions (≥$95M) since 2005, investments + construction contracts, 13 sectors. Total tracked: $2.6T. Free with citation. **Best private/commercial Chinese investment tracker.** Pair with AidData GCDF for complete China picture. **Latest free public XLSX = 2023 Fall release** (684 KB, covers through H2 2023): `https://aei.org/wp-content/uploads/2024/01/China-Global-Investment-Tracker-2023-Fall-1.xlsx`. The Jan 2026 full-year 2024 release was announced (graphic PDF: `https://www.aei.org/wp-content/uploads/2025/01/China-Tracker-Investment-Graphic-January-2026.pdf`) but the XLSX is not at any public URL — request directly from Derek Scissors. **Reconciliation gotcha:** large BRI infra projects appear in BOTH CGIT (construction contract) and AidData GCDF (lender finance) — never sum the two; treat as complementary layers. SG figures include regional-hub flows (SPV transit). See `data-raw/china-gi-tracker/SCOUT.md`.

**Green Finance & Development Center (GFDC, Fudan) — BRI Investment Reports** — `https://greenfdc.org/china-belt-and-road-initiative-bri-investment-report-2025/`
Semi-annual BRI engagement reports with green/non-green split. H1 2025: $124B combined engagement — highest 6-month total ever. Free.

### Commercial FDI sources (paywalled)

**fDi Markets (FT Locations)** — `https://www.ftlocations.com/products-and-services/fdi-markets`
Real-time greenfield FDI tracker, ~403,000 projects since 2003. Industry standard for greenfield.

**CEIC Data** — aggregates national FDI data across ASEAN with reconciliation. Best macro one-stop-shop.

---

## Part 3 — Critical minerals & energy

### Global production, reserves, trade

**USGS Mineral Commodity Summaries 2026** — `https://pubs.usgs.gov/periodicals/mcs2026/mcs2026.pdf`
Annual two-page synopses for ~90 minerals with world production, reserves, and salient stats. Hub: `https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries`. Free, public domain. **Primary global reference. Start here.** **Machine-readable data release on ScienceBase:** https://www.sciencebase.gov/catalog/item/696a75d5d4be0228872d3bf8 — `MCS2026_Commodities_Data.csv` (3 MB, all ~90 commodities × all countries × 2021–2025) is the single best file. Per-commodity 2-page PDFs at `https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-{nickel|cobalt|rare-earths|tin|bauxite|copper}.pdf`. **Verified headline (MCS2026):** Indonesia 2025 nickel mine production = **2,600,000 t / ~74% of world** (world total ~3.5 Mt). Note: USGS reports nickel in contained metal (not ore), and aggregates Class I (battery-grade HPAL/MHP) + Class II (NPI for stainless) — does NOT split. Minerals Yearbook international volume has deeper country chapters (2–3 year lag). See `data-raw/usgs-minerals/SCOUT.md`.

**BGS World Mineral Production 2019–2023** — `https://www.bgs.ac.uk/mineralsuk/statistics/world-mineral-statistics/`
70+ commodities by country, 2019–2023. Historical archive back to 1913. data.gov.uk listing: `https://www.data.gov.uk/dataset/3ac64c8c-84f9-4c81-8376-693aec705436/world-mineral-statistics-dataset2`. Free, Open Government Licence. **Best for long historical series** and a non-US perspective.

**Our World in Data — Minerals & Energy Explorers** — `https://ourworldindata.org/explorers/minerals`
Energy Explorer: `https://ourworldindata.org/explorers/energy`. GitHub: `https://github.com/owid/energy-data/`. World production of 88 nonfuel mineral commodities, clean CSVs back to 1913 where available. **Best clean, machine-readable dataset for charting.** Free, CC BY.

**Chatham House — Resource Trade Earth** — `https://resourcetrade.earth/`
Bilateral trade in **1,350+ resource products** across 200+ countries, 2000–present. Both monetary value and physical mass. Interactive Sankey/choropleth/bilateral tables. Free. **Literally the kind of visualization we're building.**

**IEA Critical Minerals Data Explorer** — `https://www.iea.org/data-and-statistics/data-tools/critical-minerals-data-explorer`
Demand and supply projections for copper, cobalt, lithium, nickel, graphite, rare earths. Clean-energy-sector demand by technology. Global Critical Minerals Outlook 2025: `https://www.iea.org/reports/global-critical-minerals-outlook-2025`. Policy Tracker: `https://www.iea.org/data-and-statistics/data-tools/critical-minerals-policy-tracker`. Free (basic); full data packages via subscription. **Best source for transition-minerals framing.** IEA: ~90% of recent nickel supply growth came from Indonesia alone.

**OECD Inventory of Export Restrictions on Industrial Raw Materials 2025** — `https://www.oecd.org/en/publications/oecd-inventory-of-export-restrictions-on-industrial-raw-materials-2025_facc714b-en.html`
80 exporting countries × 65 commodities × 489 HS6 products. Tracked since 2009. **Export restrictions on critical raw materials have risen 5× since 2009.** Free. **Essential for Indonesia's nickel ban and resource nationalism narratives.**

### Energy (oil, gas, coal)

**EIA International Energy Statistics** — `https://www.eia.gov/international/data/world`
Oil, natural gas, LNG, coal, electricity, biofuels by country, 1980–present. Indonesia country brief: `https://www.eia.gov/international/analysis/country/IDN`. Free API: `https://www.eia.gov/opendata/`. **Best free source for ASEAN fossil fuel time series.**

**Energy Institute Statistical Review of World Energy 2025 (74th edition)** — `https://www.energyinst.org/statistical-review`
Data downloads: `https://www.energyinst.org/statistical-review/resources-and-data-downloads`. 70+ countries, 1965–2024, all major ASEAN producers. Released June 26, 2025. **Excel workbooks free** (25 MB long format, 3 MB wide format, multi-sheet). **Best long-running free energy series.**

**Global Energy Monitor — Coal Mine Tracker + Asia Gas Tracker** — `https://globalenergymonitor.org/`
- Coal Mine Tracker (~4,300 mines, ~95% of global): `https://globalenergymonitor.org/projects/global-coal-mine-tracker/`
- Data download: `https://globalenergymonitor.org/projects/global-coal-mine-tracker/download-data/`
- Asia Gas Tracker: `https://globalenergymonitor.org/projects/asia-gas-tracker/`
- Gas Finance Tracker: `https://globalenergymonitor.org/projects/global-gas-finance-tracker/`
Open datasets, CC BY 4.0. **The best free substitute for commercial facility-level trackers.** If you want "every coal mine in Indonesia" or "every LNG terminal in ASEAN," start here.

### Prices

**World Bank Commodity Markets (Pink Sheet)** — `https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/world-bank-commodities-price-data-the-pink-sheet`
Monthly PDFs (latest: `CMO-Pink-Sheet-January-2026.pdf`) + historical XLSX (monthly and annual). Energy, metals, agriculture. 1960–present for prices. Free. **Best free price series.**

### EU strategic framing

**EU Critical Raw Materials Act (Regulation 2024/1252)** — `https://eur-lex.europa.eu/eli/reg/2024/1252/oj/eng`
DG GROW policy hub: `https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials/critical-raw-materials-act_en`. **34 Critical + 17 Strategic Raw Materials.** 2030 benchmarks: ≥10% EU consumption from extraction, ≥40% processing, ≥25% recycling, ≤65% from any single third country. **Best for framing ASEAN's strategic importance to Europe.**

**JRC Raw Materials Information System (RMIS)** — `https://rmis.jrc.ec.europa.eu/`
EU CRM hub: `https://rmis.jrc.ec.europa.eu/eu-critical-raw-materials`. Material profiles: `https://rmis.jrc.ec.europa.eu/rmp/` (e.g., `/rmp/Cobalt`). Battery raw materials data viewer: `https://rmis.jrc.ec.europa.eu/uploads/bvc/dataviewer.htm`. Free. **Most comprehensive EU-perspective interactive platform.**

### Agricultural / strategic commodities

**FAO FAOSTAT** — `https://www.fao.org/faostat/`
Production, area, yield, trade through 2024 for palm oil, rubber, and all agricultural commodities. All ASEAN. Free, CSV/API. **Definitive global source for palm oil and rubber** — ASEAN dominates both.

**Malaysian Palm Oil Board (MPOB)** — `https://bepi.mpob.gov.my/`
Monthly production, stocks, exports, prices. State-level (Peninsular/Sabah/Sarawak). Summary 2025: `https://bepi.mpob.gov.my/index.php/summary-2/333-2025/1222-summary-of-the-malaysian-palm-oil-industry-2025`. Free Excel. **Gold standard for palm oil data.**

**ANRPC — Natural rubber** — `https://www.anrpc.org`
13 rubber-producing countries (~84% of global NR). Monthly statistical reports: `https://www.anrpc.org/newsla/anrpc-releases-monthly-nr-statistical-report-november-2025`. 2025 global NR production: 14.9M tonnes. Mixed access — monthly summaries free. **Specialist regional rubber tracker.**

**IRSG (International Rubber Study Group)** — `https://www.rubberstudy.org/welcome`
Quarterly Rubber Statistical Bulletin and Rubber Industry Report covering both natural and synthetic rubber. Singapore-based intergovernmental body. Mixed access. Pair with ANRPC for cross-validation.

### Commodity study groups (non-commercial)

**International Nickel Study Group (INSG)** — `https://insg.org/`
World Nickel Factbook 2024: `https://insg.org/wp-content/uploads/2024/09/publist_The-World-Nickel-Factbook-2024.pdf`. October 2025 market update: `https://insg.org/wp-content/uploads/2025/10/pressrel_INSG-Press-Release-October_2025-nd782v78.pdf`. Indonesia + Philippines = ~91% of global nickel ore supply. Free for Factbook; detailed monthly statistics member-only. **Authoritative non-commercial nickel source.**

**International Tin Association (ITA)** — `https://www.internationaltin.org/`
Global tin production data, mine-level news, market reports. 2024 global refined tin: 371,200 tonnes (-2.7%). Indonesia -30.7% due to corruption investigation; Myanmar Man Maw mine halt ongoing. Free for public articles. **The only specialist tracker of Myanmar tin** (uses Chinese customs import mirror data).

**International Copper Study Group (ICSG)** — `https://icsg.org/`
World Copper Factbook 2025: `https://icsg.org/download/2025-10-the-world-copper-factbook/?ind=68ece711240a5&filename=Factbook2025.pdf&wpdmdl=8908`. Biannual **Directory of Copper Mines, Smelters and Refineries** (~1,000 facilities). Selected statistics: `https://icsg.org/selected-copper-statistics/`. Free for Factbook.

**International Lead and Zinc Study Group (ILZSG)** — `https://www.ilzsg.org/`
Free access data: `https://www.ilzsg.org/free-access-data/`. World Zinc Factbook 2024: `https://www.ilzsg.org/wp-content/uploads/SitePDFs/The%20World%20Zinc%20Factbook%202024.pdf`. Monthly press releases. Free for summaries.

### Regional

**ASEAN Centre for Energy — AEDS** — `https://aeds.aseanenergy.org/`
ASEAN Energy Database System: national energy balances, fossil fuels, renewables across 10 ASEAN members (not Timor-Leste). 2025 Statistics Leaflet: `https://aseanenergy.org/publications/asean-energy-statistics-leaflet-2025` (historical data 2005–2023). Free. **Best ASEAN-internal energy statistics source.**

### ASEAN national (minerals)

**Philippines — Mines and Geosciences Bureau (MGB)** — `https://mgb.gov.ph/`
Annual Mining Industry Statistics. 2024 "At a Glance": `https://www.mgb.gov.ph/images/Mineral_Statistics/2024/MINERALS_INDUSTRY_AT_A_GLANCE_Updated_11_April_2025.pdf`. 2022–2024 production values: ₱317.5B → ₱327.9B → ₱316.3B. 291,672 workers in 2024. Public portal: `http://databaseportal.mgb.gov.ph/`. **Best-structured national minerals statistics in ASEAN.** Philippines is 2nd-largest nickel ore producer globally.

**Malaysia — JMG (Minerals and Geoscience)** — `https://www.jmg.gov.my/`
Malaysian Minerals Yearbook (annual). Archive on data.gov.my: `https://archive.data.gov.my/data/en_US/organization/jabatan-mineral-dan-geosains-malaysia-jmg`. **Essential for the Lynas rare earths processing story** — main non-Chinese source of separated heavy REEs.

**Indonesia — ESDM (Ministry of Energy and Mineral Resources)** — `https://www.esdm.go.id/en`
Directorate General of Minerals and Coal: `https://www.minerba.esdm.go.id/`. Nickel export ban (2020) + RKAB quota system. **Verified figures (2026-04-25):** 2024 approved quota 272 Mt → 2025 quota 150 Mt → cut 122 Mt (~44% reduction; widely cited as "120 Mt" rounded). 2026 RKAB target ~250 Mt. Regulatory instrument: **ESDM Ministerial Regulation No. 17 of 2025** — Procedures for Preparation, Submission, and Approval of Work Plans and Budgets — effective **3 October 2025**, governs 2026 RKAB cycle, reverts to annual approvals. ESDM regulation text not available in English; cite via Carbon Credits / S&P Global / SMM coverage. **Indispensable for the Indonesia nickel story** — combined with USGS (world share — Indonesia 2.6 Mt = 74% of world 2025) and IEA (demand framing — 90% of nickel supply growth 2020–2024 came from Indonesia). See `data-raw/minerals-policy/SCOUT.md`.

### Transparency / governance

**EITI (Extractive Industries Transparency Initiative)** — `https://eiti.org/`
- Philippines (PH-EITI): `https://pheiti.dof.gov.ph/`
- Indonesia: `https://eiti.org/countries/indonesia`
Annual country reports reconciling government revenues vs company payments. **Only Indonesia and Philippines participate in ASEAN.** Free. **Best fiscal transparency data for ASEAN extractives.**

---

---

## Part 4 — Conflict & defense (Thesis C exploratory)

> Added 2026-04-25 after C-gap probe. Thesis C ("Local conflicts here are global proxy wars") was originally flagged as data-gapped. These three sources close the major gaps. Thesis C remains a follow-up candidate — included in main piece if scope allows.

### Defense spending

**SIPRI Military Expenditure Database** — `https://www.sipri.org/databases/milex`
1949–2024 (next release 2026-04-27 will refresh through 2024 with revisions). Single XLSX, multi-tab (current USD / constant USD / share of GDP / share of govt spending / per capita). 2–4 MB. Free, citation required (DOI: `https://doi.org/10.55163/CQGC9685`). All 10 ASEAN present, but **Brunei + Vietnam = limited transparency → year gaps, not estimates**; **Myanmar post-2021 unreliable**; **Laos excluded from regional totals since 2013**. China: SIPRI estimate ~29% above official PLA budget — label "SIPRI estimate" on charts. File pattern: `https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-{YEAR}.xlsx`. Companions (URLs only): SIPRI Arms Transfers (`https://www.sipri.org/databases/armstransfers`) and Arms Industry. **BFNA editorial fit: spending OK; weapons-system + troop-count detail NOT OK** per Marshall call constraints. See `data-raw/sipri-milex/SCOUT.md`.

### Conflict events

**ACLED — Armed Conflict Location & Event Data** — `https://acleddata.com/`
Event-level conflict data. **OAuth password flow + free academic/journalism account** (no payment, no tiered caps; org-affiliated email recommended). API: `GET https://acleddata.com/api/acled/read.csv?country=...&year=...&event_type=...&admin1=...&limit=5000&page=N`. ASEAN coverage 2018+ complete for 8 of 10 (SGP and BRN start 2020). **Filter strategy per flashpoint** (admin1 lists for Myanmar civil war, Mindanao, Papua, Thai South). ASEAN 2018–2024 unfiltered estimate: 80,000–150,000 rows / 40–75 MB. Post-flashpoint filter: 20,000–40,000 rows. **Critical gotchas:** (1) **South China Sea maritime incidents NOT captured** — ACLED only codes events on named land territory or with fatality; use **CSIS Asia Maritime Transparency Initiative** (`https://amti.csis.org/`) as complement. (2) Cyber + economic coercion outside scope. (3) Vietnam/Laos rely on state media — opposition violence under-reported. (4) Myanmar gap Aug 2021–Feb 2023 documented. (5) Myanmar post-coup events 5–10× pre-coup — normalize before charting. (6) "China" as proxy backer won't appear in `actor1`/`actor2` — cross-reference `assoc_actor` + `notes` text. Non-commercial use free; attribution required ("ACLED" + link on graphic). See `data-raw/acled-conflict/SCOUT.md`.

### Diplomatic alignment

**Bailey-Strezhnev-Voeten (BSV) UNGA Ideal Points** — `https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ`
Latest: **July 2025**, 1946–2024 (UNGA 79th), **first version year-indexed (not session-indexed).** Files: `IdealPointsJuly2025.tab` (2–5 MB primary panel) + `UNVotes.Rdata` (50–100 MB raw votes). Free, Harvard Dataverse account required. Two series: `idealpointfp` (final-passage only, recommended) and `idealpointall` (procedural + final). R package `unvotes` (CRAN July 2025 update) wraps BSV in tidy tables — easiest path for subsetting. **Fast-path companion: US State Dept "Voting Practices of UN Members"** annual PDF (2024 release: `https://www.state.gov/wp-content/uploads/2025/07/Voting-Practices-in-the-United-Nations-for-2024.pdf`) — country-by-country US-coincidence %. **Cite-ready signal patterns:** (1) Ukraine ES-11/1 (2022): 8 of 10 ASEAN Yes, **Vietnam + Laos abstained** = clearest fault-line signal. (2) Russia annexation (Oct 2022): most ASEAN broke from China's abstention. (3) Palestine resolutions: ASEAN votes as bloc → POOR discriminator. **Critical gotcha:** Myanmar's UNGA votes 2021–2024 reflect **NUG diplomatic stance** (Ambassador Kyaw Moe Tun retains seat post-coup), NOT the junta's position. Country-governance ≠ UN-seat-representation — flag explicitly. Federal Reserve FEDS Note (Mar 2025) warns 48% of countries change "blocs" depending on vote subset + time window. **Skip Dreher-Sturm affinity dataset** (1970–2008 only, outdated for our window). See `data-raw/un-voting/SCOUT.md`.

### Maritime-specific (South China Sea)

**CSIS Asia Maritime Transparency Initiative (AMTI)** — `https://amti.csis.org/`
Fills ACLED's South China Sea gap. Tracks Chinese coast guard / militia incidents, water-cannon deployments, harassment of fishing fleets, island construction milestones. Mostly narrative reports + interactive maps; no bulk dataset URL confirmed. Use selectively for cite-ready specific incidents.

---

## Worth verifying if thesis needs them

These sources are known to exist and would likely be useful, but were not live-verified during the current pass. Verify at point of use:

**FDI — strategic finance angle:**
- **OECD DAC Creditor Reporting System (CRS)** — project-level DAC donor flows; pairs with AidData GCDF 3.0 for the full "Western concessional + Chinese state" finance picture. Would be essential if the thesis touches US/EU vs China strategic lending competition.
- **US DFC project database** (`https://www.dfc.gov/`) — US government-backed private-sector finance commitments.
- **JICA / JBIC** — Japanese ODA and export credit databases; Japan is a top FDI source for several ASEAN economies.

**Minerals — deeper technical angles:**
- **JOGMEC Mineral Resources Information Center** (Japanese govt) — valuable non-Western perspective on ASEAN producer countries; Japanese companies hold long-standing offtake agreements.
- **USGS country chapters (Minerals Yearbook international volume)** for specific ASEAN producers — deeper than MCS for narrative context. 2–3 year lag.
- **NRGI Resource Governance Index** — extractive sector governance scoring for Indonesia, Philippines, Myanmar, Vietnam, Timor-Leste. Relevant if thesis engages with corruption, resource curse, or ESG.
- **Indonesia GAPKI** (palm oil association) — Indonesia is world's largest palm oil producer; GAPKI and Ministry of Agriculture figures sometimes diverge from MPOB cross-reference.

**Small ASEAN national sources — if country-specific stories emerge:**
- Cambodia CDC, Laos BOL/LSB, Brunei DEPS, Timor-Leste ANPM
- Myanmar DICA — ⚠ unreliable post-2021 regardless of verification

**Commercial, if budget allows:**
- **S&P Global Market Intelligence / SNL Mining** — mine-level production, reserves, ownership, costs. Only worth paying for if the thesis requires mine-by-mine depth.
- **Benchmark Mineral Intelligence** — battery supply chain specialist; best for the downstream Indonesia nickel / precursor cathode story.
- **Wood Mackenzie, CRU, Fastmarkets, Argus** — enterprise subscriptions for deeper metals/energy intelligence.
