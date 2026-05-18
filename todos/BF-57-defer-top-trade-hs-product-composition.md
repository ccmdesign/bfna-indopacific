---
severity: P2
status: deferred
resolution: deferred to a separate HS-product-source ticket (see "Future path")
autofix_class: manual
owner: human
requires_verification: false
pre_existing: true
file: data/asean/country-profiles.ts
line: topExports / topImports arrays (all 9 profiles)
reviewer: BF-57 (ce-work, autonomous)
created: 2026-05-18
ticket: BF-57
---

# Defer top-exports / top-imports HS-product composition

## Blocker

`data/asean/country-profiles.ts` exposes a `topExports[]` and `topImports[]`
per country (`{ label, valueUsdB }`) — HS-product composition rows like
"Coal $48B", "Palm oil $28B", "Integrated circuits $92B". These drive the
`CountryTradeBalanceBars` / `CountryNarrativeCard` dock cards.

BF-57's brief was to source every factual field in this file. The hero and
paragraph are now anchored to real data. The `topExports` / `topImports`
**cannot be**, because no HS-product-level source exists in the repo or is
cheaply recoverable.

## Evidence — no HS-product source exists (BF-57 Decision D1)

Exhaustive search performed during BF-57 planning:

- `_data/raw/baci-asean-bilateral-2010-2024.csv` header is
  `t,i,j,trade_usd_thousands,qty_tons,i_iso3,i_name,j_iso3,j_name,direction`
  — country↔country totals, **no `k` / HS6 column**. Cannot give product
  composition.
- The file the ticket flagged, `baci-asean-bilateral-2010-2024-raw-codes.csv`,
  **does not exist in `_data/raw/`**. It exists only on the data branch
  (`origin/claudio/asean-third-infographic-data:_process/asean/data-raw/
  baci-trade/baci-asean-bilateral-2010-2024-raw-codes.csv`) and its header is
  `t,i,j,trade_usd_thousands,qty_tons` — "raw-codes" means raw ISO-numeric
  **country** codes (`i`/`j` not yet ISO3-mapped), **NOT HS product codes**.
  Still country-level only.
- `_data/raw/` contains exactly three CSVs:
  `baci-asean-bilateral-2010-2024.csv`,
  `baci-asean-by-partner-group-2010-2024.csv`,
  `baci-asean-minerals-bilateral-2010-2024.csv`. Only the minerals file has an
  `hs6` column, and it is restricted to ~15 critical-mineral HS6 codes
  (per `_data/sources/baci-trade-minerals.SCOUT.md` §2 — nickel ore,
  ferronickel, cobalt ore, copper ore, etc.). It cannot produce general
  top-export/import composition: no coal, palm oil, garments, telephones,
  integrated circuits, rice, footwear, or vehicles.
- `_data/sources/baci-trade.SCOUT.md` §6 ("Product-Level Need") confirms
  product-level granularity was always **optional**: "Country totals
  sufficient for fault-line/hedging thesis. HS chapter breakdowns optional
  for 'what's traded' annotation layer." It was never pulled at HS-product
  granularity for general trade.
- The data-branch wrangle notebooks (`_process/asean/notebooks/01..06`)
  contain no general HS-product composition wrangle.

## Decision (BF-57 D1) — Option (b): defer, do not fabricate

This is a "design is the pitch" portfolio piece. A wrong sourced-looking
number is worse than an honest, tracked deferral. Therefore:

- `topExports[]` / `topImports[]` are **left in place** so the trade-balance
  cards keep rendering (no empty-state regression).
- They are **marked in-code as unverified placeholder** with a comment
  pointing at this note.
- They are **NOT** regenerated, refreshed, estimated, or
  "directionally approximated" with new guessed numbers. The arrays carry the
  pre-BF-57 placeholder values unchanged.

## Future path (a separate ticket)

To wire real HS-product composition later:

1. Re-download the CEPII BACI HS07 V202601 ZIP
   (`https://www.cepii.fr/DATA_DOWNLOAD/baci/data/BACI_HS07_V202601.zip`,
   ~1.68 GB, per `_data/sources/baci-trade.SCOUT.md` §1).
2. Author an HS-product filter notebook under `_process/asean/notebooks/`:
   for each ASEAN country, top-N HS6 (or HS2 chapter) export and import
   products by value for the latest year, mapped to human labels.
3. Emit a new wrangled CSV, e.g.
   `_data/wrangled/asean-trade-composition.csv`
   (country_iso3, direction, hs_code, label, value_usd_millions, year, source).
4. Extend the hero generator (or add a sibling generator following the
   `scripts/build-asean-country-hero.mjs` pattern) to populate
   `topExports` / `topImports` deterministically, replacing the placeholder
   arrays and removing the in-code marker.

Citations: `_data/sources/baci-trade.SCOUT.md` (§1 download, §5 schema,
§6 product-level need), `_data/sources/baci-trade-minerals.SCOUT.md`
(§2 — the minerals file's restricted HS6 scope).
