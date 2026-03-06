---
title: "feat: Redesign strait circles to match renewables infographic style"
type: feat
status: active
date: 2026-03-06
linear_issue: BF-87
origin: docs/brainstorms/2026-02-22-straits-infographic-brainstorm.md
deepened: 2026-03-06
---

# Redesign Strait Circles to Match Renewables Infographic Style

## Enhancement Summary

**Deepened on:** 2026-03-06
**Sections enhanced:** 8 (Color Map, SVG Filters, Hover State, Circle Rendering, Labels, Legend, CSS, Risks)
**Research sources:** Vue 3 Composition API docs, SVG filter performance research, WCAG 2.1 accessibility guidelines, motion design principles (Emil Kowalski / Jakub Krehel), frontend race condition patterns, code simplicity review, architecture review

### Key Improvements
1. Single shared SVG blur filter instead of per-strait filters (6 filters to 1) -- eliminates redundant filter definitions and reduces paint cost
2. `focusin`/`focusout` event bubbling hazard identified -- must use `@mouseenter`/`@mouseleave` on the group and guard `focusin`/`focusout` against child-to-child transitions
3. Color contrast risk on dark satellite map -- WCAG 3:1 minimum for UI graphics means some HSL colors at 0.7 stroke opacity may fail on dark ocean backgrounds
4. Legend domain mismatch -- `radiusScale(25)` through `radiusScale(100)` uses `flowScalar` domain `[25, 100]`, so `radiusScale(25)` maps to `RADIUS_MIN` (24px) and `radiusScale(50)` is an interpolated midpoint, not "50% of trade"
5. Label collision detection needed -- longer labels near viewBox edges (Bab el-Mandeb at `posX: 20` with `labelAnchor: "left"`, Hormuz at `posX: 25` with `labelAnchor: "left"`) will clip outside SVG bounds

### New Risks Discovered
- `focusout` fires when focus moves between child elements within the same `<g>`, causing flicker
- `feDropShadow` has inconsistent Safari support -- need `feGaussianBlur` + `feOffset` + `feMerge` fallback
- Inline style color changes bypass `prefers-reduced-motion` -- transitions on inline style properties need explicit handling

---

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

#### Research Insights

**Architecture Review:**
- The `display: contents` contract on `StraitsInfographic.vue` is correctly preserved. The plan confines all changes to `StraitMap.vue` internals, which is already a direct grid child via `.strait-map`. No risk of grid breakage.
- The `select-strait` emit interface remains unchanged. The new `hoveredStraitId` state is local to `StraitMap.vue` and does not leak into the parent component's API.

**Pattern Consistency:**
- The plan correctly mirrors the `colorMap` pattern from `RenewableEnergyChart.vue`. However, `RenewableEnergyChart.vue` uses a flat `Record<string, string>` mapping (`name -> hsl(...)` string), while this plan uses a structured `Record<string, {h,s,l}>` object. The structured approach is actually better since it enables the HSLA helper functions -- this is a justified deviation from the renewables pattern.

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

#### Research Insights

**Color Contrast (WCAG 1.4.11 -- Non-text Contrast):**
- UI components and graphical objects require a minimum 3:1 contrast ratio against adjacent colors. The satellite map background is predominantly dark ocean (`#0a1628` fallback, actual ocean tiles ~`#0d1f3a`).
- At `0.7` stroke opacity, some colors may fail the 3:1 threshold against the dark background:
  - `hsl(151, 60%, 45%)` (Lombok green) at 0.7 opacity on `#0a1628` -- verify contrast
  - `hsl(291, 60%, 49%)` (Luzon purple) at 0.7 opacity on `#0a1628` -- verify contrast
- **Recommendation:** During Step 7 testing, check each stroke color against the actual satellite tile beneath each circle using a contrast checker. If any fail, bump `l` by 5-10% for that specific strait.

**Defensive Coding:**
- The helper functions assume `STRAIT_COLORS[id]` always exists. If a new strait is added to `straits.json` without updating `STRAIT_COLORS`, this will throw a runtime error. Add a fallback:
```ts
const DEFAULT_COLOR = { h: 0, s: 0, l: 70 } // neutral grey
function getStraitColor(id: string) {
  return STRAIT_COLORS[id] ?? DEFAULT_COLOR
}
```
- Then use `getStraitColor(id)` in all helpers instead of direct lookup.

**Simplicity Review:**
- `straitGlowColor` and `straitGlowFill` produce very similar values (both low-opacity versions of the accent). Consider whether both are truly needed or if one can serve both the glow circle fill and the filter flood color. If only one is needed, remove the other to reduce surface area.

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

#### Research Insights

**Performance Optimization -- Single Shared Filter:**
- All six per-strait glow filters use identical parameters (`in="SourceGraphic"`, `stdDeviation="8"`). The blur operates on the source graphic's actual pixels regardless of color, so a single shared filter works identically:
```xml
<defs>
  <filter id="glow-shared" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
  </filter>
</defs>
```
- Each glow circle then references `filter="url(#glow-shared)"`. The fill color of the circle being blurred determines the glow color -- no per-strait filter needed.
- This reduces 6 filter definitions to 1, simplifying the DOM and reducing the browser's filter graph setup cost.

**`feDropShadow` Browser Compatibility:**
- `feDropShadow` is an SVG2 shorthand. While modern Chrome and Firefox support it well, Safari has had inconsistent rendering (particularly with `flood-color` in rgba format).
- **Safer alternative** using SVG1.1 primitives:
```xml
<filter id="label-shadow" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
  <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
  <feFlood flood-color="#000" flood-opacity="0.6" result="color" />
  <feComposite in="color" in2="offsetBlur" operator="in" result="shadow" />
  <feMerge>
    <feMergeNode in="shadow" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```
- This is more verbose but guarantees cross-browser rendering.

**Filter Bounds:**
- The `x="-50%" y="-50%" width="200%" height="200%"` bounds on the glow filter are correct -- `stdDeviation="8"` in viewBox units needs roughly 3x sigma (~24px) overflow, and 50% of a circle radius (24-72px) provides ample room.
- The label shadow filter bounds should be expanded to `x="-20%" y="-20%" width="140%" height="140%"` to avoid clipping the blur radius on long label strings.

**Color Interpolation:**
- Add `color-interpolation-filters="sRGB"` to all filter elements to ensure consistent rendering across browsers (Safari defaults to linearRGB, which causes color saturation shifts):
```xml
<filter id="glow-shared" color-interpolation-filters="sRGB" ...>
```

### Hover State Management

Add a reactive `hoveredStraitId` ref. On `mouseenter`/`focusin` of a circle group, set it; on `mouseleave`/`focusout`, clear it. Apply a computed CSS class to each group:

- When `hoveredStraitId` is null: all circles at default opacity
- When `hoveredStraitId` is set: the active group gets class `strait-active`, all others get `strait-dimmed`
- `.strait-dimmed` applies `opacity: 0.3` with `transition: opacity 0.3s ease`
- `.strait-active` brightens fill to `hsla(hue, 60%, 50%, 0.25)` and stroke to full opacity

This mirrors the renewables chart's `.chart-line-dimmed` pattern (line 469-471 of `RenewableEnergyChart.vue`).

#### Research Insights

**Race Condition: `focusin`/`focusout` Bubbling Hazard:**
- `focusin` and `focusout` events bubble. When focus moves from one child element within a `<g>` to another child within the same `<g>` (e.g., from the circle to the text), `focusout` fires on the group, then `focusin` fires again. This causes a flash where `hoveredStraitId` is briefly set to `null`, triggering a visible flicker on all sibling circles.
- **Fix:** Use `@focusin` and `@focusout` with `relatedTarget` guard:
```ts
function onStraitFocusIn(id: string) {
  hoveredStraitId.value = id
}
function onStraitFocusOut(event: FocusEvent, groupEl: Element) {
  // Only clear if focus is leaving the group entirely
  if (!groupEl.contains(event.relatedTarget as Node)) {
    hoveredStraitId.value = null
  }
}
```
- In the template, pass the group element reference: `@focusout="onStraitFocusOut($event, $el)"`. Since `$el` is not available in Vue 3 template context for `<g>` elements, use a template ref or `$event.currentTarget`:
```html
@focusout="onStraitFocusOut($event, $event.currentTarget)"
```

**Race Condition: Rapid Mouse Movement:**
- When the mouse moves quickly between circles, `mouseenter` on the new circle may fire before `mouseleave` on the previous one completes its transition. Since `hoveredStraitId` is a single ref, the last-write-wins behavior is correct -- no debounce needed. However, the CSS transition (0.3s) means visually the dimming may feel sluggish during rapid sweeps.
- **Recommendation:** Consider reducing the opacity transition to `0.15s` for the un-dim direction (returning to full opacity) while keeping `0.3s` for the dim direction. This creates a snappier feel:
```css
.strait-circle-group {
  transition: opacity 0.15s ease; /* fast recovery */
}
.strait-dimmed {
  opacity: 0.3;
  transition: opacity 0.3s ease; /* slower dim */
}
```

**Motion Design (Jakub Krehel Perspective):**
- The 0.3s ease timing matches the renewables chart and is appropriate for this infographic/editorial context. Not a productivity tool, so Emil's speed rules (sub-300ms) are less critical.
- The dim-to-0.3 opacity is a strong effect. Consider 0.35-0.4 for a slightly softer dim that keeps the other circles readable as reference points.

**Touch Device Consideration:**
- `mouseenter`/`mouseleave` do not fire cleanly on touch devices. On iOS, a tap triggers `mouseenter` but `mouseleave` only fires on the next tap elsewhere. This means tapping a circle will dim siblings, and they will stay dimmed until the user taps another circle or blank space.
- **Acceptable for this project:** The infographic targets desktop (1440x900+). Document this as a known limitation rather than adding touch-specific handling.

### Circle Rendering (per strait group)

Each `<g class="strait-circle-group">` will contain, in order:

1. **Glow circle** -- same `cx/cy/r` as data circle, filled with strait accent color, filtered through `feGaussianBlur`. Sits behind the data circle.
2. **Data circle** -- `fill: straitFill(id)`, `stroke: straitStroke(id)`, `stroke-width: 1.5`
3. **Inner glow circle** -- `r - 3`, `fill: straitGlowFill(id)`, no stroke. Adds subtle depth.
4. **Focus ring** -- existing pattern preserved (`r + 4`, transparent until `:focus-visible`)
5. **Label** -- single `<text>` with `filter="url(#label-shadow)"` replacing the current two-text-element shadow hack

#### Research Insights

**Rendering Order Correction:**
- The focus ring is currently the FIRST child in the existing `StraitMap.vue` (line 151-156), sitting behind the data circle. The plan proposes moving it to position 4 (after the inner glow). This changes the visual stacking -- the focus ring will now render ON TOP of the data circle and inner glow, which is actually the correct visual behavior (focus ring should be most visible). This is a good change but should be explicitly noted during implementation.

**Simplicity Review:**
- Three concentric circles per strait (glow + data + inner glow) means 18 circle elements total, plus 6 glow circles, 6 focus rings, and 6 labels = 36 SVG elements in the circle groups. This is well within SVG performance budgets.
- The inner glow circle at `r - 3` with `fill: hsla(..., 0.08)` is extremely subtle. On a circle with `r = 24` (Hormuz, the smallest), the inner glow is `r = 21` -- nearly the same size with almost invisible 8% fill. Verify during testing that this provides visible benefit. If not, remove it for simplicity.

**Inline Styles vs CSS Classes:**
- The plan uses inline styles for per-strait colors (`fill`, `stroke`). This is correct since each strait has unique colors that cannot be expressed in static CSS classes.
- However, ensure that the active state fill change (`straitActiveFill`) is also applied via inline style, not just CSS class, since the base fill is inline. A CSS class override will lose specificity against an inline style. Use `:style` binding with a computed that returns the correct fill based on hover state:
```ts
function circleStyle(id: string) {
  const isActive = hoveredStraitId.value === id
  return {
    fill: isActive ? straitActiveFill(id) : straitFill(id),
    stroke: isActive ? straitStroke(id).replace('0.7)', '1)') : straitStroke(id),
    strokeWidth: 1.5,
  }
}
```

### Label Format Change

Current: `"Strait of Malacca"` (name only, weight 600)
New: `"Strait of Malacca | ~30% of global trade"` using `globalShareLabel` from data (weight 300, matching renewables `.line-label`)

The label text is already available in `strait.globalShareLabel`. Format in template:

```html
<text :filter="'url(#label-shadow)'" class="strait-label">
  {{ strait.name }} | {{ strait.globalShareLabel }}
</text>
```

#### Research Insights

**Label Overflow Analysis (Concrete Data):**
- The longest combined label is: `"Strait of Malacca | ~30% of global trade"` = 42 characters at 14px weight 300. At approximately 7px per character in Encode Sans 300, this is ~294px wide.
- Malacca is at `posX: 55` (center = `660px` in the 1200px viewBox) with `labelAnchor: "below"` (`text-anchor: middle`). The label extends ~147px each side from center, spanning `513px` to `807px` -- safely within viewBox bounds.
- **Problem case: Bab el-Mandeb** at `posX: 20` (center = `240px`) with `labelAnchor: "left"` (`text-anchor: end`). The label `"Bab el-Mandeb | ~12% of global trade by volume"` = 48 characters (~336px). With `text-anchor: end`, the label extends LEFT from `cx - r - 8`. With `r ≈ 40`, the label anchor is at `~192px`, and the label extends 336px to the left, reaching `x = -144px` -- **clipped outside the viewBox**.
- **Problem case: Hormuz** at `posX: 25` (center = `300px`) with `labelAnchor: "left"`. Label `"Strait of Hormuz | ~20% of global petroleum consumption"` = 55 characters (~385px). Anchor at `~268px`, extends to `x = -117px` -- **also clipped**.

**Mitigation Options:**
1. **Truncate labels for left-anchored straits:** Use a shorter form like `"~12% global trade"` instead of the full `globalShareLabel`.
2. **Use `<tspan>` line wrapping:** Break into two lines: name on top, share label below.
3. **Conditionally flip anchor:** If the label would clip, switch from `text-anchor: end` to `text-anchor: start` and position to the right.
4. **Best approach:** Add a computed `displayLabel` that uses the short form for straits near edges:
```ts
function displayLabel(strait: MappedStrait): string {
  const shortShare = strait.globalShareLabel.replace(/of global .*/, '').trim()
  // For left-anchored near left edge, use short form
  if (strait.labelAnchor === 'left' && strait.posX < 30) {
    return `${strait.name} | ${shortShare}`
  }
  return `${strait.name} | ${strait.globalShareLabel}`
}
```

**Accessibility (Screen Readers):**
- The `aria-label` on each `<g>` group already includes both name and `globalShareLabel` (line 145 of current code: `` :aria-label="`${strait.name}: ${strait.globalShareLabel}`" ``). The visual label change is therefore already consistent with what screen readers announce. Good.

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

#### Research Insights

**Domain Semantics Clarification:**
- The `radiusScale` domain is `[25, 100]` (min and max `flowScalar` values in the data). This means:
  - `radiusScale(25)` = `RADIUS_MIN` = 24px (Hormuz, the smallest)
  - `radiusScale(100)` = `RADIUS_MAX` = 72px (Malacca, the largest)
  - `radiusScale(50)` ≈ 42px (interpolated midpoint)
- The legend labels should NOT say "25% / 50% / 100%" because these are `flowScalar` values, not percentages. The labels should say something like "Low / Medium / High" or use the actual flowScalar context: "Relative trade volume" with marks at 25, 50, 100.
- **Recommendation:** Use the legend values as qualitative reference points:
  - Smallest circle: label with actual Hormuz-scale reference
  - Middle circle: unlabeled or "50"
  - Largest circle: label with actual Malacca-scale reference
- Or, more simply, just label the legend "Trade Volume" with the three circles and no numeric labels -- the proportional comparison is the point.

**Legend Position vs. Lombok:**
- Lombok is at `posX: 60, posY: 72` → viewBox coords `(720, 486)` with `r ≈ 30` and `labelAnchor: "below"` (label at `y ≈ 532`).
- The proposed legend at `(1050, 550)` is 330px to the right and 64px below Lombok's center. The largest legend circle (72px radius) would span from `y: 478` to `y: 622`. This should not overlap with Lombok's label.
- However, verify at `xMidYMid slice` crop that the legend is not cut off at narrow viewports. At 1440x900, the slice crop removes ~13% from each side -- the legend at `x: 1050` should remain visible.

**Accessibility:**
- The scale legend should have `role="img"` with an `aria-label` like `"Scale legend: circle size represents relative trade volume"`. Individual legend circles do not need to be interactive or focusable.
- Add `aria-hidden="true"` to the decorative connecting lines.

### Hover State Management

*(See above section)*

### Circle Rendering (per strait group)

*(See above section)*

### Label Format Change

*(See above section)*

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

#### Research Additions to Functional Requirements

- [ ] Labels for left-anchored straits near viewBox edges do not clip outside bounds (test Bab el-Mandeb and Hormuz specifically)
- [ ] `focusout` does not cause flicker when focus moves between children within the same strait group
- [ ] Glow filter uses a single shared `<filter>` element rather than per-strait duplicates

### Non-Functional Requirements

- [ ] `StraitsInfographic.vue` is NOT modified (grid contract preserved)
- [ ] `scaleSqrt` proportional sizing unchanged
- [ ] SVG `preserveAspectRatio="xMidYMid slice"` unchanged
- [ ] Keyboard focus rings preserved (`tabindex`, `aria-label`, focus ring circle)
- [ ] `prefers-reduced-motion` media query disables all new transitions (hover dimming, fill/stroke changes)
- [ ] No new npm dependencies added

#### Research Additions to Non-Functional Requirements

- [ ] All filter elements include `color-interpolation-filters="sRGB"` for Safari consistency
- [ ] Stroke colors at their rendered opacity pass WCAG 3:1 contrast ratio against the satellite map background
- [ ] Scale legend group has `role="img"` and `aria-label` for screen readers
- [ ] `STRAIT_COLORS` includes a fallback for unknown strait IDs to prevent runtime errors if data changes

## Implementation Plan

### Step 1: Color system and helpers (~15 min)

**File:** `components/StraitMap.vue` (script section)

- Add `STRAIT_COLORS` lookup and HSLA helper functions
- Add `hoveredStraitId` reactive ref
- Add `onStraitHover(id: string | null)` handler
- Extend `mappedStraits` computed to include color-derived values (fill, stroke, glowFill, activeFill, glowColor)

#### Research Additions

- Add `DEFAULT_COLOR` fallback and `getStraitColor()` wrapper function
- Add `circleStyle(id)` computed that returns the correct inline style object based on hover state (handles active vs. default fill/stroke in one place)
- Add `displayLabel(strait)` function that truncates `globalShareLabel` for edge-anchored straits near viewBox bounds
- Add `onStraitFocusOut(event, currentTarget)` handler with `relatedTarget` guard to prevent focus flicker

### Step 2: SVG filter definitions (~10 min)

**File:** `components/StraitMap.vue` (template section)

- Add `<defs>` block inside `<svg>` with:
  - ~~One `<filter id="glow-{id}">` per strait using `feGaussianBlur`~~ **Revised:** One shared `<filter id="glow-shared">` using `feGaussianBlur`
  - One shared `<filter id="label-shadow">` using `feDropShadow` (or SVG1.1 fallback: `feGaussianBlur` + `feOffset` + `feMerge`)

#### Research Additions

- Add `color-interpolation-filters="sRGB"` to all `<filter>` elements
- Consider using SVG1.1 filter primitives for the label shadow instead of `feDropShadow` for Safari compatibility
- Expand label shadow filter bounds to `x="-20%" y="-20%" width="140%" height="140%"` to prevent clipping on long labels

### Step 3: Circle group restructure (~20 min)

**File:** `components/StraitMap.vue` (template section)

- Restructure each `<g class="strait-circle-group">` to contain (in order):
  1. Glow background circle (filtered with `url(#glow-shared)`)
  2. Data circle with color fill/stroke (inline styles from computed)
  3. Inner glow circle at `r - 3`
  4. Focus ring (existing, moved from position 1 to position 4 for correct visual stacking)
- Add hover/focus event handlers to each group
- Add dynamic class binding: `{ 'strait-dimmed': hoveredStraitId && hoveredStraitId !== strait.id, 'strait-active': hoveredStraitId === strait.id }`

#### Research Additions

- Use `@mouseenter` / `@mouseleave` for mouse hover (simple, no bubbling issues)
- Use `@focusin` / `@focusout` with `relatedTarget` guard for keyboard focus (prevents flicker on child-to-child focus transitions)
- Use `:style="circleStyle(strait.id)"` on the data circle to handle both default and active states via a single computed, avoiding CSS specificity issues with inline styles

### Step 4: Label refinement (~10 min)

**File:** `components/StraitMap.vue` (template section)

- Remove the duplicate shadow `<text>` element
- Update remaining `<text>` to use `filter="url(#label-shadow)"`
- Change text content to `{{ displayLabel(strait) }}` (using the edge-aware computed, not raw concatenation)

### Step 5: Scale legend (~20 min)

**File:** `components/StraitMap.vue` (template section + script section)

- Add legend data computed: 3 entries for flowScalar values 25, 50, 100 with their radii
- Add `<g class="scale-legend" role="img" aria-label="Scale legend: circle size represents relative trade volume">` group at bottom-right of viewBox
- Render 3 nested circles (bottom-aligned) with connecting lines and labels
- Style with muted white strokes and text
- Mark decorative connecting lines with `aria-hidden="true"`

#### Research Additions

- Verify legend semantics: labels should reflect flowScalar context, not imply percentages
- Test legend visibility at `xMidYMid slice` crop on 1440x900 viewport

### Step 6: CSS updates (~15 min)

**File:** `components/StraitMap.vue` (style section)

- Remove old `.strait-circle` fill/stroke rules (now inline per-strait)
- Add `.strait-dimmed { opacity: 0.3; transition: opacity 0.3s ease; }`
- Add `.strait-active .strait-circle` brightened rules
- Update `.strait-label` to `font-weight: 300`
- Remove `.strait-label-shadow` class (no longer used)
- Add `.scale-legend` styles
- Extend `prefers-reduced-motion` to cover new transitions

#### Research Additions

- Add asymmetric transition timing: `.strait-circle-group { transition: opacity 0.15s ease; }` for fast recovery, `.strait-dimmed { transition: opacity 0.3s ease; }` for slower dim
- Ensure `prefers-reduced-motion` covers both the CSS transitions AND any inline style transitions. Since inline style changes (fill/stroke color) are instant by default (no CSS transition property on fill/stroke was defined), they are already reduced-motion safe. But verify the opacity transition on the group is disabled.
- Add `pointer-events: none` to the glow circle and inner glow circle to ensure clicks and hovers register on the data circle / group, not on the decorative layers

### Step 7: Verify and test (~10 min)

- Visual check: all 6 straits show unique colors with glass effect
- Hover one circle: others dim, active brightens
- Keyboard tab through circles: focus rings visible, dimming works on focusin
- Legend renders cleanly at bottom-right without overlapping circles
- Reduced-motion: verify no transitions fire
- Confirm `select-strait` emit still works

#### Research Additions

- **Label clipping test:** Specifically check Bab el-Mandeb and Hormuz labels at full combined length. If clipped, confirm the `displayLabel` truncation activates.
- **Focus flicker test:** Tab rapidly between circles and verify no flash of all-circles-bright during focus transitions within a group.
- **Safari rendering test:** Check that the label shadow filter renders correctly. If `feDropShadow` is used and fails, switch to SVG1.1 fallback.
- **Contrast verification:** For each strait, screenshot the circle against its actual background and verify the stroke color meets WCAG 3:1.
- **Viewport test at 1440x900:** Verify legend is not cropped by `xMidYMid slice`.

## Dependencies & Risks

**Low risk:** This is a purely visual refactor within a single component. No data model changes, no layout changes, no new dependencies.

**Risk: SVG filter performance.** Six `feGaussianBlur` filters with `stdDeviation=8` could cause paint lag on low-end devices. Mitigation: the filters apply to simple circles (not complex geometry), and the blur radius is modest. If performance issues arise, the glow filters can be conditionally disabled via a CSS custom property or media query.

**Risk: Legend position conflicts.** The bottom-right legend might overlap with the Lombok or other circles depending on viewport. Mitigation: position the legend group at `x: 1050-1150, y: 520-620` in the viewBox and verify at 1440x900 and 1920x1080 viewports. Adjust as needed.

**Risk: Label length.** The new `"Strait Name | globalShareLabel"` format is longer. For example, `"Strait of Malacca | ~30% of global trade"` is significantly wider than just `"Strait of Malacca"`. Verify labels don't overflow or collide, especially for straits with `labelAnchor: "left"` or `"right"` near viewBox edges. May need to truncate `globalShareLabel` to shorter form (e.g., `"~30%"`) if space is tight.

### New Risks Discovered Through Research

**Risk: `focusout` flicker (Medium).** `focusout` bubbles from child elements within a `<g>` group. When focus moves between sibling SVG elements inside the same group, `focusout` fires before `focusin`, briefly setting `hoveredStraitId` to `null`. This causes a visible flicker where all circles flash to full opacity for one frame. **Mitigation:** Guard `focusout` handler with `event.currentTarget.contains(event.relatedTarget)` check.

**Risk: `feDropShadow` Safari rendering (Low-Medium).** The `feDropShadow` SVG2 shorthand has inconsistent rendering in Safari, particularly with `flood-color` specified in rgba format. **Mitigation:** Use SVG1.1 filter primitives (`feGaussianBlur` + `feOffset` + `feComposite` + `feMerge`) for the label shadow.

**Risk: Label clipping for left-anchored straits (Medium).** Bab el-Mandeb and Hormuz labels with full `globalShareLabel` text extend beyond `x: 0` of the viewBox. SVG clips content outside the viewBox by default. **Mitigation:** Use a `displayLabel` computed that shortens labels for edge-positioned straits.

**Risk: Inline style specificity vs CSS transitions (Low).** Fill and stroke colors applied via `:style` binding cannot be overridden by CSS classes (inline styles win specificity). If the active state uses a different fill/stroke, it must also be applied via `:style`, not a CSS class. **Mitigation:** Handle all color state changes in the `circleStyle()` computed function.

**Risk: Color contrast on dark backgrounds (Low).** Some HSL colors at 0.7 stroke opacity may not meet WCAG 3:1 contrast against the dark satellite map. **Mitigation:** Test each color in-situ and increase lightness if needed.

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

### External References (from deepening research)

- [SVG Filter Effects -- MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Filter_effects) -- filter bounds, feGaussianBlur usage
- [SVG Optimization for Web Performance (2026)](https://vectosolve.com/blog/svg-optimization-web-performance-2025) -- filter performance guidelines
- [WCAG 2.1 Non-text Contrast (1.4.11)](https://www.w3.org/WAI/WCAG21/quickref/#non-text-contrast) -- 3:1 ratio for UI graphics
- [SVG Accessibility / ARIA roles for charts -- W3C](https://www.w3.org/wiki/SVG_Accessibility/ARIA_roles_for_charts) -- role attributes for SVG data visualizations
- [Accessible SVG and ARIA -- data.europa.eu](https://data.europa.eu/apps/data-visualisation-guide/accessible-svg-and-aria) -- title/desc patterns for SVG
