---
title: "feat: Redesign strait circles to match renewables infographic style"
type: feat
status: active
date: 2026-03-06
linear_issue: BF-87
origin: docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md
---

# Redesign Strait Circles to Match Renewables Infographic Style

## Overview

Replace the plain white semi-transparent circle styling in `StraitMap.vue` with the color-coded, glass-effect visual language used in the renewables line chart (`RenewableEnergyChart.vue`). This creates visual consistency across the infographic series while adding polish through per-strait accent colors, outer glow filters, dim-siblings hover interaction, refined labels, and a proportional-circle scale legend.

## Problem Statement / Motivation

The strait map circles currently use generic white fills (`rgba(255,255,255,0.15)`) and strokes (`rgba(255,255,255,0.6)`) that feel disconnected from the renewables infographic's refined HSL 60% saturation palette and interaction patterns. Since both infographics are part of the same three-part series (see brainstorm: `docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md` -- "Art direction -- shared visual identity"), they must share a cohesive design system.

## Proposed Solution

A single-component refactor of `StraitMap.vue` with six coordinated changes: color-coded circles, glass-effect fills, SVG glow filters, dim-siblings hover, label refinement, and a scale legend. All changes stay within the existing SVG overlay architecture -- no grid or layout modifications.

## Technical Considerations

### Architecture Preservation

- `StraitsInfographic.vue` remains `display: contents` -- untouched
- `StraitMap.vue` keeps its `scaleSqrt` proportional sizing, `preserveAspectRatio="xMidYMid slice"` overlay, and `select-strait` emit interface
- All new visual elements (inner glow circles, glow filters, legend) are added inside the existing `<svg class="circle-overlay">` element
- No new dependencies required

### Color Map Strategy

Define a `STRAIT_COLORS` lookup object in `StraitMap.vue`'s `<script setup>`, keyed by strait `id`. This mirrors the `colorMap` pattern in `RenewableEnergyChart.vue` (line 132). Colors are kept in code rather than `straits.json` because they are presentation concerns, not data -- consistent with how the renewables chart handles its palette.

```ts
// components/StraitMap.vue
const STRAIT_COLORS: Record<string, { h: number; s: number; l: number }> = {
  'malacca':       { h: 186, s: 60, l: 50 },
  'taiwan':        { h: 218, s: 60, l: 58 },
  'bab-el-mandeb': { h: 34,  s: 60, l: 50 },
  'luzon':         { h: 291, s: 60, l: 49 },
  'lombok':        { h: 151, s: 60, l: 45 },
  'hormuz':        { h: 340, s: 60, l: 63 },
}
```

Helper functions derive all needed HSLA variants from HSL values:

```ts
function straitFill(id: string): string {
  const c = STRAIT_COLORS[id]
  return `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.12)`
}
function straitStroke(id: string): string {
  const c = STRAIT_COLORS[id]
  return `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.7)`
}
function straitGlowFill(id: string): string {
  const c = STRAIT_COLORS[id]
  return `hsla(${c.h}, ${c.s}%, 70%, 0.08)`
}
function straitActiveFill(id: string): string {
  const c = STRAIT_COLORS[id]
  return `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.25)`
}
function straitGlowColor(id: string): string {
  const c = STRAIT_COLORS[id]
  return `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.25)`
}
```

### SVG Filter Definitions

Add a `<defs>` block inside the SVG with one `<filter>` per strait for the outer glow effect. Each filter uses `<feGaussianBlur stdDeviation="8">` on a flood-filled circle in the strait's accent color at 0.25 opacity. Filters are referenced by `filter="url(#glow-malacca)"` etc.

```xml
<defs>
  <filter v-for="strait in mappedStraits" :key="'glow-' + strait.id"
          :id="'glow-' + strait.id" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
  </filter>
  <!-- Drop shadow filter for labels -->
  <filter id="label-shadow" x="-10%" y="-10%" width="120%" height="120%">
    <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.6)" flood-opacity="0.6" />
  </filter>
</defs>
```

### Hover State Management

Add a reactive `hoveredStraitId` ref. On `mouseenter`/`focusin` of a circle group, set it; on `mouseleave`/`focusout`, clear it. Apply a computed CSS class to each group:

- When `hoveredStraitId` is null: all circles at default opacity
- When `hoveredStraitId` is set: the active group gets class `strait-active`, all others get `strait-dimmed`
- `.strait-dimmed` applies `opacity: 0.3` with `transition: opacity 0.3s ease`
- `.strait-active` brightens fill to `hsla(hue, 60%, 50%, 0.25)` and stroke to full opacity

This mirrors the renewables chart's `.chart-line-dimmed` pattern (line 469-471 of `RenewableEnergyChart.vue`).

### Circle Rendering (per strait group)

Each `<g class="strait-circle-group">` will contain, in order:

1. **Glow circle** -- same `cx/cy/r` as data circle, filled with strait accent color, filtered through `feGaussianBlur`. Sits behind the data circle.
2. **Data circle** -- `fill: straitFill(id)`, `stroke: straitStroke(id)`, `stroke-width: 1.5`
3. **Inner glow circle** -- `r - 3`, `fill: straitGlowFill(id)`, no stroke. Adds subtle depth.
4. **Focus ring** -- existing pattern preserved (`r + 4`, transparent until `:focus-visible`)
5. **Label** -- single `<text>` with `filter="url(#label-shadow)"` replacing the current two-text-element shadow hack

### Label Format Change

Current: `"Strait of Malacca"` (name only, weight 600)
New: `"Strait of Malacca | ~30% of global trade"` using `globalShareLabel` from data (weight 300, matching renewables `.line-label`)

The label text is already available in `strait.globalShareLabel`. Format in template:

```html
<text :filter="'url(#label-shadow)'" class="strait-label">
  {{ strait.name }} | {{ strait.globalShareLabel }}
</text>
```

### Scale Legend

Add a `<g>` group positioned at the bottom-right of the viewBox (approximately `x: 1050, y: 550`) containing:

- 3 concentric circle outlines representing 25%, 50%, and 100% of trade flow
- Circle radii computed from `radiusScale(25)`, `radiusScale(50)`, `radiusScale(100)`
- Aligned bottom-center with connecting lines to labels
- `rgba(255, 255, 255, 0.2)` circle strokes, `rgba(255, 255, 255, 0.5)` label text
- Font: Encode Sans, 12px, weight 300

The legend circles share a common bottom-center anchor point. Each circle's `cy` is offset so their bottom edges align:

```
cy_legend = baseY - radiusScale(value)
```

Labels sit to the right of each circle with a thin horizontal rule connecting them.

## Acceptance Criteria

### Functional Requirements

- [ ] Each of the 6 straits renders with its assigned HSL accent color (fill, stroke, glow)
- [ ] Circles show glass-effect: tinted translucent fill at 0.12 opacity, colored stroke at 0.7 opacity, inner glow circle at r-3
- [ ] Each circle has a soft radial outer glow via SVG `feGaussianBlur` filter (stdDeviation=8, accent color at 0.25 opacity)
- [ ] Hovering/focusing one circle dims all other circles to `opacity: 0.3`; active circle brightens (fill 0.25, stroke full)
- [ ] Hover transitions use `0.3s ease` timing
- [ ] Labels display `"Strait Name | globalShareLabel"` format in Encode Sans 14px weight 300
- [ ] Labels use SVG `feDropShadow` filter instead of duplicate shadow text elements
- [ ] A proportional-circle scale legend appears in the bottom-right showing 25%, 50%, 100% reference sizes
- [ ] Legend uses `rgba(255,255,255,0.2)` circle strokes and `rgba(255,255,255,0.5)` label text

### Non-Functional Requirements

- [ ] `StraitsInfographic.vue` is NOT modified (grid contract preserved)
- [ ] `scaleSqrt` proportional sizing unchanged
- [ ] SVG `preserveAspectRatio="xMidYMid slice"` unchanged
- [ ] Keyboard focus rings preserved (`tabindex`, `aria-label`, focus ring circle)
- [ ] `prefers-reduced-motion` media query disables all new transitions (hover dimming, fill/stroke changes)
- [ ] No new npm dependencies added

## Implementation Plan

### Step 1: Color system and helpers (~15 min)

**File:** `components/StraitMap.vue` (script section)

- Add `STRAIT_COLORS` lookup and HSLA helper functions
- Add `hoveredStraitId` reactive ref
- Add `onStraitHover(id: string | null)` handler
- Extend `mappedStraits` computed to include color-derived values (fill, stroke, glowFill, activeFill, glowColor)

### Step 2: SVG filter definitions (~10 min)

**File:** `components/StraitMap.vue` (template section)

- Add `<defs>` block inside `<svg>` with:
  - One `<filter id="glow-{id}">` per strait using `feGaussianBlur`
  - One shared `<filter id="label-shadow">` using `feDropShadow`

### Step 3: Circle group restructure (~20 min)

**File:** `components/StraitMap.vue` (template section)

- Restructure each `<g class="strait-circle-group">` to contain (in order):
  1. Glow background circle (filtered)
  2. Data circle with color fill/stroke (inline styles from computed)
  3. Inner glow circle at `r - 3`
  4. Focus ring (existing, unchanged)
- Add hover/focus event handlers to each group
- Add dynamic class binding: `{ 'strait-dimmed': hoveredStraitId && hoveredStraitId !== strait.id, 'strait-active': hoveredStraitId === strait.id }`

### Step 4: Label refinement (~10 min)

**File:** `components/StraitMap.vue` (template section)

- Remove the duplicate shadow `<text>` element
- Update remaining `<text>` to use `filter="url(#label-shadow)"`
- Change text content to `{{ strait.name }} | {{ strait.globalShareLabel }}`

### Step 5: Scale legend (~20 min)

**File:** `components/StraitMap.vue` (template section + script section)

- Add legend data computed: 3 entries for flowScalar values 25, 50, 100 with their radii
- Add `<g class="scale-legend">` group at bottom-right of viewBox
- Render 3 nested circles (bottom-aligned) with connecting lines and labels
- Style with muted white strokes and text

### Step 6: CSS updates (~15 min)

**File:** `components/StraitMap.vue` (style section)

- Remove old `.strait-circle` fill/stroke rules (now inline per-strait)
- Add `.strait-dimmed { opacity: 0.3; transition: opacity 0.3s ease; }`
- Add `.strait-active .strait-circle` brightened rules
- Update `.strait-label` to `font-weight: 300`
- Remove `.strait-label-shadow` class (no longer used)
- Add `.scale-legend` styles
- Extend `prefers-reduced-motion` to cover new transitions

### Step 7: Verify and test (~10 min)

- Visual check: all 6 straits show unique colors with glass effect
- Hover one circle: others dim, active brightens
- Keyboard tab through circles: focus rings visible, dimming works on focusin
- Legend renders cleanly at bottom-right without overlapping circles
- Reduced-motion: verify no transitions fire
- Confirm `select-strait` emit still works

## Dependencies & Risks

**Low risk:** This is a purely visual refactor within a single component. No data model changes, no layout changes, no new dependencies.

**Risk: SVG filter performance.** Six `feGaussianBlur` filters with `stdDeviation=8` could cause paint lag on low-end devices. Mitigation: the filters apply to simple circles (not complex geometry), and the blur radius is modest. If performance issues arise, the glow filters can be conditionally disabled via a CSS custom property or media query.

**Risk: Legend position conflicts.** The bottom-right legend might overlap with the Lombok or other circles depending on viewport. Mitigation: position the legend group at `x: 1050-1150, y: 520-620` in the viewBox and verify at 1440x900 and 1920x1080 viewports. Adjust as needed.

**Risk: Label length.** The new `"Strait Name | globalShareLabel"` format is longer. For example, `"Strait of Malacca | ~30% of global trade"` is significantly wider than just `"Strait of Malacca"`. Verify labels don't overflow or collide, especially for straits with `labelAnchor: "left"` or `"right"` near viewBox edges. May need to truncate `globalShareLabel` to shorter form (e.g., `"~30%"`) if space is tight.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md](docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md) -- Key decisions carried forward: shared HSL 60% saturation palette, Encode Sans typography, glassmorphism visual system

### Internal References

- Renewables color palette: `components/RenewableEnergyChart.vue:132-143`
- Renewables dim-on-hover pattern: `components/RenewableEnergyChart.vue:182-192, 469-471`
- Renewables label style: `components/RenewableEnergyChart.vue:474-480` (weight 300, `"Name | value%"` format)
- Current circle rendering: `components/StraitMap.vue:139-185`
- Current circle CSS: `components/StraitMap.vue:219-230`
- Strait type definition: `types/strait.ts:7-27`
- Grid contract: `public/styles.css:76-81` (`.layout-2 .strait-map` placement)
- Design tokens: `public/styles.css:1-48` (`--size-*`, `--space-*`, `--color-*`)
