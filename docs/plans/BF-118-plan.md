# BF-118 — ASEAN idle screen: legend column overflows short viewports

## Problem

On the idle screen (no country selected) the right-hand column
(`.asean-infographic__idle`) is `position: fixed; top: 0` with content height,
no cap and no overflow. Inside it the legend panel (`.asean-legend__menu`) caps
itself at a flat `max-height: 56svh`.

Because the panel starts *below* the intro block plus the column gap, the sum
`padding-top + intro height + gap + 56svh + padding-bottom` exceeds `100svh` on
short viewports. The panel's own bottom edge falls below the fold, so its
internal scroll area can never reveal the last row (Timor-Leste). Reported by
Aline at a Windows-default (scaled) viewport; BF-106 only fixed the *docked*
sidebar.

## Approach (CSS only — no JS measurement, no ResizeObserver)

1. `components/infographics/AseanInfographic.vue`, `.asean-infographic__idle`:
   add `max-height: 100svh` so the column can never be taller than the viewport.
   (It is already `display: flex; flex-direction: column; box-sizing:
   border-box`, so the padding is inside the cap.)
2. `components/asean/AseanLegend.vue`, `.asean-legend`: it is the flex child
   that must absorb the shrink — add `min-height: 0` (defeats the automatic
   `min-height: auto` floor) and make it a column flex container so its own
   child can be sized from it. Keep `align-items: flex-start` so the collapsed
   pill keeps its shrink-to-fit width.
3. `.asean-legend__menu`: drop the flat `max-height: 56svh`; use
   `flex: 1 1 auto; min-height: 0` instead, keeping `overflow-y: auto`. The
   panel then fills exactly the space left under the intro and scrolls
   internally, with its bottom edge always on screen.

Why not `flex: 0 1 auto`: `.asean-legend`'s own height is already shrink-to-fit
from the parent, so `flex: 1` inside it does not grow the panel beyond content
height on tall viewports — the 1920x1080 layout is unchanged.

The intro block keeps its default `min-height: auto`, so all shrink lands on
the legend and the title/subtitle/blurb are never clipped.

## Explicitly NOT doing

- Not touching `pointer-events` on `.asean-infographic__idle` — it stays
  `none` so the map is clickable through the gaps; `.asean-legend` already
  opts its own buttons back in (that is also what makes wheel-over-legend
  work).
- Not extending BF-106's `@media (max-height: 800px) { .asean-infographic__sidebar
  { pointer-events: auto } }` to the idle column — that would kill click-through
  across the whole right half of the opening screen.

## Files

- `components/infographics/AseanInfographic.vue` (1 declaration)
- `components/asean/AseanLegend.vue` (2 rules)

## Test strategy

Browser probes on `/infographics/asean` and `/embed/asean`, idle state, at
viewport heights 720, 768, 600, 560 (width 1280/1366), measuring
`window.innerHeight` not screen size:

- last legend row (Timor-Leste) `getBoundingClientRect().bottom <= innerHeight`
  after scrolling the legend to its end;
- `.asean-legend__menu` bottom edge on screen;
- intro title/subtitle/blurb not clipped (`bottom <= innerHeight`);
- wheel over the legend changes its `scrollTop`;
- 1920x1080: layout unchanged and `document.elementFromPoint` in the gap beside
  the column still hits the map (SVG), not the idle overlay;
- both collapsed-pill and expanded-list states.

## Risks

- A flex child that must scroll needs `min-height: 0` at *every* level between
  the cap and the scroller — miss one and it silently overflows again.
- `svh` vs `vh`: use `svh` to match the existing code and to be correct with
  mobile browser chrome.
- At extreme short heights the intro alone may approach the viewport height,
  leaving the legend very small; acceptable as long as it still scrolls and its
  bottom edge is visible.
