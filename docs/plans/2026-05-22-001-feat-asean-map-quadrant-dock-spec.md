---
title: ASEAN map quadrant-dock interaction
type: spec
status: draft
created: 2026-05-22
area: components/infographics/AseanInfographic.vue, components/asean/AseanMap.vue
---

# Spec — ASEAN map quadrant-dock interaction

## Summary

On the ASEAN infographic, the map (background raster **and** country vectors, as one
unit) **stays fullscreen across all four quadrants** at all times — it is never cropped
or shrunk. Selecting a country re-zooms/re-frames the map so the selected country is
positioned in the **top-left quadrant**, leaving the other three quadrants as map
backdrop for chart overlays (rendered on top of the map, separate spec). Deselecting
returns the map to its default fullscreen frame.

## Scope

**In scope**
- Idle (no selection) = fullscreen map at the default frame.
- Country click = map re-frames (zoom + pan) so the clicked country sits in the
  top-left quadrant. Map remains fullscreen — no crop, no container resize.
- Re-click / deselect = map returns to the default fullscreen frame.
- Country-to-country switch = map re-frames to the new country's TL position.
- CSS-transition choreography + reduced-motion handling.

**Out of scope (separate spec)**
- What fills the top-right, bottom-left, and bottom-right quadrants — charts overlaid
  on top of the fullscreen map. For this spec those three quadrants stay **empty**
  (bare map backdrop).
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
2. **Focused** — a country is selected. Map is **still fullscreen** but re-zoomed so
   the selected country sits in the top-left quadrant; the rest of the map fills the
   other three quadrants as backdrop (where chart overlays will land).

### Transitions

| From | Trigger | To | Motion |
|---|---|---|---|
| Idle | click country | Focused (that country) | map zooms in + pans country into TL quadrant |
| Focused | click same country (or deselect) | Idle | frame resets to default fullscreen view |
| Focused (A) | click country B | Focused (B) | frame pans/zooms A → B, both in TL quadrant |

### Defaults change

- Initial `activeSlug` becomes `null` (idle/fullscreen on load), replacing the current
  `'indonesia'` preselect.

## Layout model

- The map element is **always fullscreen** (`inset: 0`, all four quadrants). It is never
  resized or cropped to a quadrant.
- Conceptual 2×2 grid is purely a *framing* target:
  - **TL** = where the selected country is positioned within the fullscreen map.
  - **TR / BL / BR** = map backdrop; chart overlays sit on top of them (separate spec).

## Mechanics (grounded in current code)

A single transitioned change: the **frame transform**. The map element keeps its
fullscreen box; only the framing of the plate moves.

- Drive the plate transform so the selected country's centroid lands at the **center of
  the top-left quadrant** in viewBox units — `(VB_W/4, VB_H/4) = (480, 270)` — not the
  viewBox center.
  - The group maps a point `p` to `Z · p + (tx, ty)`.
  - To place `centroid` at the TL-quadrant center:
    ```
    Z   = DOCK_ZOOM                 // target zoom, e.g. 2.0–2.5 (tune)
    tx  = 480 - Z · centroid.x      // VB_W/4
    ty  = 270 - Z · centroid.y      // VB_H/4
    ```
  - `centroid` per feature is already computed in viewBox units
    (`renderedFeatures[].centroid`, [AseanMap.vue:84](../../components/asean/AseanMap.vue)).
  - Idle frame returns to the prop defaults `(-893, -270, 1.25)`.
- `preserveAspectRatio="xMidYMid slice"` and the fullscreen box are unchanged. The
  quarter-point target is in viewBox space; the cover-fit crop shifts the on-screen
  position slightly from the exact screen quarter-point (acceptable, tunable).

### Transitionability note (important)

CSS transitions apply to the CSS `transform` **property**, not the SVG `transform`
**attribute**. To CSS-animate the re-zoom, the frame transform must be applied as a
CSS property (`style="transform: …"`) on the `<g>` (or a wrapper), with
`transition: transform <dur> <ease>`. Verify in Safari (historically inconsistent
on SVG `transform-origin`); fall back to a wrapper `<div>`/group if needed.

## Animation

- **Tech:** CSS transitions only (no GSAP).
- **Duration:** ~600 ms, easing `cubic-bezier(0.4, 0, 0.2, 1)` on the plate's
  `transform` property.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, apply the end state
  instantly (no transition). The component already has a reduced-motion block to extend.

## Constraints / gotchas

- **Do not edit `PLATE` calibration.** Re-framing is a frame transform only.
  Geography must stay aligned with the vectors.
- Frame transform must live on a CSS `transform` property (not the SVG attribute) for
  the re-zoom to transition (see note above).
- **Integration:** the existing title block + bottom dock currently render on selection
  and would clutter the focused view. They belong to the deferred quadrant-content spec.
  For this spec, hide them so the bare focused map is clean.
- Hover/active overlays and the sweep mask must keep working at the zoomed scale;
  `vector-effect: non-scaling-stroke` already guards stroke widths.

## Acceptance criteria

1. On load: fullscreen map, **no** country active.
2. Click a country: map stays fullscreen and re-zooms/pans so that country sits in the
   top-left quadrant; the rest of the map fills the other three quadrants.
3. Click the active country again (or trigger deselect): map returns to the default
   fullscreen frame (idle).
4. Click a different country: map re-frames from the old country to the new one (both
   land in the TL quadrant).
5. `prefers-reduced-motion: reduce`: all of the above resolve instantly, no animation.
6. Map is never cropped or shrunk; country vectors stay registered to the background
   raster throughout (calibration intact).

## Open questions

- **Zoom factor `Z`** for the focused re-zoom — propose 2.0–2.5, tune visually.
- **TL placement** — exact quarter-point `(480, 270)` in viewBox space, or nudge to
  compensate for the cover-fit crop so it hits the true on-screen quarter-point?
- **Deselect trigger** — re-click the active country only, or also click empty sea /
  add an explicit close affordance?
- **Mobile / portrait** — focused framing on small screens; defer.
