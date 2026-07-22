# BF-109 — Rename the trade chart to the client's phrasing

## Decision (from the brief, 2026-07-21)

Claudio's call on BF-113 §7: use the client's own suggestion. The trade chart
title becomes **"Share of Trade with China, the U.S. and the EU"**. No serial
comma — consistent with the rest of the piece (BF-116 kept a comma only in the
page tagline, which is verbatim client copy and stays as-is).

Scope is the rename only. Do not redesign the chart, do not touch the data,
do not touch the source-and-years caption.

## Approach

Single string change in `components/infographics/AseanInfographic.vue:390`:

- old: `title="Two-way goods trade with China, the U.S. and the EU"`
- new: `title="Share of Trade with China, the U.S. and the EU"`

The title is a static prop on `CountryChartCard`, rendered identically for
every country and on both `/infographics/asean` and `/embed/asean` (both mount
the same `AseanInfographic` component), so one edit satisfies "every country,
both routes".

## `metric: 'Two-way trade'` in data/asean/trade-stacked.ts

Audited — **internal only, left unchanged**:

- `metric` is declared on the `StackedAreaData` interface and carried on all 11
  records, but `components/asean/CountryStackedArea.vue` never reads it (its
  local interface copy declares `metric: string` at line 13 and nothing in the
  template, tooltip, axis, legend or aria-label references it).
- `AseanInfographic.vue` imports `tradeStackedBySlug` and passes the whole
  record as `:data`; it renders `.source` (caption) but never `.metric`.
- The remaining "two-way" strings in the repo are code comments, `docs/plans/*`
  history, `todos/*`, and `_data/README.md` — none reader-visible.

So the only reader-visible occurrence is the chart title.

## Files

- `components/infographics/AseanInfographic.vue` (line 390) — the rename
- `docs/plans/BF-109-plan.md` — this plan

## Test strategy

Browser test via the `nuxt-dev` launch config (port 3100), on both
`/infographics/asean` and `/embed/asean`, across several countries:

1. Trade tab chart title reads exactly "Share of Trade with China, the U.S. and the EU"
2. The string "Two-way" appears nowhere in the rendered page text
3. The `meta` caption ("Share held by China, the U.S. and the EU · 2010–2024 ·
   Source: CEPII BACI") and the `source` line are intact
4. Percentage labels and the 2010→2024 series still render

## Risks

- **Low.** Static string, no logic, no data.
- Watch: the title is longer/shorter than before — check it does not wrap into
  the chart area on the narrow embed layout.
- Watch: no serial comma is introduced.
