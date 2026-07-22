# BF-119 — ASEAN mobile: Legend button renders behind the footer

**Outcome: investigated, not fixed. Folded into BF-110 (mobile rebuild from scratch).**

The brief asked for a contained stacking/positioning fix and explicitly said to flag
and stop rather than force one if the mobile rebuild would throw it away. Measurement
says no contained fix exists. This document records the measurements so BF-110 does not
have to re-derive them.

## What was reproduced

Measured on `dev` @ `232ea61` (post BF-118), `/infographics/asean`, idle state,
`document.elementFromPoint` at the centre of `.asean-legend__pill`:

| Viewport | intro height | pill top → bottom | footer top | hit-test | verdict |
|---|---|---|---|---|---|
| 375 × 812 (portrait) | 223.1 | 304 → 341 | 764 | `BUTTON.asean-legend__pill` | **passes** |
| 375 × 667 (portrait) | — | 290 → 326 | 619 | `BUTTON.asean-legend__pill` | **passes** |
| 812 × 375 (landscape) | 268.6 | 320.6 → 357.1 | 318.8 | `FOOTER` | **fails** |
| 844 × 390 (landscape) | 272.9 | 324.9 → 361.4 | 333.2 | `FOOTER` | **fails** |
| 812 × 340 (landscape, iOS Safari with URL bar) | 268.6 | 320.6 → 357.1 | 283.8 | `FOOTER` | **fails, pill is off-screen entirely** |

Two things follow from that table.

**1. The portrait case in the acceptance criteria already passes.** BF-118 capped
`.asean-infographic__idle` at `max-height: 100svh` and made `.asean-legend` shrinkable,
which incidentally pulled the pill back above the footer at 375 × 812. The AC as written
("or a 375×812 viewport") is met on `dev` today with no change.

**2. Landscape is the case that actually matters, and it is the one that fails.**
`layouts/default.vue:32` renders `RotateDeviceOverlay`, which covers the whole page
(`z-index: 9999`) whenever the UA is a phone **and** the orientation is portrait. So on a
real handset, portrait is never reachable — landscape is the only orientation the
infographic is ever seen in. That is the state the bug was reported from, and the table
confirms it.

## Root cause

Not primarily z-order. The pill is *painted* above the footer (the footer's background is
`rgba(0, 0, 0, 0.2)`, so the pill shows through) but loses the hit test: both
`.asean-infographic__idle` and `footer` set `z-index: 20`, and the footer is later in
document order, so it wins the tie and swallows the tap. That part is one line to fix.

The part that is not one line: the pill is **physically inside the footer's box**, and
there is nowhere above the footer to put it. The idle column is a fixed, top-anchored flex
column — intro block, then a gap, then the legend — and the intro block alone eats most of
a landscape phone:

```
                        intro   pill   footer   =  needed   have   slack
812 × 375   268.6 + 36.5 + 56.2                 =   361.4    375   +13.6
844 × 390   272.9 + 36.5 + 56.8                 =   366.2    390   +23.8
812 × 340   268.6 + 36.5 + 56.2                 =   361.4    340   −21.4
```

The column currently spends `padding-top: 28px` + `row-gap: 24px` = 52px of chrome on
those same viewports. So at 812 × 375 the entire budget for top padding, the intro→legend
gap, and any clearance above the footer is 13.6px against 52px in use, and at a realistic
iOS Safari landscape height (URL bar visible, ~340px) the budget is **negative**: the pill
is already 17px below the bottom of the viewport, not merely behind the footer.

No stacking change reaches that. Neither does trimming padding — even zeroing the top
padding and the gap does not buy 21px back at 340px tall.

## Why this is BF-110 and not a patch here

The only two ways to actually clear the footer in landscape are:

1. **Shrink the intro on short viewports.** `--intro-title` is
   `clamp(3.5rem, 8vw, 7rem)`, which on an 812px-wide landscape phone resolves to a 65px
   "ASEAN" — sized for a desktop hero, applied to a 375px-tall screen. Fixing that is a
   mobile typography decision across the title / subtitle / blurb stack, not a
   stacking fix.
2. **Decouple the legend from the column** — `position: fixed` the pill just above the
   footer, independent of the intro. That does make the button tappable, but it hands the
   expanded list nowhere to live: at 812 × 375 the menu is already squeezed to 34px tall
   by BF-118's shrink rule, and a bottom-docked list would have to overlap the intro to
   show 11 countries. That is a mobile layout decision with no design behind it.

Both are exactly what BF-110 ("Mobile version — rebuild from scratch") is chartered to
redo, and either would be deleted by that rebuild. Doing one now means designing the
mobile idle screen twice and shipping the worse version first.

## Handoff to BF-110 — what the rebuild must satisfy

- The legend is the **only** viable entry point into a country on touch; the map's country
  hit-areas are too small. If it is unreachable, the infographic has no entry point.
- Design for **landscape at ~812 × 340**, not 812 × 375. The iOS Safari URL bar is visible
  on load and the layout has to work before the user scrolls it away. `100svh` does not
  save you here — the idle column is `position: fixed` and `svh` resolves to the *small*
  viewport, which is the tall-URL-bar case, but the content still overflows it.
- Budget: footer is a fixed 4rem (56px as rendered) at `z-index: 20`, always present. The
  intro + legend have to fit in `100svh − 56px`.
- Give `.asean-infographic__idle` a `z-index` above the footer's 20 as well — the tie plus
  document order is why the pill loses the hit test even where it is visible.
- Portrait is currently unreachable on real handsets because of `RotateDeviceOverlay`. If
  the rebuild intends to support portrait, that overlay has to be dropped for this route
  (`suppressRotateOverlay` page meta already exists), and BF-119's portrait numbers above
  say the idle column already fits there.

## Files inspected

- `components/asean/AseanLegend.vue` — `.asean-legend__pill` (L213), `.asean-legend`
  (L107), `.asean-legend__menu` (L126). No mobile media query exists any more; the
  brief's reference to "a mobile-specific block at ~L234" predates BF-118's refactor.
- `components/infographics/AseanInfographic.vue` — `.asean-infographic__idle` (L~560),
  `shouldCollapse` (L29), `.asean-infographic__intro-title` (L~600).
- `layouts/default.vue` — `footer` (`position: fixed`, `height: 4rem`, `z-index: 20`),
  `RotateDeviceOverlay` mount.
- `composables/useViewport.ts` — `isMobile` is `<= 899px` wide, which is what collapses
  the legend to the pill.

## Status

Ticket left **In Review** for a human call. No production code changed on this branch.
