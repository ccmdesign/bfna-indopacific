# BF-99 — Idle sidebar polish: legend separation + Timor-Leste docking check

## 1. Legend visual separation

Container treatment: give `.asean-legend__menu` (the expanded list wrapper in
`components/asean/AseanLegend.vue`) the same translucent-panel language as the
collapsed pill (`.asean-legend__pill`) already uses:

- `background: rgba(2, 38, 64, 0.5)`
- `backdrop-filter: blur(12px)` (+ `-webkit-` prefix)
- `border: 1px solid rgba(255, 255, 255, 0.1)`
- `border-radius` (larger radius than the pill since it's a block, e.g. 16px)
- `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35)` to match the pill's elevation
- Internal padding so the rows don't sit flush against the new edge
- Keep `width: var(--intro-w, ...)` on the outer `.asean-legend` (or move to
  `__menu`) so the panel's edges still line up with the intro column

The intro block (`.asean-infographic__intro` in `AseanInfographic.vue`) stays
untouched — no chrome, no background.

Selectors touched:
- `components/asean/AseanLegend.vue` → `.asean-legend__menu` (add panel chrome
  + padding), possibly `.asean-legend__list` (adjust width/gap for the new
  padding).
- No changes expected to `AseanInfographic.vue` layout (the `gap` between
  intro and legend in `.asean-infographic__idle` stays as-is — the panel adds
  its own internal separation, the outer gap still separates it from the
  intro).
- Collapsed pill (`.asean-legend__pill`) is NOT touched — acceptance requires
  it "still looks right."

## 2. Timor-Leste docking verification

`components/asean/AseanMap.vue` `frameStyle` is generic bbox-based (per BF-82).
Plan: run the dev server, dock Timor-Leste from the map and from the legend at
desktop (1280px) and mobile (375px) widths, screenshot each. If framing looks
broken (country not centered/zoomed sensibly), fix `frameStyle`'s bbox
handling for the `timor_leste` feature within this cycle, with before/after
screenshots. Otherwise: no code change, screenshots stand as evidence.

## Verification plan

1. `checkpoint: pre-legend-styling` empty commit first (theme/styling work).
2. Small CSS diff in `AseanLegend.vue`.
3. Dev server (`npm run dev` or equivalent) via background Bash / browser
   preview, screenshot idle state at 1280w and 375w before/after.
4. Screenshot collapsed pill (docked state) to confirm untouched.
5. Timor-Leste dock screenshots (map click + legend click) at both widths.
6. Commit, push, open PR against `dev`.
