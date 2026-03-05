---
title: "feat: Overview map with proportional circles"
type: feat
status: active
date: 2026-03-05
origin: docs/brainstorms/2026-03-04-circle-lens-straits-brainstorm.md
deepened: 2026-03-05
---

## Enhancement Summary

**Deepened on:** 2026-03-05
**Sections enhanced:** 8
**Research sources used:** D3 documentation (Context7), WCAG accessibility guidelines, SVG viewBox best practices, WebP optimization guides, Vue 3 component patterns, proportional circle visualization research

### Key Improvements
1. **Critical data discovery:** `capacityMt` and `vessels` fields already exist in `straits.json` under the `historical` key (2019-2025) — the plan incorrectly states they are missing. This resolves Open Question #2 and unblocks the metric toggle for a fast follow-up.
2. **Resolved SVG viewBox strategy:** Concrete recommendation to use `viewBox="0 0 1200 675"` with `preserveAspectRatio="xMidYMid meet"` (not `none`), so radius values work in intuitive pixel units and the overlay scales proportionally with the background image.
3. **Accessibility hardening:** Added `<title>` and `<desc>` elements inside SVG, `aria-labelledby` pattern, `aria-roledescription="interactive map"`, and `Space` key handler alongside `Enter` for WCAG 2.1 AA compliance.
4. **Performance guard:** Added `<link rel="preload">` for the satellite `.webp`, AVIF fallback with `<picture>`, and explicit LCP budget of 500KB.
5. **Label collision prevention:** Added `labelAnchor` data field with concrete per-strait offsets, resolving the open question with a deterministic strategy.

### New Considerations Discovered
- The `preserveAspectRatio="none"` in the original template will distort circles on non-16:9 viewports — must use `"xMidYMid meet"` or `"xMidYMid slice"` instead
- SVG `text-shadow` is not a valid SVG property — must use a `<filter>` element or duplicate `<text>` with offset for the drop shadow effect
- The `historical` data in `straits.json` shows Bab el-Mandeb traffic dropped ~65% in 2024 (425 Mt vs 1230 Mt in 2023) — if `capacityMt` is used for sizing in a follow-up, this creates a dramatically smaller circle that may need a minimum-radius floor
- On viewports narrower than ~900px, circles at the current RADIUS_MIN/MAX will overlap — a responsive scale factor or mobile breakpoint is needed

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

The brainstorm specifies circle radius driven by `capacityMt` (with a `vessels.total` toggle). The current `straits.json` schema does **not** include these fields at the top-level strait objects. Available numeric fields:

| Field | Example (Malacca) | Notes |
|---|---|---|
| `flowScalar` | 100 | Relative 0-100 scale, already normalized |
| `valueUSD` | 2,428,000,000,000 | Absolute dollar value |
| `oilMbpd` | 23.7 | Null for some straits |
| `lngBcfd` | 9.0 | Null for some straits |

**Decision required (see Open Questions below):** Either (a) enrich `straits.json` with `capacityMt` and `vessels` fields from the IMF PortWatch API, or (b) use `flowScalar` as the initial sizing metric since it already represents relative trade volume. Option (b) is recommended for this ticket — `flowScalar` maps directly to a `scaleSqrt()` domain of `[25, 100]` and avoids a data-pipeline dependency. The metric toggle and year slider (which require time-series data) belong to a separate ticket.

### Research Insights — Data Schema

**Critical discovery:** The `historical` key in `straits.json` already contains `capacityMt` and `vessels` data for every strait across years 2019-2025. For example, Malacca 2025 has `capacityMt: 3305` and `vessels.total: 85066`. This means the data enrichment described in the brainstorm is **not** a blocking dependency — it already exists in the dataset, just nested under `historical[year][straitId]`.

**Implication for this ticket:** Continue using `flowScalar` for initial sizing (simpler, already at the top level). But the follow-up metric-toggle ticket can pull `capacityMt` from `historical["2025"]` without any API call or data pipeline work.

**Caution — Bab el-Mandeb anomaly:** The `historical` data shows Bab el-Mandeb dropped from 1230 Mt (2023) to 425 Mt (2024) due to Houthi attacks — a ~65% decline. If `capacityMt` is used for circle sizing, the 2024 Bab el-Mandeb circle would be dramatically smaller than others. A minimum radius floor (e.g., `RADIUS_MIN = 18px`) should be considered in the follow-up to keep it visually legible.

### Architecture

```
pages/infographics/straits.vue          (unchanged — renders <StraitsInfographic>)
components/infographics/StraitsInfographic.vue  (unchanged — renders <StraitMap>)
components/StraitMap.vue                 <- REWRITE: overview map with circles
data/straits/straits.json               <- ADD: per-strait position coordinates
public/assets/map-indo-pacific-2x.webp  <- REPLACE: actual satellite image (currently 0 bytes)
```

### Research Insights — Architecture

**Presentation/Logic Split assessment:** Per the project's presentation-logic-split pattern, `StraitMap.vue` qualifies as purely presentational — it imports static JSON data (not fetched at runtime), computes a D3 scale (pure math, no side effects), and emits events. No composable extraction is needed for this ticket. If the future metric-toggle ticket adds reactive state or API calls, a `useStraitsScale` composable should be extracted at that point.

**Component boundary:** `StraitsInfographic.vue` currently uses `display: contents`, acting as a pass-through wrapper. This is correct — it will become the integration component when the Lens State is added (coordinating StraitMap, StraitDetail, etc.). No changes needed now.

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

### Research Insights — D3 scaleSqrt

**Why scaleSqrt is correct:** Circle area `A = pi * r^2`, so mapping data values directly to radius would make a value of 100 appear 16x larger than a value of 25 (instead of 4x). `scaleSqrt` applies `exponent(0.5)` which counteracts the quadratic area relationship, ensuring perceived area is proportional to the data value. This is the standard D3 approach for proportional symbol maps.

**D3 import optimization:** Import only `scaleSqrt` from `d3-scale` and `min`/`max` from `d3-array` rather than importing from the top-level `d3` package. The project already has `d3@^7.9.0` installed, which supports tree-shaking with these sub-package imports.

**Domain consideration:** The current domain `[25, 100]` uses the actual min/max of `flowScalar`. With `scaleSqrt`, this means Hormuz (25) gets radius 24px and Malacca (100) gets 72px. The ratio of areas is `(72/24)^2 = 9`, and the data ratio is `100/25 = 4`. This is because `scaleSqrt` maps 25->24 and 100->72 such that the *scale* is sqrt-based, but the visual area ratio depends on the radius ratio squared. To ensure strict area proportionality, the domain should start at 0: `scaleSqrt().domain([0, 100]).range([0, RADIUS_MAX])`. However, this would make Hormuz (flowScalar=25) quite small. The current approach (non-zero domain minimum) provides better visual differentiation and is acceptable for a qualitative overview. Document this trade-off in a code comment.

**Clamping:** Add `.clamp(true)` to the scale to guard against any future data values outside `[25, 100]`:
```ts
const radiusScale = scaleSqrt().domain(domain).range([RADIUS_MIN, RADIUS_MAX]).clamp(true)
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

### Research Insights — Circle Positioning

**Coordinate conversion:** With the recommended `viewBox="0 0 1200 675"`, the percentage coordinates must be multiplied by the viewBox dimensions. For example, Malacca at `posX: 55, posY: 62` becomes `cx="660" cy="418.5"` in viewBox units. This conversion should happen in a computed property, not inline in the template, for clarity:

```ts
const mappedStraits = computed(() =>
  straits.map((s) => ({
    ...s,
    cx: (s.posX / 100) * 1200,
    cy: (s.posY / 100) * 675,
  }))
)
```

**Luzon-Taiwan proximity risk:** At the proposed coordinates, Luzon (72, 48) and Taiwan (68, 38) are only ~4% apart horizontally. With Malacca's circle at radius 72px (6% of 1200 viewBox width), these circles may visually touch. The implementer should check this pair first during calibration.

**Label anchor data field:** Add a `labelAnchor` field to each strait object in `straits.json` to control label placement deterministically:

```json
{ "id": "malacca", "posX": 55, "posY": 62, "labelAnchor": "below" }
{ "id": "taiwan", "posX": 68, "posY": 38, "labelAnchor": "right" }
{ "id": "hormuz", "posX": 25, "posY": 42, "labelAnchor": "left" }
{ "id": "luzon", "posX": 72, "posY": 48, "labelAnchor": "right" }
{ "id": "bab-el-mandeb", "posX": 20, "posY": 55, "labelAnchor": "left" }
{ "id": "lombok", "posX": 60, "posY": 72, "labelAnchor": "below" }
```

Label offset logic by anchor:
- `"below"`: `text-anchor="middle"`, `dy = radius + 16`
- `"right"`: `text-anchor="start"`, `dx = radius + 8`
- `"left"`: `text-anchor="end"`, `dx = -(radius + 8)`
- `"above"`: `text-anchor="middle"`, `dy = -(radius + 8)`

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

### Research Insights — SVG Overlay

**Critical bug in template: `preserveAspectRatio="none"` will distort circles.** When the map container's aspect ratio differs from the viewBox's aspect ratio (e.g., on a 4:3 monitor vs. the 16:9 satellite image), `preserveAspectRatio="none"` stretches the SVG non-uniformly, turning circles into ovals. This is the most impactful issue found during deepening.

**Recommended fix:** Use `preserveAspectRatio="xMidYMid meet"` (or `slice` if the image uses `object-fit: cover`). Since the background image uses `object-fit: cover`, the SVG overlay must match the image's cropping behavior. Two approaches:

1. **Match `object-fit: cover` with `preserveAspectRatio="xMidYMid slice"`**: The SVG will crop to fill the container, matching how the image crops. Circle positions stay aligned with their geographic locations. This is the recommended approach.

2. **Skip `object-fit: cover`, use `object-fit: contain` on both image and SVG**: Avoids cropping but may leave letterbox bars. Less desirable for a full-bleed map.

**Recommended viewBox:** Use `viewBox="0 0 1200 675"` (matching the natural image aspect ratio at CSS display size). With this:
- Circle radii in the 24-72px range translate directly
- `posX`/`posY` percentages are converted to viewBox coordinates via `posX * 12` and `posY * 6.75`
- Labels use font sizes in viewBox units (e.g., `font-size="14"` for ~14px appearance)

**SVG `text-shadow` is not valid SVG:** The CSS `text-shadow` property does not apply to SVG `<text>` elements. For the drop-shadow effect on labels, use one of:
- A duplicate `<text>` element offset by 1px with a dark fill (simplest, best performance)
- An SVG `<filter>` with `<feDropShadow>` (more flexible, slight performance cost)

Recommended approach (duplicate text):
```vue
<!-- Shadow text (rendered first, behind) -->
<text :x="labelX" :y="labelY" class="strait-label-shadow" text-anchor="middle">
  {{ strait.name }}
</text>
<!-- Foreground text -->
<text :x="labelX" :y="labelY" class="strait-label" text-anchor="middle">
  {{ strait.name }}
</text>
```

### Research Insights — Accessibility

**Current plan gaps (WCAG 2.1 AA):**

1. **Missing `role="img"` + `<title>` + `<desc>` pattern on SVG:** The container `div` has `role="img"`, but the SVG itself should use the recommended accessible SVG pattern. Per Deque and Smashing Magazine research, the most reliable cross-browser/screen-reader pattern is:

```html
<svg role="img" aria-labelledby="map-title map-desc">
  <title id="map-title">Indo-Pacific Maritime Chokepoints</title>
  <desc id="map-desc">Interactive map showing six major maritime straits
    sized by trade volume. Malacca is the largest, Hormuz the smallest.</desc>
  <!-- circles... -->
</svg>
```

Move `role="img"` from the container `div` to the `<svg>` element, and add `<title>` and `<desc>` as the first children of the SVG.

2. **Missing `Space` key handler:** WCAG 2.1 requires that `role="button"` elements respond to both `Enter` and `Space`. The template only handles `@keydown.enter`. Add `@keydown.space.prevent="onCircleClick(strait.id)"`.

3. **Focus indicator styling:** The plan does not specify a `:focus-visible` outline for the circle groups. The existing project pattern (from `styles.css`) uses `outline: 2px solid rgba(255, 255, 255, 0.7); outline-offset: 2px`. Apply this to `.strait-circle-group:focus-visible`.

4. **`aria-roledescription`:** Consider adding `aria-roledescription="interactive map"` to the SVG container for clearer screen reader context.

5. **Color contrast on labels:** White text (`rgba(255,255,255,0.9)`) on a satellite image background may fail contrast checks in lighter image regions. The duplicate-text shadow approach (see SVG Overlay insights) provides a reliable dark backing to maintain contrast.

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

### Research Insights — Styling

**`prefers-reduced-motion` implementation:** The acceptance criteria require disabling hover transitions under reduced motion. Add this to the scoped styles:

```css
@media (prefers-reduced-motion: reduce) {
  .strait-circle {
    transition: none;
  }
}
```

**Circle fill opacity for overlap legibility:** When two circles overlap (possible for Luzon/Taiwan), fill transparency helps. The current `rgba(255, 255, 255, 0.15)` is good. On hover, increasing to `0.3` provides sufficient visual feedback without obscuring overlapping circles. Consider adding `mix-blend-mode: screen` for a more luminous overlap effect on dark satellite backgrounds.

**Focus-visible style for circle groups:** Add to match the project's existing `.btn-secondary:focus-visible` pattern:

```css
.strait-circle-group:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}
```

Note: SVG `<g>` elements do not natively support CSS `outline`. The implementer may need to add a hidden `<rect>` or `<circle>` within the group that shows on `:focus-visible`, or use a CSS `filter: drop-shadow()` as a focus ring substitute.

### Data Changes to `straits.json`

Add `posX`, `posY`, and `labelAnchor` fields to each strait object:

```json
{
  "id": "malacca",
  "posX": 55,
  "posY": 62,
  "labelAnchor": "below",
  ...existing fields...
}
```

### Map Image

The file `public/assets/map-indo-pacific-2x.webp` is currently a 0-byte placeholder. The implementer must:

1. Source the satellite image (the brainstorm specifies a single satellite `.webp` for both overview and lens — see brainstorm: "Resolved Questions" item 1)
2. Export at 2x resolution (e.g., 2400x1350 for a 1200x675 CSS display) for retina screens
3. Compress as `.webp` at quality ~80 to keep file size under 500KB

### Research Insights — Map Image & Performance

**Image optimization best practices (2025/2026):**

1. **Format:** WebP is correct. For 2025+, consider also providing AVIF as a `<picture>` fallback — AVIF achieves ~20% smaller file sizes than WebP at equivalent quality, and browser support is now near-universal. However, for simplicity, WebP alone is acceptable for this ticket.

2. **Preloading for LCP:** The satellite image will be the Largest Contentful Paint element. Add a `<link rel="preload">` in the page `<head>` via Nuxt's `useHead`:

```ts
useHead({
  link: [
    {
      rel: 'preload',
      as: 'image',
      type: 'image/webp',
      href: '/assets/map-indo-pacific-2x.webp',
    },
  ],
})
```

This should go in `pages/infographics/straits.vue` (alongside the existing `useStraitsHead()`), or inside `useStraitsHead()` itself.

3. **File size budget:** For a 2400x1350 satellite image, WebP at quality 80 typically yields 300-600KB. Target under 500KB. If the source image has fine satellite detail, quality 75 may be needed to stay under budget. Test with `cwebp -q 75 input.png -o output.webp`.

4. **`loading="eager"` is correct:** Since this is the hero/LCP image, it must not be lazy-loaded.

5. **Fallback for 0-byte image:** During development (before the real image is sourced), the 0-byte placeholder will render as a broken image. Consider adding a CSS `background-color` on `.strait-map-container` (e.g., `background: #0a1628`) so circles are visible against a dark background even without the image.

**NASA Blue Marble source recommendation:** The NASA Blue Marble "Next Generation" images (https://visibleearth.nasa.gov/collection/1484/blue-marble) are public domain and available at very high resolution. Crop to the Indo-Pacific region (roughly 30E-180E, 40N-20S), export at 2400x1350, convert to WebP.

## System-Wide Impact

- **Interaction graph:** Circle click emits a `select-strait` event. Currently nothing listens — the Lens State (future ticket) will consume it. No side effects in this ticket.
- **Error propagation:** Static data import; no runtime fetch, no error states needed beyond missing image fallback.
- **State lifecycle risks:** None — this is a stateless, data-driven render. No reactive state changes beyond future metric toggle (out of scope).
- **API surface parity:** The embed route (`/embed/straits`) renders the same `StraitsInfographic` component, so the overview map will appear in embeds automatically.
- **Integration test scenarios:** (1) All six circles render with correct relative sizes. (2) Circle click emits the correct strait ID. (3) Labels are visible and readable. (4) Layout works within `layout-2` grid at 1920x1080 and 1440x900.

### Research Insights — System-Wide Impact

**Embed viewport risk:** The embed route renders the same component, but embeds may have constrained dimensions (e.g., 600x400 iframe). At small sizes, the 24-72px radius range (in viewBox units) may cause circles to overlap significantly. Consider adding a check: if the container width is below a threshold (e.g., 800px), scale RADIUS_MIN/MAX down proportionally. This can be deferred to a follow-up ticket but should be documented as a known limitation.

**SSR/SSG compatibility:** The component uses only static JSON imports and D3 pure functions — both work in SSR. No `window` or `document` access. The `defineEmits` and event handlers are client-only but Vue handles this correctly. No SSR guards needed.

## Acceptance Criteria

- [ ] Satellite map image displayed as full-width background within `.strait-map-container`
- [ ] 6 circles rendered as SVG `<circle>` elements, one per strait (Malacca, Taiwan, Hormuz, Luzon, Bab-el-Mandeb, Lombok)
- [ ] Circles positioned over their geographic locations on the map via percentage coordinates
- [ ] Circle radius driven by D3 `scaleSqrt()` — area proportional to `flowScalar` (interim metric pending `capacityMt` data enrichment)
- [ ] Domain: `[min flowScalar, max flowScalar]` (currently `[25, 100]`) mapped to range `[RADIUS_MIN, RADIUS_MAX]` tuned to avoid overlap
- [ ] Strait name labels always visible next to or below each circle
- [ ] Data sourced from existing `straits.json` at build time (static import, no runtime fetch)
- [ ] Click events wired as native DOM events on circle `<g>` elements, emitting `select-strait` with the strait ID
- [ ] Keyboard accessible: circles focusable via Tab, activatable via Enter and Space
- [ ] `prefers-reduced-motion`: disable hover transition
- [ ] Works within existing `layout-2` grid (full-bleed, grid-row 1/8, grid-column 1/-1)

### Research Insights — Additional Acceptance Criteria

Based on accessibility research and SVG best practices, consider adding:

- [ ] SVG contains `<title>` and `<desc>` elements with `aria-labelledby` on the `<svg>` element
- [ ] Focus-visible indicator displayed on circle groups when focused via keyboard
- [ ] Label text has sufficient contrast against satellite background (dark backing via duplicate text or filter)
- [ ] `preserveAspectRatio` set to maintain circle proportions (not `"none"`)
- [ ] Development fallback: dark background color on container visible when image is missing

## Success Metrics

- All 6 circles render at correct relative sizes on first load (Malacca largest, Hormuz smallest)
- Circle positions visually align with strait locations on the satellite image
- No layout overflow or scrollbar at 1920x1080 and 1440x900 viewports
- Lighthouse performance score remains above 90 (image is the only new asset)

### Research Insights — Success Metrics

**LCP target:** With a preloaded 500KB WebP image, LCP should be under 2.5s on a 4G connection. Measure with Lighthouse in mobile mode (simulated throttling). If LCP exceeds 2.5s, reduce image quality or dimensions.

**Accessibility audit:** Run `npx axe` or Lighthouse accessibility audit after implementation. Target 100% accessibility score. Key checks: all interactive elements have accessible names, focus order is logical (left-to-right geographically or by data magnitude), color contrast passes on labels.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|---|---|---|
| Satellite `.webp` image (currently 0 bytes) | Blocks all visual work | Source image first; can use any placeholder satellite map to unblock layout work |
| `capacityMt` / `vessels` data not in schema | Circle sizing falls back to `flowScalar` | Use `flowScalar` now; enrich data in a follow-up ticket |
| Circle position calibration | Positions will need manual tuning | Provide initial estimates; implementer adjusts in dev mode |
| SVG viewBox vs. pixel units | Radius values behave differently in each approach | Implementer chooses approach and documents the conversion |

### Research Insights — Additional Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `preserveAspectRatio="none"` distorts circles | High | Use `"xMidYMid slice"` to match `object-fit: cover` |
| SVG `text-shadow` not valid, labels render without shadow | Medium | Use duplicate `<text>` element or `<feDropShadow>` filter |
| SVG `<g>` elements do not support CSS `outline` for focus rings | Medium | Use a hidden rect/circle within the group or `filter: drop-shadow` |
| Luzon-Taiwan circle overlap at proposed coordinates | Medium | Calibrate coordinates with actual image; consider nudging Luzon south |
| Small viewports (<900px) cause circle overlap | Low (deferred) | Add responsive scale factor or clamp container width in follow-up |
| 0-byte image causes broken layout during development | Low | Add `background: #0a1628` fallback on container |

## Open Questions

1. **SVG sizing strategy:** Should the SVG overlay use `viewBox="0 0 100 100"` (percentage-based, radius in viewBox units) or match the natural image pixel dimensions (radius in px)? The viewBox approach scales cleanly but makes radius units unintuitive. The pixel approach is simpler but requires knowing the image dimensions. **Recommendation:** Use `viewBox="0 0 1200 675"` (matching CSS display size) so radius values in px translate directly.

   > **Research resolution:** Confirmed — `viewBox="0 0 1200 675"` with `preserveAspectRatio="xMidYMid slice"` is the correct approach. This keeps radius units intuitive (24-72 map to roughly 24-72 rendered pixels at 1200px width), and `slice` ensures the SVG fills the container the same way `object-fit: cover` fills the image. The implementer must ensure the viewBox aspect ratio matches the source image aspect ratio.

2. **Data field for sizing:** The brainstorm specifies `capacityMt` with a `vessels.total` toggle. The current data only has `flowScalar`. Should this ticket (a) enrich the data schema with real tonnage/vessel counts, or (b) ship with `flowScalar` and add the toggle in a dedicated controls ticket? **Recommendation:** Option (b) — ship with `flowScalar`, add data enrichment and toggle separately.

   > **Research resolution:** The `capacityMt` and `vessels` data already exists in `straits.json` under the `historical` key. No API enrichment needed — the follow-up ticket only needs to surface this data to the top-level strait objects or read it from `historical["2025"]`. This significantly de-risks the metric-toggle follow-up.

3. **Label collision:** For closely-spaced straits (Luzon and Taiwan are geographically near each other), label placement may conflict. Should the implementer use a fixed offset strategy (below/left/right per strait) or implement basic collision detection? **Recommendation:** Fixed offset per strait via a `labelAnchor` field in the data — simplest and sufficient given only 6 points.

   > **Research resolution:** Confirmed — `labelAnchor` field with values `"below" | "right" | "left" | "above"` is the simplest approach. Concrete offset formulas provided in the Circle Positioning research insights above. No collision detection library needed for 6 static points.

4. **Map image source:** Who provides the satellite `.webp`? Is there a preferred source image, or should the implementer acquire one (e.g., NASA Blue Marble, Mapbox static tile)?

   > **Research insight:** NASA Blue Marble "Next Generation" is public domain and high-resolution. Recommended crop region: 30E-180E longitude, 40N-20S latitude. Export at 2400x1350, convert with `cwebp -q 78`. Alternative: Natural Earth raster tiles (also public domain, less photographic).

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

### Research References (from Deepen)

- [D3 scaleSqrt documentation](https://github.com/d3/d3/blob/main/docs/d3-scale/pow.md) — Official D3 pow/sqrt scale reference
- [D3: Encoding values as circles](https://guilhermesimoes.github.io/blog/d3-encoding-values-as-circles) — Explains why sqrt scaling is necessary for proportional circles
- [Creating Accessible SVGs — Deque](https://www.deque.com/blog/creating-accessible-svgs/) — SVG role="img" + title + desc pattern
- [Accessible SVG Patterns — Smashing Magazine](https://www.smashingmagazine.com/2021/05/accessible-svg-patterns-comparison/) — Cross-browser screen reader testing of SVG patterns
- [SVG viewBox Guide — Sara Soueidan](https://www.sarasoueidan.com/blog/svg-coordinate-systems/) — Comprehensive viewport/viewBox/preserveAspectRatio guide
- [Responsive SVG Image Overlays — DEV](https://dev.to/damjess/responsive-svg-image-overlays-4bni) — Overlay SVG on image with position absolute pattern
- [Image Optimization 2025 — FrontendTools](https://www.frontendtools.tech/blog/modern-image-optimization-techniques-2025) — WebP/AVIF compression best practices
- [Accessible SVG and ARIA — data.europa.eu](https://data.europa.eu/apps/data-visualisation-guide/accessible-svg-and-aria) — Data visualization accessibility guidelines
- [NASA Visible Earth — Blue Marble Collection](https://visibleearth.nasa.gov/collection/1484/blue-marble) — Public domain satellite imagery source
