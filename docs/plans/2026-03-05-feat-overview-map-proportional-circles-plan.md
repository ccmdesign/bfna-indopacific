---
title: "feat: Overview map with proportional circles"
type: feat
status: active
date: 2026-03-05
origin: docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md
---

# feat: Overview map with proportional circles

## Overview

Replace the current `StraitMap.vue` list scaffold with an interactive overview map: a static satellite `.webp` background with six SVG circles positioned over each strait, sized proportionally to trade volume data via D3 `scaleSqrt()`. This is the **Overview State** from the brainstorm (see brainstorm: `docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md` — "Overview State" and "Circle Sizing" sections). The Lens State (particle animation, GSAP transitions) is out of scope for this ticket.

## Problem Statement / Motivation

The current `StraitMap.vue` (from BF-39) renders straits as a flat card list — functional as a data-loading scaffold but not a visualization. The brainstorm established that the overview map with proportional circles is the entry point for the entire straits infographic: circles communicate relative trade scale at a glance and provide click affordances to drill into individual straits (see brainstorm: "Why This Approach").

## Proposed Solution

Build the overview map as a single Vue component (`StraitMap.vue` replacement) that:

1. Renders the satellite `.webp` as a full-bleed background image within the map container
2. Overlays an inline SVG layer with six `<circle>` elements, one per strait
3. Sizes each circle using D3 `scaleSqrt()` so that circle **area** is proportional to the chosen metric
4. Positions circles via percentage-based coordinates (relative to the map container) so they remain correctly placed across viewport sizes
5. Renders strait name labels adjacent to each circle
6. Emits click events on each circle for downstream wiring (Lens State, future ticket)

## Technical Approach

### Data Schema Gap — `capacityMt` / `vessels` fields

The brainstorm specifies circle radius driven by `capacityMt` (with a `vessels.total` toggle). The current `straits.json` schema does **not** include these fields. Available numeric fields:

| Field | Example (Malacca) | Notes |
|---|---|---|
| `flowScalar` | 100 | Relative 0-100 scale, already normalized |
| `valueUSD` | 2,428,000,000,000 | Absolute dollar value |
| `oilMbpd` | 23.7 | Null for some straits |
| `lngBcfd` | 9.0 | Null for some straits |

**Decision required (see Open Questions below):** Either (a) enrich `straits.json` with `capacityMt` and `vessels` fields from the IMF PortWatch API, or (b) use `flowScalar` as the initial sizing metric since it already represents relative trade volume. Option (b) is recommended for this ticket — `flowScalar` maps directly to a `scaleSqrt()` domain of `[25, 100]` and avoids a data-pipeline dependency. The metric toggle and year slider (which require time-series data) belong to a separate ticket.

### Architecture

```
pages/infographics/straits.vue          (unchanged — renders <StraitsInfographic>)
components/infographics/StraitsInfographic.vue  (unchanged — renders <StraitMap>)
components/StraitMap.vue                 ← REWRITE: overview map with circles
data/straits/straits.json               ← ADD: per-strait position coordinates
public/assets/map-indo-pacific-2x.webp  ← REPLACE: actual satellite image (currently 0 bytes)
```

### Component Design: `StraitMap.vue`

```vue
<!-- components/StraitMap.vue -->
<script setup lang="ts">
import { scaleSqrt } from 'd3-scale'
import { min, max } from 'd3-array'
import straitsData from '~/data/straits/straits.json'

const straits = straitsData.straits
const meta = straitsData.meta

// --- Circle scale ---
const RADIUS_MIN = 24   // px — smallest circle (Hormuz, flowScalar=25)
const RADIUS_MAX = 72   // px — largest circle  (Malacca, flowScalar=100)

const domain = [
  min(straits, (d) => d.flowScalar)!,
  max(straits, (d) => d.flowScalar)!,
]

const radiusScale = scaleSqrt().domain(domain).range([RADIUS_MIN, RADIUS_MAX])

// Click handler — emit strait id for future Lens wiring
const emit = defineEmits<{ (e: 'select-strait', id: string): void }>()
function onCircleClick(id: string) {
  emit('select-strait', id)
}
</script>
```

### SVG Circle Positioning

Each strait needs `posX` and `posY` fields in `straits.json`, expressed as **percentages** of the map image dimensions (0-100). This makes positioning resolution-independent.

Proposed coordinates (to be calibrated against the actual satellite image):

| Strait | posX (%) | posY (%) | Label position |
|---|---|---|---|
| Strait of Malacca | 55 | 62 | below |
| Taiwan Strait | 68 | 38 | right |
| Strait of Hormuz | 25 | 42 | left |
| Luzon Strait | 72 | 48 | right |
| Bab el-Mandeb | 20 | 55 | left |
| Lombok Strait | 60 | 72 | below |

These are initial estimates. The implementer should visually calibrate by running `npm run dev` and adjusting.

### SVG Overlay Pattern

The circles are rendered inside an `<svg>` element that fills the map container via `position: absolute; inset: 0`. Using SVG (rather than HTML `<div>` elements) gives native support for `<circle>`, `<text>`, and clean scaling.

```vue
<template>
  <div class="strait-map-container" role="img" :aria-label="meta.title">
    <img
      class="map-bg"
      src="/assets/map-indo-pacific-2x.webp"
      alt=""
      aria-hidden="true"
      loading="eager"
    />
    <svg class="circle-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      <g
        v-for="strait in straits"
        :key="strait.id"
        class="strait-circle-group"
        role="button"
        :tabindex="0"
        :aria-label="`${strait.name}: ${strait.globalShareLabel}`"
        @click="onCircleClick(strait.id)"
        @keydown.enter="onCircleClick(strait.id)"
      >
        <circle
          :cx="strait.posX"
          :cy="strait.posY"
          :r="radiusScale(strait.flowScalar)"
          class="strait-circle"
        />
        <text
          :x="strait.posX"
          :y="strait.posY + radiusScale(strait.flowScalar) + 4"
          class="strait-label"
          text-anchor="middle"
        >
          {{ strait.name }}
        </text>
      </g>
    </svg>
  </div>
</template>
```

> **Note on viewBox:** Using `viewBox="0 0 100 100"` with percentage-based coordinates means circle radii are also in viewBox units, not pixels. The implementer will need to convert `RADIUS_MIN`/`RADIUS_MAX` from pixel intent to viewBox-relative units based on the rendered container size — or alternatively, skip the SVG `viewBox` approach and use a pixel-sized SVG that matches the natural image dimensions. Both approaches work; the pixel-sized SVG is simpler to reason about. See Open Questions.

### Styling

```css
.strait-map-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.map-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.circle-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* let clicks pass through to map, except on circles */
}

.strait-circle-group {
  pointer-events: all; /* re-enable on interactive elements */
  cursor: pointer;
}

.strait-circle {
  fill: rgba(255, 255, 255, 0.15);
  stroke: rgba(255, 255, 255, 0.6);
  stroke-width: 1.5;
  transition: fill 0.2s ease, stroke 0.2s ease;
}

.strait-circle-group:hover .strait-circle,
.strait-circle-group:focus-visible .strait-circle {
  fill: rgba(255, 255, 255, 0.3);
  stroke: rgba(255, 255, 255, 0.9);
}

.strait-label {
  fill: rgba(255, 255, 255, 0.9);
  font-family: 'Encode Sans', sans-serif;
  font-size: 3px; /* viewBox-relative; adjust to taste */
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
```

### Data Changes to `straits.json`

Add `posX` and `posY` fields to each strait object:

```json
{
  "id": "malacca",
  "posX": 55,
  "posY": 62,
  ...existing fields...
}
```

### Map Image

The file `public/assets/map-indo-pacific-2x.webp` is currently a 0-byte placeholder. The implementer must:

1. Source the satellite image (the brainstorm specifies a single satellite `.webp` for both overview and lens — see brainstorm: "Resolved Questions" item 1)
2. Export at 2x resolution (e.g., 2400x1350 for a 1200x675 CSS display) for retina screens
3. Compress as `.webp` at quality ~80 to keep file size under 500KB

## System-Wide Impact

- **Interaction graph:** Circle click emits a `select-strait` event. Currently nothing listens — the Lens State (future ticket) will consume it. No side effects in this ticket.
- **Error propagation:** Static data import; no runtime fetch, no error states needed beyond missing image fallback.
- **State lifecycle risks:** None — this is a stateless, data-driven render. No reactive state changes beyond future metric toggle (out of scope).
- **API surface parity:** The embed route (`/embed/straits`) renders the same `StraitsInfographic` component, so the overview map will appear in embeds automatically.
- **Integration test scenarios:** (1) All six circles render with correct relative sizes. (2) Circle click emits the correct strait ID. (3) Labels are visible and readable. (4) Layout works within `layout-2` grid at 1920x1080 and 1440x900.

## Acceptance Criteria

- [ ] Satellite map image displayed as full-width background within `.strait-map-container`
- [ ] 6 circles rendered as SVG `<circle>` elements, one per strait (Malacca, Taiwan, Hormuz, Luzon, Bab-el-Mandeb, Lombok)
- [ ] Circles positioned over their geographic locations on the map via percentage coordinates
- [ ] Circle radius driven by D3 `scaleSqrt()` — area proportional to `flowScalar` (interim metric pending `capacityMt` data enrichment)
- [ ] Domain: `[min flowScalar, max flowScalar]` (currently `[25, 100]`) mapped to range `[RADIUS_MIN, RADIUS_MAX]` tuned to avoid overlap
- [ ] Strait name labels always visible next to or below each circle
- [ ] Data sourced from existing `straits.json` at build time (static import, no runtime fetch)
- [ ] Click events wired as native DOM events on circle `<g>` elements, emitting `select-strait` with the strait ID
- [ ] Keyboard accessible: circles focusable via Tab, activatable via Enter
- [ ] `prefers-reduced-motion`: disable hover transition
- [ ] Works within existing `layout-2` grid (full-bleed, grid-row 1/8, grid-column 1/-1)

## Success Metrics

- All 6 circles render at correct relative sizes on first load (Malacca largest, Hormuz smallest)
- Circle positions visually align with strait locations on the satellite image
- No layout overflow or scrollbar at 1920x1080 and 1440x900 viewports
- Lighthouse performance score remains above 90 (image is the only new asset)

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|---|---|---|
| Satellite `.webp` image (currently 0 bytes) | Blocks all visual work | Source image first; can use any placeholder satellite map to unblock layout work |
| `capacityMt` / `vessels` data not in schema | Circle sizing falls back to `flowScalar` | Use `flowScalar` now; enrich data in a follow-up ticket |
| Circle position calibration | Positions will need manual tuning | Provide initial estimates; implementer adjusts in dev mode |
| SVG viewBox vs. pixel units | Radius values behave differently in each approach | Implementer chooses approach and documents the conversion |

## Open Questions

1. **SVG sizing strategy:** Should the SVG overlay use `viewBox="0 0 100 100"` (percentage-based, radius in viewBox units) or match the natural image pixel dimensions (radius in px)? The viewBox approach scales cleanly but makes radius units unintuitive. The pixel approach is simpler but requires knowing the image dimensions. **Recommendation:** Use `viewBox="0 0 1200 675"` (matching CSS display size) so radius values in px translate directly.

2. **Data field for sizing:** The brainstorm specifies `capacityMt` with a `vessels.total` toggle. The current data only has `flowScalar`. Should this ticket (a) enrich the data schema with real tonnage/vessel counts, or (b) ship with `flowScalar` and add the toggle in a dedicated controls ticket? **Recommendation:** Option (b) — ship with `flowScalar`, add data enrichment and toggle separately.

3. **Label collision:** For closely-spaced straits (Luzon and Taiwan are geographically near each other), label placement may conflict. Should the implementer use a fixed offset strategy (below/left/right per strait) or implement basic collision detection? **Recommendation:** Fixed offset per strait via a `labelAnchor` field in the data — simplest and sufficient given only 6 points.

4. **Map image source:** Who provides the satellite `.webp`? Is there a preferred source image, or should the implementer acquire one (e.g., NASA Blue Marble, Mapbox static tile)?

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md](docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md) — Key decisions carried forward: (1) Hybrid HTML+Canvas approach with SVG circles on overview, (2) D3 `scaleSqrt()` for area-proportional sizing, (3) Single satellite `.webp` for both overview and lens states.

### Internal References

- Existing scaffold: `components/StraitMap.vue` (BF-39, to be replaced)
- Straits data: `data/straits/straits.json`
- Layout grid: `public/styles.css:76` (`.layout-2`)
- Infographic wrapper: `components/infographics/StraitsInfographic.vue`
- Page route: `pages/infographics/straits.vue`

### Related Work

- BF-39: Straits visualization scaffold (merged, PR #13)
- Brainstorm extends: `docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md`
