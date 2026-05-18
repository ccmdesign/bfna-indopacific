# _data — ASEAN infographic source data

Canonical, thesis-ready datasets for the ASEAN infographic. Replaces the
hand-fabricated placeholder values in `data/asean/*.ts`.

## Provenance

Extracted from branch `origin/claudio/asean-third-infographic-data`,
commit `b41a830` (`data(asean): wrangle raw scouts into thesis-ready
canonical tables`). That branch is forked pre-refactor (`146073b`); only
the data was pulled, not its dead v1 Vue components.

`_process/` is gitignored; `_data/` is tracked so the build/generator
step and the components can consume it.

## Layout

```
_data/
  wrangled/   canonical thesis-ready tables (the things to wire)
  raw/        BACI bilateral trade (composition + cross-checks)
  sources/    SCOUT.md per source + readiness + thesis options (attribution)
```

## wrangled/

| File | Shape | Feeds |
|------|-------|-------|
| `asean-flows-yearly.csv` | long: `country_iso3, year, partner_group{CHN,USA,EU,GBR,JPN,KOR}, direction, metric{trade_goods,fdi_flow,fdi_position,china_dev_finance,china_commercial_construction,china_commercial_investment}, value_usd_millions, source` | stacked-area trade chart (`trade-stacked.ts`) — filter `metric=trade_goods`, sum both directions = two-way trade |
| `asean-minerals-production.csv` | per country/mineral/year production + world share | critical-minerals cards (production side) |
| `asean-minerals-flows.csv` | bilateral mineral trade flows | critical-minerals cards (flow side) |
| `asean-defense-yearly.csv` | SIPRI milex per country/year | (defense layer, future) |
| `asean-normalization.csv` / `-wide.csv` | normalized cross-source indicators | hero/derived metrics |
| `asean-headline-stats.json` | cite-ready anchors: `thesis_a_d_flows`, `thesis_b_minerals`, `thesis_c_defense`, `policy_anchors` | hero values + paragraph anchors |

## raw/

| File | Note |
|------|------|
| `baci-asean-bilateral-2010-2024.csv` | country↔country totals (`t,i,j,trade_usd_thousands,qty_tons,...`). No HS product column — does NOT directly give top-export/import composition |
| `baci-asean-by-partner-group-2010-2024.csv` | partner-group rollups |
| `baci-asean-minerals-bilateral-2010-2024.csv` | minerals bilateral |

**Open mapping question:** `country-profiles.ts` `topExports/topImports`
need HS-product-level composition. The pulled BACI bilateral is
country-level only — product breakdown source still to be confirmed
(see `sources/baci-trade.SCOUT.md`).

## sources/

`*.SCOUT.md` = per-source coverage/citation notes (use for the real
footer + per-chart `source:` strings). `data-readiness-report.md` and
`thesis-options.md` = editorial framing.

Wrangle notebooks (`_process/asean/notebooks/0X_*.py`) remain on the
data branch — not pulled. Reference them if regenerating.
