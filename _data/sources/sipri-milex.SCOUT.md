# SIPRI Military Expenditure Database — Scout
Scouted: 2026-04-25

## 1. Source

**Landing:** https://www.sipri.org/databases/milex
**Interactive:** https://milex.sipri.org/
**DOI:** https://doi.org/10.55163/CQGC9685

**File pattern:** `https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-{YEAR}.xlsx`
- 2025 release file: `SIPRI-Milex-data-1949-2024.xlsx`
- **2026 release expected 2026-04-27** (two days from scout date) — same URL pattern, will cover through 2024 with revisions

## 2. Format & Size

Single XLSX, multi-tab (one tab per series). 2–4 MB. Countries as rows, years as columns.

## 3. Auth

None. Free download. Citation required (DOI). Attribution required on charts. Commercial redistribution of raw data needs separate license — academic/journalism infographic with aggregated/visualized figures within normal use.

## 4. Coverage

- **Years: 1949–2024** (2026 release will refresh 2024 + add revisions)
- **All 10 ASEAN members present** + Timor-Leste
- **No estimates for non-reporting countries** — Brunei + Vietnam will have year-gaps, NOT estimates
- Transparency tiers (SIPRI assessment):
  - Limited/no transparency: Brunei, Vietnam
  - Partial: Myanmar, Singapore
  - Higher: Indonesia, Philippines, Thailand
- Laos excluded from regional totals since 2013 (no data)

## 5. Series (Tabs)

- Current USD (market exchange rates)
- **Constant USD** (2023 base in 2025 release; may shift to 2024 in 2026)
- Share of GDP
- Share of government expenditure
- Per capita (USD)

**Recommendation:** constant USD for trend line + share of GDP as secondary annotation (contextualizes small economies like Brunei/Cambodia).

## 6. Filter Strategy

Single XLSX, all countries one sheet per series. Rows = countries, cols = years. Pull 17-country subset (10 ASEAN + China, US, Russia, India, Japan, S.Korea, Australia) by row filter. No per-country downloads needed.

## 7. Gotchas

| Country | Issue |
|---|---|
| **China** | SIPRI estimate ~29% above official PLA budget ($317.6B vs $246.5B for 2024). SIPRI adds off-budget items (R&D, paramilitary). PPP-adjusted estimates (Fravel et al. 2024) put it at ~$471B. Label charts "SIPRI estimate." |
| **Myanmar** | Partial transparency; junta-era figures post-2021 unreliable. Gaps post-2021. |
| **Vietnam** | Limited transparency. Series will have gaps or flat estimates — do NOT use for trend storytelling. |
| **Brunei** | Limited transparency, small absolute values but high GDP share. Gap years likely. |
| **Singapore** | Partial — top-line figure published, limited breakdown. |
| **Laos** | Excluded from regional totals since 2013 (no data). |

## 8. Companion Datasets (URLs only)

- **SIPRI Arms Transfers:** https://www.sipri.org/databases/armstransfers — supplier/recipient flows of major conventional weapons, 1950–2024
- **SIPRI Arms Industry:** https://www.sipri.org/databases/armsindustry — top-100 arms companies by revenue
- Both relevant if Thesis C needs arms-flow dimension (BFNA editorial constraint: avoid weapons-system or troop-count detail)

## 9. Fetch (after 2026-04-27 release)

```bash
curl -sSL -o data-raw/sipri-milex/SIPRI-Milex-data-1949-2024.xlsx \
  "https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2024.xlsx"
```

## 10. BFNA editorial fit

Defense **spending** + broad strategic framing = OK. Avoid: weapons-system detail, troop counts, specific deployments. Marshall confirmed in 2026-04-07 call.
