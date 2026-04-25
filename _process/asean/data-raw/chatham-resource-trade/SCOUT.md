# Chatham House Resource Trade Earth — Scout
Scouted: 2026-04-24

## 1. Source

**Landing:** https://resourcetrade.earth/data
**About:** https://resourcetrade.earth/about

## 2. Access

- UI exports at chart level (per-query CSV via explorer)
- **No public REST API or bulk-file URL confirmed.**
- For full bilateral slices: **email Chatham House directly**. Standard academic/journalism requests often granted.
- No paywall for the explorer UI. Bulk likely requires registration/request.

## 3. Coverage

- Years: **2000 → present** (Comtrade underlying goes to 1962; reconciled CHRTD layer from 2000)
- 1,350+ natural resource product types mapped to proprietary hierarchy
- 200+ territories, bilateral (reporter × partner) — ASEAN × partner slices possible
- **Metals/minerals covered:** HS chapter 26 (ores), 75 (nickel), 80 (tin), 76 (aluminum/bauxite), 2846 (REE compounds)

## 4. Reconciliation Methodology

1. Exporter FOB vs. importer CIF report compared per bilateral flow
2. Price-per-tonne (value/weight) ratios checked against global distribution at HS6
3. Outliers flagged; retain more internally consistent report; if both plausible → weighted average or importer figure
4. **Materially better than raw Comtrade for Indonesia→China nickel corridor** (Indonesia export ban 2020 created reporting gaps)

## 5. Gotchas

**HS codes for nickel (matters for battery narrative):**
- HS 260400: nickel ores and concentrates (ore stage)
- HS 750110: nickel mattes
- HS 750120: nickel oxide sinters
- HS 750210: unalloyed nickel (refined metal)
- HS 282736 / 283329: nickel sulfate (battery precursor)
- HS 720260: ferronickel (steel, not batteries)

**Indonesia 2020 ore ban:** HS 260400 flows from Indonesia disappear post-2020, reappear as HS 750110/750120 (processed intermediates). Before/after discontinuity — annotate in viz.

**Singapore re-export distortion:** Singapore does NOT report re-exports separately in Comtrade. SG-attributed flows for Ni and Sn inflated. CHRTD's price-plausibility reconciliation helps but treat SG skeptically.

**Myanmar tin/Cu:** Chinese customs mirror data more reliable than Myanmar Comtrade submissions.

**Refining stage matters:** infographic narrative ("ASEAN supplies the West") must distinguish ore vs. intermediate vs. refined metal. Aggregated HS conflates — overstates ASEAN value-add.

## 6. Size Estimate (ASEAN slice)

ASEAN-10 × 5 partner blocs × 24 years × ~60 HS6 critical-mineral codes ≈ 72,000 rows @ ~200 bytes = ~14MB uncompressed, ~2–3MB gzipped. Trivial.

## 7. Fallback — UNCTAD SDG Pulse Critical Minerals (2025)

https://sdgpulse.unctad.org/critical-minerals/ — HS-coded bilateral export flows for Co (260500), Ni (260400), Graphite (250410), Li (253090, 283691), Cu (260300). Not reconciled but cleanest public summary.

Technical note: https://unctad.org/publication/technical-note-critical-minerals

## 8. Next action

- Email Chatham House (resourcetrade@chathamhouse.org) for ASEAN × {US,EU,CHN,JPN,KOR} × 2010–2024 × critical-mineral HS6 codes
- Parallel: build fallback pipeline from UN Comtrade + UNCTAD SDG Pulse CSVs (not reconciled but faster)
- Build HS6 filter list: 260400, 260500, 720260, 750110, 750120, 750210, 760100, 282736, 283329, 250410, 253090, 283691, 260300, 261390, 261210
