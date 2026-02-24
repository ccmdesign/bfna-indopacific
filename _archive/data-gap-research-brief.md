# Data Gap Research Brief

## Objective

Find a **single quantitative metric** that is consistently available across all 6 straits, to use as the basis for representing the **width of trade flow lines** on the interactive map.

---

## The 6 Straits

1. Strait of Malacca
2. Strait of Hormuz
3. Taiwan Strait
4. Bab el-Mandeb
5. Luzon Strait
6. Lombok Strait

---

## What We Already Have

### Trade value (USD)
- Malacca: $3.5T (2023)
- Taiwan: $2.45T (2022, CSIS)
- Hormuz: not available (only oil-specific volumes)
- Bab el-Mandeb: not available (only % figures)
- Luzon: not available
- Lombok: not available

**Gap**: Only 2 of 6 straits have dollar values.

### % of global trade
- Malacca: 30–40%
- Taiwan: 20%+
- Hormuz: ~20% (but petroleum-specific, not total trade)
- Bab el-Mandeb: 12% (by volume)
- Luzon: not available
- Lombok: not available

**Gap**: Missing for 2 straits. Definition inconsistent (by value vs. by volume, total trade vs. oil-only).

### Oil flow (million barrels/day, 2023)
- Malacca: 23.7 mb/d
- Hormuz: 20.9 mb/d
- Bab el-Mandeb: 8.6 mb/d
- Taiwan: not available
- Luzon: not available
- Lombok: not available

**Gap**: Only 3 of 6 straits covered. Oil-only, doesn't reflect container/general cargo trade.

---

## What We Need

One of the following metrics, **for all 6 straits**, ideally from the same source or methodology:

### Candidate Metrics (in order of preference)

1. **Annual trade value (USD)** — best for general audience comprehension and flow width scaling
2. **Annual trade volume (tonnes)** — more objective but less intuitive to audiences
3. **Annual ship crossings / transits** — available from ONS for some straits (2022–2024), may exist elsewhere
4. **% of global seaborne trade** — useful if consistently defined (by value or by volume, not mixed)

### Promising Sources to Investigate

- **IMF PortWatch** (https://portwatch.imf.org) — already used by Georgia; may have comparable transit data across all straits
- **UNCTAD Review of Maritime Transport** (2024/2025 reports) — may have normalized chokepoint comparisons
- **UK ONS Ship Crossings Bulletin** (Jan 2022–Apr 2024) — has weekly ship counts; check which straits are covered
- **EIA World Oil Transit Chokepoints** — oil-specific but comprehensive; check if it covers all 6
- **MacroMicro chart** (https://en.macromicro.me/charts/116043/world-key-maritime-chokepoints-transit-trade-volume) — referenced by Georgia; claims transit volume for 15 chokepoints over 10 years
- **CSIS ChinaPower** — Taiwan Strait specific but may have comparative data
- **Statista** — crude oil volume chart (referenced by Georgia) covers select routes; check coverage
- **World Bank WITS** (https://wits.worldbank.org) — regional trade analysis; may allow deriving strait-level estimates
- **Lloyd's List / UNCTAD stat** — commercial but may have public summaries

### Key Constraints

- Data should be from **2022 or later** to stay current
- Must cover **all 6 straits** (Luzon and Lombok are the hardest to find)
- Ideally from the **same source** so methodology is consistent
- Needs to be **publicly available / citeable** (BFNA credibility requirement)

---

## RESOLVED — Verschuur et al. (2025) / Zenodo Dataset

Data extracted from [Zenodo DOI: 10.5281/zenodo.15378764](https://zenodo.org/records/15378764) — supplementary data for Verschuur et al., "Systemic impacts of disruptions at maritime chokepoints," *Nature Communications* 16, 10421 (2025). Based on 2022 trade data using the OxMarTrans model (same model behind IMF PortWatch).

### Trade Value (USD) — All 6 Straits

| Strait | Trade Value (USD) | Value Index (Malacca = 100) |
|---|---|---|
| **Strait of Malacca** | $4,857 B | 100.0 |
| **Taiwan Strait** | $4,770 B | 98.2 |
| **Bab el-Mandeb** | $3,717 B | 76.5 |
| **Strait of Hormuz** | $1,770 B | 36.4 |
| **Luzon Strait** | $588 B | 12.1 |
| **Lombok Strait** | $286 B | 5.9 |

### Trade Volume (Metric Tonnes) — All 6 Straits

| Strait | Trade Volume (kt) | Volume Index (Malacca = 100) |
|---|---|---|
| **Taiwan Strait** | 5,805,894 kt | 131.2 |
| **Strait of Malacca** | 4,426,192 kt | 100.0 |
| **Bab el-Mandeb** | 2,524,994 kt | 57.0 |
| **Strait of Hormuz** | 2,118,676 kt | 47.9 |
| **Lombok Strait** | 1,562,509 kt | 35.3 |
| **Luzon Strait** | 271,932 kt | 6.1 |

### Source & Citation

- **Data**: `chokepoint_country_dependencies.csv` from Zenodo DOI: 10.5281/zenodo.15378764
- **Paper**: Verschuur et al. (2025), "Systemic impacts of disruptions at maritime chokepoints," *Nature Communications* 16, 10421
- **Model**: Oxford Maritime Transport Model (OxMarTrans), same as IMF PortWatch
- **Base year**: 2022 bilateral trade data
- **License**: CC-BY 4.0

### Recommendation for Flow Width

**Use Trade Value (USD)** as the flow width metric:
- Covers all 6 straits from one source with consistent methodology
- More intuitive to general audiences than metric tonnes
- Cleanly separable into 3 visual tiers:
  - **Tier 1** (~$4.8T): Malacca, Taiwan — near equal, widest flows
  - **Tier 2** (~$1.8–3.7T): Bab el-Mandeb, Hormuz — medium flows
  - **Tier 3** (~$0.3–0.6T): Luzon, Lombok — thinnest flows

Note: Trade value and trade volume tell slightly different stories. Hormuz ranks 4th by value but carries heavy bulk oil tonnage. Lombok ranks last by value ($286B) but 5th by volume (1,562,509 kt) because it handles large-vessel bulk cargo. For a general-audience infographic, **trade value is the better representation** of economic significance.

---

## Previous Fallback Plan (no longer needed)

~~If no single normalized metric can be found for all 6 straits:~~

- ~~Use a **3-tier system** (High / Medium / Low) based on qualitative assessment~~
- ~~This matches the visual approach already used in the PoC sketch~~
