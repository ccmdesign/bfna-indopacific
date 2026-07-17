# BF-99 — Idle sidebar polish + Timor-Leste docking verification

## 1. Legend visual separation

`components/asean/AseanLegend.vue` — `.asean-legend__menu` now gets the same
translucent-panel treatment as the collapsed pill: `rgba(2, 38, 64, 0.5)`
background, `blur(12px)` backdrop, `1px solid rgba(255,255,255,0.1)` border,
`16px` radius, matching box-shadow, and internal padding. The intro block is
untouched (still chrome-less). Collapsed-pill CSS was not touched.

- `00-before-idle-legend-desktop.png` — before (unmodified `dev`): legend
  reads as a continuation of the intro text, no separation.
- `01-idle-legend-desktop.png` — after: legend is a distinct translucent card.
- `02-idle-legend-mobile-collapsed.png` — mobile collapsed pill, unaffected.
- `03-idle-legend-mobile-expanded.png` — mobile expanded panel with the new
  chrome.
- `07-docked-collapsed-pill-desktop.png` — docking a country (Vietnam) swaps
  the idle sidebar for `AseanCountrySwitcher`; `AseanLegend` unmounts
  entirely in this state (only rendered under `v-if="!activeSlug"`), so
  there is no persistent "docked desktop pill" — verified this is existing,
  unrelated behavior.
- `08-dock-transition-collapsed-pill.png` — the ~400ms cross-fade moment
  right after a click; pre-existing transition, not touched by this change.

Note: at real mobile width (375px) the intro text and legend list overflow
their column and get clipped at the viewport edge — confirmed via a
before/after comparison (`baseline-mobile-expanded.png` on unmodified `dev`,
same clipping) that this is a **pre-existing** responsive issue, not
introduced by this change, and out of scope for BF-99.

## 2. Timor-Leste docking — was broken, fixed

`components/asean/AseanMap.vue` `frameStyle`: centering math was verified
correct (the active country's centroid is placed exactly at the top-left
quadrant's center — confirmed via `getBoundingClientRect()` on the rendered
`.asean-map__active-fill`, matching the quadrant center to the pixel).

The bug was the zoom clamp: `MAX_DOCK_ZOOM = 4` capped how far the map can
zoom into a tiny country's bounding box. For Timor-Leste (bbox ~3.26° x
1.37°) the *needed* fit was ~22x to fill the quadrant, so the clamp left it
filling only ~14% of the quadrant width — the sheer landmass of nearby
northern Australia (a non-ASEAN neighbor with no other relevance to the map)
then visually dominated the frame. This matches a client note found from a
2026-07-14 meeting (Marshall Reid): *"The Timor-Leste map is currently
centered on Northern Australia. Re-center it on Timor-Leste."* Singapore,
Brunei, Cambodia and Laos hit the same clamp (fit values 9.4–205), so this
was a systemic issue for small/isolated countries, not Timor-specific.

**Fix:** raised `MAX_DOCK_ZOOM` from `4` to `6.5` (`AseanMap.vue`, ~line
141). This roughly doubles the on-screen footprint of clamped countries
while staying within a tolerable softening range of the raster's native
resolution (image is oversampled ~3.1x relative to the viewBox at scale 1;
some blur above that was already an accepted trade-off at the old 4x clamp
for Singapore/Brunei/Cambodia/Laos). Countries whose natural fit is already
under 4 (Vietnam, Thailand, Philippines, Malaysia, Indonesia, Myanmar) are
unaffected — the clamp never applied to them.

- `04-timor-docked-desktop-legend.png` — Timor-Leste docked via legend
  click, desktop (1280px), after the fix.
- `05-timor-docked-desktop-mapclick.png` — docked via a direct click on the
  map hit-area, desktop — same, correctly-framed result.
- `06-timor-docked-mobile-legend.png` — docked via legend click, mobile
  (375px). The map transform is computed in SVG viewBox units, independent
  of CSS viewport size — confirmed identical `cx`/`cy`/`Z` via
  `Page.captureScreenshot`-adjacent `Runtime.evaluate` reads of
  `.asean-map__plate`'s `style` attribute at both widths.

## Verification method

Screenshots were captured with a small ad-hoc CDP driver
(`cdp-shot.mjs`, not committed — lives in the session scratchpad) driving a
headless Chrome instance against the worktree's dev server, since the
in-conversation browser preview tool couldn't persist screenshots to disk.
Centering/zoom math was cross-checked three ways: hand computation from the
GeoJSON bbox, the live `transform` style on `.asean-map__plate`, and
`getBoundingClientRect()` on the rendered active-country path — all three
agreed.
