# BF-98 — Trade chart clarity: rename, caption, per-partner value labels

## Problem
The trade stacked-area card ("Trade with US, China, EU · 2010–2024") isn't
self-explanatory, and its right-edge partner labels are skipped whenever a
band's on-screen height is < 14px — which is every year for Myanmar's US
band and for all three of Timor-Leste's bands. The client reads this as
"the data is missing" when it's actually just invisible at scale.

## Changes

### 1. Card copy (`components/infographics/AseanInfographic.vue`)
- Title: `"Two-way goods trade with China, the U.S. and the EU"` (drop the
  year range from the title — it moves into the caption).
- Replace `meta="USD billions"` with the caption:
  `"Exports plus imports per year, in USD billions, 2010–2024. Source: CEPII BACI."`
- Tornado card (`CountryTradeBalanceBars`): give `meta` the same explicit
  treatment — what the bars show + unit + source, since the `source` prop is
  already "indicative — not individually sourced".

### 2. Value formatting helper (`CountryStackedArea.vue`)
Single `formatTradeValue(vMillions: number): string`, used for both the
end-of-series labels and the Y-axis top tick (the top tick currently divides
by 1000 and rounds to 0 decimals, which renders "$0B" for Timor-Leste, whose
total 2024 two-way trade is ~$319M — under $1B):
- `abs >= 1000` → billions, 1 decimal, trailing `.0` dropped → `$12.6B`
- `100 <= abs < 1000` → millions, whole number → `$267M`
- `abs < 100` → millions, 1 decimal → `$24.6M`
This guarantees no sub-$1B value ever rounds to `$0B` and matches the two
concrete examples in the brief (Timor CHN 266.5 → `$267M`, Timor USA 24.6 →
`$24.6M`).

### 3. Label layout — always render all 3 partner labels, resolve collisions
Today: labels are placed at the true band midpoint and dropped if
`bandHeight < 14`. New behavior — never drop a label:
- Compute each partner's *true* right-edge midpoint `y` (the anchor point
  for a leader line) from the stacked series as today.
- Compute *desired* label positions in a right-side gutter using a simple
  1D greedy collision resolver: sort the 3 true-y anchors ascending, walk
  top→bottom pushing any label that's `< minGap (14px)` from the previous
  one down to `previous + minGap`; if the bottom label overflows the chart's
  usable vertical range, shift the whole resolved stack up and re-run the
  push-down pass once (stable for 3 items).
- If a label's resolved `y` differs from its true anchor `y` by more than a
  couple px, draw a thin leader line (partner color, low opacity) from the
  true anchor point to the label's start position — this is what makes a
  visually-collapsed band still read as "present, here's its value."
- Independent of the leader line, draw a small min-height tick/dot at the
  true anchor point in the partner's color so a near-zero-height band still
  leaves a visible mark on the chart itself, without changing the area path
  (no distortion of the actual encoding).
- Partner label text shortens to `China` / `US` / `EU` (was `United States`
  / `European Union`) to leave room for the value suffix on one line, e.g.
  `US $788M`.

### 4. Verification
- Manual check across all 11 countries (`data/asean/trade-stacked.ts` keys)
  for NaN / undefined partner values (some countries may have fewer than 3
  partners some years — guard the formatter and stack against `undefined`).
- Browser check (STEP 6): idle→docked transition, `/embed/asean` route,
  Myanmar + Timor-Leste (missing-band fix), one large country (label
  collision under normal conditions), confirm no clipping against the card's
  right edge margin (`margin.right = 100` — may need to grow slightly to fit
  `"US $788M"`-length labels + leader-line gutter).

## Files touched
- `components/infographics/AseanInfographic.vue` (card title/meta wiring x2)
- `components/asean/CountryStackedArea.vue` (formatter, label collision
  resolver, leader lines, min-height tick, top-tick fix, shortened partner
  names)
