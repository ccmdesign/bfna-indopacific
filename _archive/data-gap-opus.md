# IMF PortWatch solves the six-strait data problem

**IMF PortWatch is the single source that covers all six target straits with a consistent, AIS-based metric.** Jointly developed by the IMF and Oxford's Environmental Change Institute, PortWatch tracks **28 major chokepoints globally** — including Malacca, Hormuz, Taiwan, Bab el-Mandeb, Luzon, and Lombok — providing both **daily transit calls (ship count)** and **daily transit trade volume estimates (metric tons)**. The data is free, downloadable in CSV/GeoJSON, updated weekly, and backed by a peer-reviewed Nature Communications paper. No other publicly available source covers all six straits with a single comparable methodology.

---

## Source-by-source findings

### 1. IMF PortWatch — ✅ Covers all 6 straits

| Attribute | Detail |
|-----------|--------|
| **URL** | https://portwatch.imf.org |
| **Metrics** | Daily transit calls (ship count) + daily transit trade volume (metric tons) |
| **Methodology** | Satellite AIS signals from ~90,000 vessels via the UN Global Platform |
| **Date range** | ~2019–present, updated weekly (Tuesdays 9 AM ET) |
| **Coverage** | 28 chokepoints, including all 6 target straits |
| **Format** | CSV, KML, GeoJSON, GeoTIFF, PNG; API (GeoServices, WMS, WFS) |
| **Accessibility** | Fully public and free; citeable as an IMF product |

PortWatch's dataset labeled "Daily Chokepoint Transit Calls and Trade Volume Estimates" is the key resource. Both Luzon Strait and Lombok Strait are confirmed as individually tracked chokepoints within the platform's 24–28 chokepoint framework. The underlying Oxford Maritime Transport Model (OxMarTrans) routes bilateral trade flows across a global maritime network, assigning trade value and volume to each chokepoint a vessel transits. This means the metric reflects **total cargo trade**, not just oil — making it far more representative than EIA's oil-only data.

**Recommended metric for your map: annual transit trade volume in metric tons**, aggregated from PortWatch's daily data. This is the most objective, consistently available, and methodologically uniform metric across all six straits. Annual ship transit counts are the secondary option — slightly less informative for trade flow width but even more straightforward.

### 2. Verschuur et al. (2025), Nature Communications — ✅ Covers all 6 straits

This peer-reviewed paper, "Systemic impacts of disruptions at maritime chokepoints" (Nature Communications 16, 10421), provides the academic foundation for PortWatch's chokepoint analysis. It analyzes **24 chokepoints** using the same OxMarTrans model with **2022 as the base year** and USD $24.9 trillion in global trade.

**Extracted data for the 6 target straits:**

| Strait | % Global Trade (Value) | EVTD (USD B/yr) | Economic Risk (USD B/yr) | Rerouting Category |
|--------|----------------------|-----------------|------------------------|--------------------|
| **Malacca** | ~20% | 12.8 | 2.0 | Short (<5,000 km) |
| **Taiwan** | ~20% | 37.3 | 0.9 | Short (<5,000 km) |
| **Bab el-Mandeb** | ~15% | 58.3 | 4.2 | Long (>5,000 km) |
| **Hormuz** | <10% (value); ~13% (volume) | 1.9 | 0.4 | No alternative |
| **Luzon** | <10% | Low (not quantified in text) | <0.01 | Short (<5,000 km) |
| **Lombok** | <10% | Low (not quantified in text) | <0.01 | Short (<5,000 km) |

The paper groups Luzon and Lombok among "remaining chokepoints" where trade shares fall below 10%. **Exact percentages for these two are not stated in the paper text** but are available in the supplementary data files deposited at Zenodo (DOI: 10.5281/zenodo.15378764), which contains three CSV files: `chokepoint_country_dependencies.csv`, `chokepoint_systemic_economic_risk.csv`, and `chokepoint_systemic_trade_risk.csv`. These files provide country-level breakdowns for all 24 chokepoints and would yield the precise numbers needed for Luzon and Lombok.

### 3. UNCTAD Review of Maritime Transport 2024 — ❌ Does not cover Luzon or Lombok

UNCTAD's 2024 report, themed "Navigating Maritime Chokepoints," focuses on **8 major chokepoints**: Panama Canal, Suez Canal, Bab el-Mandeb, Hormuz, Bosporus, Gibraltar, Malacca, and Cape of Good Hope. Taiwan Strait receives only brief mention in geopolitical context. **Luzon and Lombok are absent entirely.** UNCTAD also relies on proprietary Clarksons Research data for chokepoint-specific metrics, making it less reproducible. While useful for narrative context (global maritime trade reached **12.3 billion tons** in 2023, up 2.4%), it fails the "all 6 straits" requirement.

### 4. UK ONS Ship Crossings Bulletin — ❌ Covers only 3 of 6 straits

The ONS bulletin "Ship crossings through global maritime passages: January 2022 to April 2024" tracks weekly ship crossings for **6 passages**: Dover, Suez, Bab el-Mandeb, Hormuz, Cape of Good Hope, and Taiwan Strait. It covers **3 of the 6 target straits** (Hormuz, Taiwan, Bab el-Mandeb) but **misses Malacca, Luzon, and Lombok entirely**. The data is labeled "official statistics in development," and future editions may expand coverage, but currently it cannot serve as the primary source. It remains useful for weekly trend analysis of the three straits it does cover.

### 5. EIA World Oil Transit Chokepoints — ❌ Oil-only; covers 3 of 6 straits

The EIA's June 2024 update provides **oil transit volumes in million barrels per day** for seven chokepoints: Malacca (**23.7 mb/d**), Hormuz (**20.9 mb/d**), Bab el-Mandeb (**8.6 mb/d**), Suez/SUMED, Danish Straits, Turkish Straits, and Panama Canal. Taiwan, Luzon, and Lombok are absent. Lombok is mentioned as a Malacca alternative route but receives no standalone data. The oil-only metric also fundamentally misrepresents the trade profile of container-heavy straits like Taiwan. The EIA is best used as a supplementary oil-specific overlay, not as the primary metric.

### 6. MacroMicro chart — ⚠️ Derivative of PortWatch; 15 of 28 chokepoints

The MacroMicro charts at `macromicro.me/charts/116043/` (trade volume) and `/116042/` (transit calls) visualize **15 key chokepoints** drawn from PortWatch data. The charts explicitly cite IMF PortWatch as the source. Confirmed chokepoints include Malacca, Hormuz, Bab el-Mandeb, Suez, Panama, and Cape of Good Hope. Whether Luzon and Lombok are among the 15 could not be verified (pages returned 403 errors during research). Since MacroMicro is a visualization wrapper, not an original source, **use PortWatch directly** for authoritative data and full coverage.

### 7. CSIS ChinaPower — ⚠️ Taiwan-focused; partial Luzon data

CSIS's August 2024 report "Crossroads of Commerce" — co-authored by Verschuur using the same OxMarTrans model — provides rich Taiwan Strait data: **~$2.45 trillion** in goods transited (2022), representing over 20% of global maritime trade. It mentions Luzon Strait as an alternative route, noting that **~$13 billion** of Japan's imports pass through Luzon. However, this is a fragmentary data point, not a systematic Luzon throughput figure. Malacca is mentioned contextually; Hormuz, Bab el-Mandeb, and Lombok are not covered.

### 8. Wang et al. (2024), MDPI Sustainability — ⚠️ Covers 5 of 6 (no Luzon)

This AIS-based academic study ranks **15 chokepoints** by Location Quotient using 2012–2022 data. It classifies Malacca, Hormuz, and Suez as "First Class"; Taiwan and Bab el-Mandeb as "Second Class"; and Lombok as "Third-Lower Class." **Luzon Strait is not included in the 15 chokepoints analyzed.** Useful for relative rankings but not as a standalone data source.

### 9. Statista — ❌ Paywalled; repackages EIA data

Statista's maritime chokepoint charts repackage EIA oil transit data. Coverage mirrors EIA: Malacca, Hormuz, Bab el-Mandeb only among the six targets. Full data access requires a subscription. Not an original source.

### 10. World Bank WITS — ❌ Country-level only; no strait data

WITS provides bilateral merchandise trade data by country, product, and partner — strictly country-to-country. It has **no chokepoint or strait-level data whatsoever** and cannot be used for this purpose.

### 11. AIS tracking platforms (MarineTraffic, VesselFinder, ShipTraffic) — ❌ No public aggregate statistics

These platforms show real-time vessel positions but **do not publish aggregate transit count statistics** publicly. VesselFinder sells historical AIS data commercially. MarineTraffic has an analytics product but no free strait-level summaries. None serve as citeable public data sources.

---

## What the numbers actually look like across the 6 straits

Combining PortWatch-derived data, the Verschuur paper, and cross-referenced sources, the approximate scale of each strait emerges:

| Strait | % Global Trade (Value) | Annual Vessels (approx.) | Oil Flow (mb/d) | Tier |
|--------|----------------------|------------------------|-----------------|------|
| **Strait of Malacca** | ~20% | 60,000–100,000 | 23.7 | High |
| **Taiwan Strait** | ~20% | Very high (highest by daily transits in PortWatch) | N/A | High |
| **Bab el-Mandeb** | ~15% | ~20,000 (pre-Houthi disruption) | 8.6 | High |
| **Strait of Hormuz** | <10% value / ~13% volume | ~42,000 | 20.9 | High (oil) / Medium (total) |
| **Luzon Strait** | <10% | Low | N/A | Low |
| **Lombok Strait** | <10% | ~12,800 (Ballast Markets/PortWatch-derived) | N/A | Low |

The gap between the top tier and Luzon/Lombok is substantial. This has important implications for map design — line widths need a scale that distinguishes meaningfully across what is likely a **10x–20x difference** between the busiest and quietest straits.

---

## Final recommendation

**Primary metric: Annual transit trade volume (metric tons) from IMF PortWatch.**

This is the strongest choice for five reasons. First, it covers **all 6 straits** from a single source with uniform AIS-based methodology. Second, the metric captures **all cargo types** (containers, bulk, tanker, LNG) — unlike EIA's oil-only figures. Third, daily granularity allows aggregation to any period (monthly, quarterly, annual). Fourth, the data is **free, downloadable, and API-accessible**, with a clear citation path (IMF PortWatch + Verschuur et al. 2025). Fifth, the underlying OxMarTrans model has been peer-reviewed in Nature Communications and validated against observed vessel capacity data (r = 0.78).

**How to obtain the data:** Download the "Daily Chokepoint Transit Calls and Trade Volume Estimates" dataset from PortWatch. Aggregate daily trade volume estimates to annual totals for each of the 6 straits. This produces a single, comparable metric in tonnes/year for all six. For the Zenodo supplementary data from the Verschuur paper, access DOI 10.5281/zenodo.15378764 for pre-computed country-level chokepoint dependencies and EVTD values.

**If trade value (USD) is preferred** for audience comprehension, the Verschuur paper provides % of global trade value for each chokepoint, which can be converted to absolute USD using the **$24.9 trillion** global maritime trade baseline (2022). For Malacca and Taiwan (~20% each), that implies ~$5 trillion. For Bab el-Mandeb (~15%), ~$3.7 trillion. For Hormuz, Luzon, and Lombok (<10%), the exact shares would need extraction from the Zenodo data, but rough estimates place Hormuz around $2–2.5 trillion (driven by oil value), with Luzon and Lombok in the low hundreds of billions or less.

**Fallback option:** If PortWatch proves technically difficult to access or if Luzon/Lombok data is insufficient in the downloaded dataset, the best two-source combination is **PortWatch (for the 4 major straits) + the Verschuur Zenodo dataset (for all 6, with country-level breakdowns)**. These share the same underlying model, ensuring methodological consistency.

**On the qualitative 3-tier system:** The data supports a **modified tiering**: High (Malacca, Taiwan, Bab el-Mandeb: 15–20% of global trade each), Medium (Hormuz: <10% by value but ~13% by volume, driven by oil), Low (Luzon, Lombok: well under 10%). However, with PortWatch data available for all six, a continuous quantitative scale is achievable and far more defensible than binned tiers.

---

## Quick-reference: source coverage matrix

| Source | Malacca | Hormuz | Taiwan | Bab el-Mandeb | Luzon | Lombok | Metric | Year | Free? |
|--------|---------|--------|--------|---------------|-------|--------|--------|------|-------|
| **IMF PortWatch** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Transit calls + tonnes | 2019–present | ✅ |
| **Verschuur et al. (2025)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | % trade value/volume, EVTD | 2022 base | ✅ |
| UNCTAD RMT 2024 | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❌ | Narrative; tonnes | 2023 | ✅ |
| UK ONS Bulletin | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | Weekly ship crossings | 2022–2024 | ✅ |
| EIA Chokepoints | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | Oil mb/d | 2023 | ✅ |
| MacroMicro | ✅ | ✅ | Likely | ✅ | ? | ? | Tonnes + calls (PortWatch) | 2019–present | ⚠️ |
| CSIS ChinaPower | ⚠️ | ❌ | ✅ | ❌ | ⚠️ | ❌ | Trade value USD | 2022 | ✅ |
| Wang et al. (2024) | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | AIS ranking | 2012–2022 | ✅ |
| Statista | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | Oil mb/d (EIA) | 2023 | ❌ |
| World Bank WITS | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Country-level only | — | ✅ |

## Conclusion

The search for a universal maritime strait metric leads clearly to one answer: **IMF PortWatch's transit trade volume in metric tons**. It is the only publicly available, methodologically consistent dataset that spans all six straits — crucially including the hard-to-find Luzon and Lombok. The academic validation through Verschuur et al. (2025) in Nature Communications adds citation credibility, while the Zenodo data deposit (DOI: 10.5281/zenodo.15378764) provides downloadable CSVs for precise numbers. For a map visualization, aggregate PortWatch's daily estimates into annual totals, apply a logarithmic or square-root scale to handle the large range between top-tier straits (Malacca, Taiwan) and lower-tier ones (Luzon, Lombok), and cite both IMF PortWatch and the Nature Communications paper as the underlying sources.