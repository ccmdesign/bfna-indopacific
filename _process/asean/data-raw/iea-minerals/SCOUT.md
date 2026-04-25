# IEA Critical Minerals — Scout
Scouted: 2026-04-24

## 1. Sources

**Global Critical Minerals Outlook 2025** (primary report)
- Landing: https://www.iea.org/reports/global-critical-minerals-outlook-2025
- **Direct PDF:** https://iea.blob.core.windows.net/assets/ef5e9b70-3374-4caa-ba9d-19c72253bfc4/GlobalCriticalMineralsOutlook2025.pdf (free, no login)
- Exec summary: https://www.iea.org/reports/global-critical-minerals-outlook-2025/executive-summary
- Key minerals overview: https://www.iea.org/reports/global-critical-minerals-outlook-2025/overview-of-outlook-for-key-minerals
- Regional snapshots (SE Asia qualitative): https://www.iea.org/reports/global-critical-minerals-outlook-2025/regional-snapshots

**Data Explorer (interactive)**
- https://www.iea.org/data-and-statistics/data-tools/critical-minerals-data-explorer
- CC BY 4.0, requires free IEA account for download
- 37 minerals, scenarios: STEPS / APS / NZE + 11 alt tech cases
- Demand projections to 2040/2050 — **no supply-side country breakdowns in free tier**

**Dataset product page**
- https://www.iea.org/data-and-statistics/data-product/critical-minerals-dataset

## 2. Auth / Licensing

- CMO 2025 PDF: **free, no login**
- Data Explorer: free IEA account required
- Raw WEO/ETP model data with country-level supply: paid subscription
- Indonesia's exact tonnage projections: not in free tier

## 3. Cite-Ready Numbers (confirmed)

**Indonesia nickel 90% stat — CONFIRMED.** CMO 2025 exec summary: ~**90% of nickel supply growth between 2020 and 2024 came from Indonesia alone**. Cross-confirmed in CMO 2024. This is growth share, not stock share.
- Indonesia stock share: **>60% of global output (2024)**, projected 67% of mined nickel by 2030
- Supply concentration: top-3 refined material suppliers avg = **86% share (2024)**, up from 82% (2020)
- **China refines ~70% across 19 of 20 analyzed minerals**

**Demand projections under STEPS (2024 → 2040):**

| Mineral | Growth |
|---|---|
| Lithium | 5× |
| Nickel | 2× |
| Graphite | 2× |
| Cobalt | +50–60% |
| REEs | +50–60% |
| Copper | +30% |

**Other:**
- Energy sector share of battery metals demand growth = **85% (2024)**
- LFP battery share = **~50% (2024)**, up from <10% (2020) — relevant to Indonesia NMC-vs-LFP exposure
- Supply-demand gaps by 2035 (STEPS): Cu deficit ~30%, Li deficit ~40%, graphite/REE cover only 35–40% of N-1 demand, Ni covers <55%

## 4. Gotchas

- **"90%" is 2020–2024 growth window** — not stock share. Specify period when citing.
- STEPS vs. APS vs. NZE diverge sharply for Li/Ni post-2030 (NZE ~2–3× STEPS by 2040). Always name scenario.
- LFP share-shift could soften Indonesia Ni demand exposure vs. headline EV growth
- "Committed" vs. "announced" mine supply — deficits differ sharply depending on which counted
- Recycling: material for Co/Li by 2035 but cannot plug deficits at scale

## 5. Fallbacks (if IEA paywalls something needed)

- **World Bank Climate-Smart Mining:** https://www.worldbank.org/en/topic/extractiveindustries/brief/climate-smart-mining-minerals-for-climate-action — country production, some projections
- **IRENA Critical Materials** — free PDFs, less granular
- **S&P Global Market Intelligence** — Indonesia country detail, paywalled

## 6. Fetch

```bash
curl -sSL -o data-raw/iea-minerals/GlobalCriticalMineralsOutlook2025.pdf \
  "https://iea.blob.core.windows.net/assets/ef5e9b70-3374-4caa-ba9d-19c72253bfc4/GlobalCriticalMineralsOutlook2025.pdf"
```
