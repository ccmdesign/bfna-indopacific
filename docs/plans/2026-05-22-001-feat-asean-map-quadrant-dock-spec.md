---
title: ASEAN map quadrant-dock interaction
type: spec
status: draft
created: 2026-05-22
area: components/infographics/AseanInfographic.vue, components/asean/AseanMap.vue
---

# Spec — ASEAN map quadrant-dock interaction

## Summary

On the ASEAN infographic, selecting a country transitions the whole map (background
raster **and** country vectors, as one unit) from a fullscreen layout into the
**top-left quadrant** of the viewport, while simultaneously re-zooming so the
selected country is framed inside that quadrant. This opens the other three
quadrants for content. Deselecting returns the map to fullscreen.

## Scope

**In scope**
- Idle (no selection) = fullscreen map.
- Country click = map docks to top-left quadrant + re-zooms onto the clicked country.
- Re-click / deselect = map un-docks back to fullscreen.
- Country-to-country switch while docked = map stays docked, re-zooms to the new country.
- CSS-transition choreography + reduced-motion handling.

**Out of scope (separate spec)**
- What fills the top-right, bottom-left, and bottom-right quadrants (charts,
  identity block, etc.). For this spec the three freed quadrants stay **empty**.
- Relocating the existing title block and bottom dock into quadrants. The current
  overlays are deferred along with quadrant content (see Integration note).
- Mobile / portrait layout (see Open Questions).

## Current behavior (baseline)

- `AseanInfographic.vue` is `position: fixed; inset: 0` (full viewport). It renders
  `<AseanMap>` as the base layer, a title block overlaid top-right, and a 2-card
  dock overlaid bottom (65/35 split). Default `activeSlug = 'indonesia'` — a country
  is always selected on load.
- `AseanMap.vue` is a single SVG, `viewBox 0 0 1920 1080`,
  `preserveAspectRatio="xMidYMid slice"` (cover-crop, centered).
- The background raster (`/assets/map-asean-2x.webp`, the "locked plate") and **all**
  country vector paths live inside one `<g :transform="frameTransform">` group
  ([AseanMap.vue:209](../../components/asean/AseanMap.vue)). They already transform together.
- `frameTransform = translate(frameTx, frameTy) scale(frameScale)`, exposed as props
  with defaults `(-893, -270) scale 1.25`. The parent can re-aim the map purely via
  these props — the plate's geographic calibration (`PLATE` west/east/north/south)
  is **not** touched.
- Click toggles `activeSlug`; re-clicking the active country emits `null` (deselect).

## Desired behavior

### States

1. **Idle** — no country selected (`activeSlug = null`). Map fills the viewport at
   the default frame (whole ASEAN region visible). Invites exploration.
2. **Docked** — a country is selected. Map occupies the top-left quadrant
   (~50svw × 50svh) and is re-zoomed so the selected country sits centered and
   enlarged within that quadrant. The other three quadrants are empty.

### Transitions

| From | Trigger | To | Motion |
|---|---|---|---|
| Idle | click country | Docked (that country) | map shrinks to TL quadrant + re-zooms in |
| Docked | click same country (or deselect) | Idle | map expands to fullscreen + frame resets to default |
| Docked (A) | click country B | Docked (B) | map stays in TL, frame pans/zooms A → B |

### Defaults change

- Initial `activeSlug` becomes `null` (idle/fullscreen on load), replacing the current
  `'indonesia'` preselect.

## Layout model

- Conceptual 2×2 grid over the viewport:
  - **TL** = map (docked state).
  - **TR / BL / BR** = empty (reserved; out of scope).
- Quadrant size: top-left = 50svw × 50svh (subject to tuning — see Open Questions).

## Mechanics (grounded in current code)

Two independent, simultaneously-transitioned changes:

1. **Dock (container box).** Animate the map's outer box from fullscreen
   (`inset: 0`) to the top-left quadrant (`top:0; left:0; width:50svw; height:50svh`).
   Because the SVG keeps `preserveAspectRatio="slice"`, it cover-crops within the
   smaller box automatically — no viewBox change needed.

2. **Re-zoom (frame transform).** Drive `frameTx / frameTy / frameScale` so the
   selected country's centroid lands at the viewBox center.
   - The group maps a point `p` to `frameScale · p + (frameTx, frameTy)`.
   - To center `centroid` at viewBox center `C = (960, 540)`:
     ```
     frameScale = Z                       // target zoom, e.g. 2.0–2.5 (tune)
     frameTx    = 960 - Z · centroid.x
     frameTy    = 540 - Z · centroid.y
     ```
   - `centroid` per feature is already computed in viewBox units
     (`renderedFeatures[].centroid`, [AseanMap.vue:84](../../components/asean/AseanMap.vue)).
   - Idle frame returns to the prop defaults `(-893, -270, 1.25)`.

### Transitionability note (important)

CSS transitions apply to the CSS `transform` **property**, not the SVG `transform`
**attribute**. To CSS-animate the re-zoom, the frame transform must be applied as a
CSS property (`style="transform: …"`) on the `<g>` (or a wrapper), with
`transition: transform <dur> <ease>`. Verify in Safari (historically inconsistent
on SVG `transform-origin`); fall back to a wrapper `<div>`/group if needed.

## Animation

- **Tech:** CSS transitions only (no GSAP).
- **Duration:** ~600 ms, single shared easing (e.g. `cubic-bezier(0.4, 0, 0.2, 1)`),
  so the dock (box) and re-zoom (frame) read as one coordinated motion.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, apply the end state
  instantly (no transition). The component already has a reduced-motion block to extend.

## Constraints / gotchas

- **Do not edit `PLATE` calibration.** Docking is container size + frame transform only.
  Geography must stay aligned with the vectors.
- Frame transform must move to a CSS `transform` property for the re-zoom to transition
  (see note above).
- **Integration:** the existing title block + bottom dock currently render on selection
  and would overlay the docked TL map. They belong to the deferred quadrant-content spec.
  For this spec, hide them while docked (or leave idle-only) so the empty-quadrant demo
  is clean.
- Hover/active overlays and the sweep mask must keep working at the docked (zoomed) scale;
  `vector-effect: non-scaling-stroke` already guards stroke widths.

## Acceptance criteria

1. On load: fullscreen map, **no** country active.
2. Click a country: map animates into the top-left quadrant (~50svw × 50svh) and
   re-zooms to center that country; the other three quadrants are empty.
3. Click the active country again (or trigger deselect): map animates back to
   fullscreen and resets to the default frame (idle).
4. Click a different country while docked: map stays docked and re-zooms from the old
   country to the new one.
5. `prefers-reduced-motion: reduce`: all of the above resolve instantly, no animation.
6. Country vectors stay registered to the background raster throughout (calibration intact).

## Open questions

- **Zoom factor `Z`** for the docked re-zoom — propose 2.0–2.5, tune visually.
- **Quadrant size** — strict 50/50, or map slightly smaller than a true quarter?
- **Deselect trigger** — re-click the active country only, or also click empty sea /
  add an explicit close affordance?
- **Mobile / portrait** — quadrants won't fit small screens; stack, or keep fullscreen
  map with a different disclosure? (defer)
