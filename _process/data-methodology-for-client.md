# Data Methodology: Trade Flow Visualization

**Prepared by:** CCM Design
**Date:** February 2026
**For:** BFNA — Indo-Pacific Maritime Chokepoints Infographic

---

## Summary

We have sourced a comprehensive dataset from the **IMF PortWatch** platform that covers all six chokepoints with three complementary data dimensions and a **seven-year time series** (2019–2025). This document explains what the data contains, where it comes from, and what it enables for the infographic.

### Three Data Dimensions

1. **Trade Volume (Metric Tonnes)** — the physical mass of cargo transiting each strait. This drives the **width of the flow lines** on the map.
2. **Vessel Transits (Ship Count)** — the number of ships crossing each strait. This provides a second lens: the same strait can look very different by ship count vs. cargo volume.
3. **Vessel Type Breakdown** — each strait's traffic split into container ships, dry bulk carriers, and tankers. This reveals the distinct economic "personality" of each chokepoint.

### Time Dimension

All three metrics are available **daily from January 2019 to present**, aggregated into annual totals. This enables a **timeline slider** that lets users scrub through seven years and watch trade flows evolve — including the Bab el-Mandeb crisis collapse in 2024.

---

## The Data

### Trade Volume — Annual Cargo (2025)

This metric determines the **width of the flow lines** on the map. It measures the physical mass of goods moving through each strait, estimated from satellite observation of vessel drafts.


| Strait                | Annual Volume       | Flow Width (Malacca = 100) | Visual Tier |
| --------------------- | ------------------- | -------------------------- | ----------- |
| **Strait of Malacca** | ~3.3 billion tonnes | 100                        | Tier 1      |
| **Taiwan Strait**     | ~2.2 billion tonnes | 65                         | Tier 1      |
| **Luzon Strait**      | ~1.5 billion tonnes | 46                         | Tier 2      |
| **Lombok Strait**     | ~1.1 billion tonnes | 33                         | Tier 2      |
| **Strait of Hormuz**  | ~1.3 billion tonnes | 39                         | Tier 2      |
| **Bab el-Mandeb**     | ~438 million tonnes | 13                         | Tier 3      |


*Source: IMF PortWatch AIS data, 2025 full-year totals. Bab el-Mandeb reflects ongoing disruption from Houthi attacks (pre-crisis 2023 level was ~1.2 billion tonnes).*

### Vessel Transits — Annual Ship Count (2025)


| Strait                | Annual Vessels | Vessel Index (Taiwan = 100) |
| --------------------- | -------------- | --------------------------- |
| **Taiwan Strait**     | 86,636         | 100                         |
| **Strait of Malacca** | 85,066         | 98                          |
| **Strait of Hormuz**  | 34,863         | 40                          |
| **Luzon Strait**      | 24,091         | 28                          |
| **Lombok Strait**     | 13,021         | 15                          |
| **Bab el-Mandeb**     | 12,076         | 14                          |


*The contrast between these two tables is itself a story: Lombok ranks 5th by ship count but carries enormous tonnage per vessel, because the world's largest deep-draft ships (too large for Malacca) must transit through Lombok instead.*

### Vessel Type Breakdown (2025)

Each strait has a distinct cargo profile, split across three vessel categories:

- **Container ships** — finished goods, electronics, consumer products
- **Dry bulk carriers** — iron ore, coal, grain
- **Tankers** — crude oil, refined products, LNG


| Strait            | Container | Dry Bulk  | Tanker    | Character                 |
| ----------------- | --------- | --------- | --------- | ------------------------- |
| **Malacca**       | 680 Mt    | 1,286 Mt  | 1,293 Mt  | Mixed highway             |
| **Taiwan**        | 677 Mt    | 1,097 Mt  | 327 Mt    | Container + bulk dominant |
| **Hormuz**        | 161 Mt    | 209 Mt    | 918 Mt    | Oil/energy dominant (71%) |
| **Lombok**        | 1 Mt      | 1,024 Mt  | 53 Mt     | Almost pure dry bulk (95%)|
| **Luzon**         | 71 Mt     | 920 Mt    | 501 Mt    | Bulk + tanker             |
| **Bab el-Mandeb** | 33 Mt     | 176 Mt    | 218 Mt    | Collapsed across all types|


---

## Historical Data: Year-Over-Year Trends (2019–2025)

### Annual Trade Volume (Million Tonnes)

| Year | Malacca | Taiwan | Bab el-Mandeb | Luzon | Lombok | Hormuz |
|---|---|---|---|---|---|---|
| 2019 | 2,390 | 1,923 | 905 | 1,278 | 753 | 1,187 |
| 2020 | 2,313 | 1,932 | 900 | 1,380 | 828 | 1,181 |
| 2021 | 2,288 | 2,057 | 978 | 1,512 | 922 | 1,314 |
| 2022 | 2,760 | 1,893 | 1,103 | 1,805 | 946 | 1,478 |
| 2023 | 3,036 | 2,045 | 1,230 | 1,620 | 972 | 1,435 |
| 2024 | 3,108 | 2,045 | **425** | 1,916 | 1,003 | 1,383 |
| 2025 | 3,305 | 2,164 | **438** | 1,505 | 1,080 | 1,299 |

### Annual Vessel Transits (Ship Count)

| Year | Malacca | Taiwan | Bab el-Mandeb | Luzon | Lombok | Hormuz |
|---|---|---|---|---|---|---|
| 2019 | 61,728 | 91,886 | 19,248 | 22,078 | 11,936 | 31,263 |
| 2020 | 58,511 | 91,135 | 19,537 | 23,089 | 12,383 | 30,973 |
| 2021 | 58,547 | 92,590 | 21,228 | 24,678 | 12,849 | 32,673 |
| 2022 | 75,060 | 84,792 | 24,362 | 29,918 | 13,127 | 35,930 |
| 2023 | 79,929 | 87,014 | 26,890 | 27,365 | 13,622 | 36,120 |
| 2024 | 81,346 | 85,013 | **11,819** | 29,012 | 13,505 | 36,232 |
| 2025 | 85,066 | 86,636 | **12,076** | 24,091 | 13,021 | 34,863 |

### Key Stories the Data Tells

1. **Malacca's relentless growth** — up 38% from 2,390 Mt (2019) to 3,305 Mt (2025), reflecting Asia's growing dominance in global trade
2. **The Bab el-Mandeb crisis in real time** — volume collapsed from 1,230 Mt (2023) to 425 Mt (2024), a 65% drop. Container traffic was hit hardest (359 Mt to 27 Mt), while some tanker traffic persisted
3. **COVID's limited impact** — 2020 shows only a modest dip across most straits, with Luzon and Lombok actually growing, suggesting maritime trade was more resilient than expected
4. **Hormuz peaked in 2022** — at 1,478 Mt, then declined to 1,299 Mt by 2025, possibly reflecting energy diversification or sanctions effects

---

## How the Data Was Calculated

### Primary Source: IMF PortWatch

The [IMF PortWatch platform](https://portwatch.imf.org) is a joint project of the International Monetary Fund and the University of Oxford's Environmental Change Institute. It tracks approximately 90,000 vessels globally using satellite-based Automatic Identification System (AIS) data.

**How AIS-to-tonnage works:**

1. Satellites detect each vessel's AIS transponder signal as it crosses a chokepoint's geofenced area
2. The system records the vessel's dimensions and current **draft** (how deep the hull sits in the water)
3. By comparing the current draft to the vessel's known design draft, algorithms estimate the cargo load factor
4. The cargo mass is calculated from the load factor and the ship's deadweight tonnage (DWT) capacity

This methodology was peer-reviewed in: *"Nowcasting Global Trade from Space,"* IMF Working Paper WP/25/93 (May 2025). [Link](https://www.imf.org/-/media/files/publications/wp/2025/english/wpiea2025093-print-pdf.pdf)

PortWatch monitors **28 chokepoints globally**, including all six of our target straits. The data is updated weekly (Tuesdays, 9 AM ET) and is publicly accessible.

### Data Access

We accessed the PortWatch dataset directly through its public ArcGIS API, pulling **15,618 daily records** across all six straits from January 2019 to February 2026. For each day and each strait, the dataset provides:

- **Vessel counts** by type (container, dry bulk, tanker, ro-ro, general cargo)
- **Cargo capacity estimates** by type (in metric tonnes, derived from AIS draft analysis)

We aggregated this daily data into annual totals. The API endpoint is publicly accessible and the dataset is updated weekly.

### Cross-Validation

We cross-referenced the PortWatch numbers against multiple independent sources:

- **Verschuur et al. (2025)**, "Systemic impacts of disruptions at maritime chokepoints," *Nature Communications* 16, 10421. Uses the Oxford Maritime Transport Model (OxMarTrans) — the same underlying model used by IMF PortWatch. [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC12644514/)
- **EIA World Oil Transit Chokepoints** (June 2024): Confirmed oil-specific volumes for Malacca (23.7 mb/d), Hormuz (20.9 mb/d), and Bab el-Mandeb (8.6 mb/d). [Link](https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints)
- **UK ONS Ship Crossings Bulletin** (Jan 2022–Apr 2024): Weekly ship counts for Hormuz, Taiwan, and Bab el-Mandeb. [Link](https://www.ons.gov.uk/businessindustryandtrade/internationaltrade/bulletins/shipcrossingsthroughglobalmaritimepassages/january2022toapril2024)
- **CSIS ChinaPower** (2024): Taiwan Strait analysis confirming ~$2.45 trillion in goods and ~1,200 weekly ship crossings. [Link](https://features.csis.org/chinapower/china-taiwan-strait-trade/)
- **UNCTAD Review of Maritime Transport 2024**: Global context (12.3 billion tonnes of total seaborne trade in 2023). [Link](https://unctad.org/system/files/official-document/rmt2024_en.pdf)

---

## What the Numbers Reveal

The data produces a visual hierarchy that differs from popular perception:

- **Malacca and Taiwan are dominant** — together handling over 5.5 billion tonnes annually. This aligns with expectations.
- **Luzon is surprisingly large** — at 1.5 billion tonnes, it handles more tonnage than Hormuz. This is because Luzon is the primary gateway for trans-Pacific bulk trade (East Asia to the Americas). It is wide (250 km) and deep, so it rarely appears in "chokepoint" discussions, but the physical volume of cargo is enormous.
- **Lombok punches above its weight** — despite its obscurity, it carries over 1 billion tonnes because it is the mandatory route for the world's largest ships (Ultra-Large Crude Carriers and Valemax ore carriers that cannot physically fit through the shallow Malacca Strait).
- **Hormuz is mid-sized by tonnage but highest-risk** — it carries ~1.3 billion tonnes, but those tonnes are overwhelmingly oil and LNG (71%). The economic and strategic consequences of disruption here far exceed what the line width alone conveys. We plan to address this through the vessel type breakdown and tooltip content.
- **Bab el-Mandeb is in crisis** — the dramatic 65% collapse from 2023 to 2024 is visible in real time through the data. Pre-crisis, it was a major corridor (~1.2 billion tonnes); today it carries less than a third of that.

---

## What This Enables for the Infographic

With this dataset, we propose three interactive features:

### 1. Timeline Slider (2019–2025)

Users scrub through seven years and watch flow lines change in real time:
- Malacca steadily thickening year over year
- The Bab el-Mandeb line collapsing in late 2023/2024
- COVID's surprisingly modest impact on maritime trade

### 2. Dual Metric Toggle (Tonnes vs. Ships)

Users switch between "cargo volume" and "ship count" views. The same strait can look very different depending on the metric — Lombok has very few ships but enormous tonnage per vessel, while Taiwan has the highest ship traffic but ranks second in cargo mass.

### 3. Vessel Type Breakdown

The cargo profile (container / dry bulk / tanker) for each strait can be displayed in tooltips, overlays, or as a stacked visualization. This reveals why each strait matters differently — Hormuz is an energy lifeline, Lombok is a bulk commodity corridor, Malacca is a mixed global highway.

---

## What We Need From You

1. **Bab el-Mandeb treatment:** Should the map show pre-crisis capacity (~1.2B tonnes, 2023) or current disrupted volume (~438M tonnes, 2025), or both? We suggest showing the disrupted state as default with a visual indicator (e.g., dashed/disrupted line style) and a tooltip explaining the pre-crisis level.
2. **Luzon/Lombok rankings:** The data shows these are larger trade corridors (by physical volume) than commonly assumed. Is this a finding you want to highlight, or does it need additional context?
3. **Timeline slider:** Do you want us to implement the timeline feature? Users would scrub from 2019 to 2025 and see flow lines animate in proportion to each year's data.
4. **Dual metric toggle:** Should we offer a "Tonnes vs. Ships" toggle? This highlights contrasts like Lombok (few ships, massive tonnage) and adds analytical depth.
5. **Vessel type display:** How should we surface the container/bulk/tanker breakdown — tooltips only, a toggle/filter, or a stacked bar within the flow line itself?

---

## Source Links


| Source                                   | URL                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IMF PortWatch                            | [https://portwatch.imf.org](https://portwatch.imf.org)                                                                                                                                                                                                                                           |
| IMF PortWatch API (dataset used)         | [ArcGIS FeatureServer](https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0)                                                                                                                                                               |
| Verschuur et al. (2025) paper            | [https://pmc.ncbi.nlm.nih.gov/articles/PMC12644514/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12644514/)                                                                                                                                                                                         |
| Verschuur et al. (2025) data (Zenodo)    | [https://zenodo.org/records/15378764](https://zenodo.org/records/15378764)                                                                                                                                                                                                                       |
| IMF Working Paper on AIS methodology     | [https://www.imf.org/-/media/files/publications/wp/2025/english/wpiea2025093-print-pdf.pdf](https://www.imf.org/-/media/files/publications/wp/2025/english/wpiea2025093-print-pdf.pdf)                                                                                                           |
| EIA World Oil Transit Chokepoints        | [https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints](https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints)                                                                                                               |
| UK ONS Ship Crossings Bulletin           | [https://www.ons.gov.uk/businessindustryandtrade/internationaltrade/bulletins/shipcrossingsthroughglobalmaritimepassages/january2022toapril2024](https://www.ons.gov.uk/businessindustryandtrade/internationaltrade/bulletins/shipcrossingsthroughglobalmaritimepassages/january2022toapril2024) |
| CSIS ChinaPower — Taiwan Strait          | [https://features.csis.org/chinapower/china-taiwan-strait-trade/](https://features.csis.org/chinapower/china-taiwan-strait-trade/)                                                                                                                                                               |
| UNCTAD Review of Maritime Transport 2024 | [https://unctad.org/system/files/official-document/rmt2024_en.pdf](https://unctad.org/system/files/official-document/rmt2024_en.pdf)                                                                                                                                                             |

---

> **Note for Contributors:** The canonical location for the straits dataset is `data/straits/straits.json`. The copy at `_process/straits.json` is a data preparation artifact. If you update the data, always update `data/straits/straits.json` first — that is the file consumed at build time.
