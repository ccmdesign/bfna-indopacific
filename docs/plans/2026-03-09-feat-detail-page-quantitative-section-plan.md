---
title: "feat: Detail page quantitative section"
type: feat
status: completed
date: 2026-03-09
linear: BF-92
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
deepened: 2026-03-09
---

# feat: Detail page quantitative section

## Enhancement Summary

**Deepened on:** 2026-03-09
**Sections enhanced:** 6 (Changes 1-4, Technical Considerations, Risks)
**Research areas:** Responsive SVG/D3 best practices, WCAG 2.5.8 touch targets, CSS Grid odd-item layouts, Vue 3 prop patterns, codebase audit

### Key Improvements
1. **Critical data finding:** `globalShareLabel` values are full sentences (e.g., "~20% of global petroleum consumption") -- too long for the 18px bold metric-value slot. Plan now recommends extracting just the percentage for the metric card value and using the full text as the label.
2. **Third consumer discovered:** `StraitQuantPanel.vue` (line 87) also uses `StraitHistoryChart` but was not listed in the plan's impact analysis. The prop addition is still backward-compatible, but testing must cover this consumer too.
3. **Change 4 is already done:** The `.stacked-bar__legend` in `public/styles.css` already has `flex-wrap: wrap` (line 101). Only the gap value needs updating from `10px` to `8px 14px`.
4. **Accessibility gap:** Chart data points use `r="2.5"` circles in viewBox coordinates, yielding touch targets far below WCAG 2.5.8's 24x24px minimum. While the "Essential" exception applies to dense data visualizations, adding invisible larger hit areas or tooltips would improve usability.
5. **Padding should be prop-proportional:** Rather than hardcoding new PAD values, derive them as ratios of W/H to ensure correct spacing at any dimension passed via props.

### New Risks Discovered
- `globalShareLabel` text overflow in metric card (sentences vs. short numbers)
- `StraitQuantPanel.vue` is an untested third consumer of `StraitHistoryChart`
- SVG tick labels at 8px in viewBox space may still be too small on 320px phones even with the wider viewBox

## Overview

Complete and polish the quantitative data section on the mobile detail page (`StraitMobileDetail.vue`). BF-91 delivered the full detail page layout including hero, qualitative content, and a first pass at quantitative sections (trade value stat, metrics grid, vessel breakdown bar, history chart). BF-92 refines this quantitative section to ensure data completeness, proper mobile-responsive chart sizing, and visual polish.

The existing implementation already renders all quantitative elements. This task focuses on three areas: (1) ensuring the `StraitHistoryChart` renders well at mobile widths, (2) adding the global share stat to the quantitative metrics area, and (3) visual refinements to the stat cards and vessel breakdown for mobile readability.

## Current State (post BF-91)

| Element | Status | Location |
|---|---|---|
| Trade value hero stat (`fmtUsd`) | Done | `StraitMobileDetail.vue:137-140` |
| Key metrics grid (oil, LNG, cargo, vessels) | Done | `StraitMobileDetail.vue:143-160` |
| Vessel breakdown stacked bar | Done | `StraitMobileDetail.vue:163-183` |
| Historical trend chart (`StraitHistoryChart`) | Done (basic) | `StraitMobileDetail.vue:186-188` |
| Divider between qual and quant sections | Done | `StraitMobileDetail.vue:130-134` |
| Global share label in hero | Done | `StraitMobileDetail.vue:97` |

**What needs refinement (BF-92 scope):**

1. `StraitHistoryChart.vue` uses hardcoded `W = 280` and `H = 140` for the SVG viewBox. While `viewBox` scaling handles width responsively, the aspect ratio and padding constants are tuned for the desktop detail panel (~280px wide). On mobile the chart stretches to ~350-560px, causing axis labels and dots to appear disproportionately small.
2. The global share stat appears in the hero section but is not repeated in the quantitative metrics grid alongside oil/LNG/cargo/vessels. The brainstorm lists "global share stats" as a quantitative content item.
3. The chart's `h3` title uses a font size of `10px` which is legible on desktop but may be too small for mobile touch targets and readability.
4. The vessel breakdown legend wraps awkwardly at certain widths due to inline layout with no min-width guidance.

## Proposed Solution

### Change 1: Responsive chart sizing for mobile

Adapt `StraitHistoryChart.vue` to render well across mobile viewports (320px-600px container width). The SVG viewBox approach already scales, but the internal proportions need adjustment for mobile.

**Approach A (recommended): Make dimensions prop-driven**

Add optional `width` and `height` props to `StraitHistoryChart.vue` with sensible defaults:

```ts
// StraitHistoryChart.vue
const props = withDefaults(defineProps<{
  historical: Record<string, StraitHistoricalEntry>
  width?: number
  height?: number
}>(), {
  width: 280,
  height: 140,
})

const W = computed(() => props.width)
const H = computed(() => props.height)
```

Then in `StraitMobileDetail.vue`, pass mobile-optimized dimensions:

```vue
<StraitHistoryChart
  :historical="historical"
  :width="320"
  :height="180"
/>
```

The larger viewBox gives more breathing room for axis labels and data points at mobile widths. The SVG's `width: 100%; height: auto` CSS ensures it still fills its container.

**Padding constants** should also scale:

```ts
const PAD = computed(() => ({
  top: 20,
  right: 44,
  bottom: 28,
  left: 40,
}))
```

Slightly increased padding accommodates the larger viewBox and prevents label clipping on mobile.

**Why not Approach B (container query)?** Container queries could auto-switch chart proportions, but the chart is an SVG with a fixed viewBox -- the scaling is already handled. The issue is the viewBox proportions themselves, which are best controlled via props.

#### Research Insights (Change 1)

**Best Practices (Responsive SVG/D3):**
- The `viewBox` + `width: 100%; height: auto` pattern is the industry-standard approach for responsive SVGs. The current implementation correctly uses this. The refinement needed is purely in viewBox proportions, not the scaling mechanism.
- Consider adding `preserveAspectRatio="xMidYMid meet"` explicitly to the SVG element for defensive correctness, even though it is the default.
- Google's mobile usability guidelines recommend touch targets of at least 48x48px. The chart's data point circles (`r="2.5"` in viewBox space) are purely visual, not interactive, so this is informational rather than blocking. However, if tooltips are ever added, invisible hit areas of at least `r="12"` (in the 320-wide viewBox) would be needed.

**Performance Considerations:**
- Making `W`, `H`, and `PAD` into `computed()` refs is essentially free -- Vue's reactivity system will only re-evaluate dependents when props actually change, and since mobile passes static values (`:width="320"`), this triggers exactly once.
- The D3 `line()` generator and scale computations are already `computed()`, so they automatically chain off the reactive `W`/`H`. No manual watchers needed.

**Proportional Padding Pattern:**
- Rather than hardcoding separate PAD values for mobile, consider deriving padding as proportions of the viewBox dimensions. This makes the chart correct at _any_ dimension, not just 280x140 or 320x180:

```ts
const PAD = computed(() => ({
  top: Math.round(H.value * 0.11),    // ~16 at H=140, ~20 at H=180
  right: Math.round(W.value * 0.14),  // ~40 at W=280, ~45 at W=320
  bottom: Math.round(H.value * 0.17), // ~24 at H=140, ~31 at H=180
  left: Math.round(W.value * 0.13),   // ~36 at W=280, ~42 at W=320
}))
```

This is more robust than fixed padding values and future-proofs for any additional consumers (like `StraitQuantPanel.vue`, which is a third consumer the original plan did not account for).

**Edge Cases:**
- Straits with only 2 years of historical data produce a chart with just 2 data points. At the wider 320px viewBox, the two dots will be further apart, which actually improves readability. No issue here.
- Malacca Strait has the highest cargo values (thousands of Mt). Verify the left Y-axis `fmtCargo` labels (e.g., "4.2k") fit within the left padding at the proportional values.
- Lombok Strait has the lowest values. Verify the scale padding computation `(hi - lo) * 0.15 || 100` does not produce an excessively tall chart area when values are small.

### Change 2: Add global share to quantitative metrics grid

The brainstorm specifies "global share stats" as quantitative content. Currently `globalShareLabel` is shown in the hero section (line 97) as a subtitle under the strait name. Add it as a metric card in the quantitative grid as well, giving it quantitative context alongside oil/LNG/cargo/vessels.

```vue
<!-- In the metrics grid section -->
<div v-if="strait.globalShareLabel" class="strait-mobile-detail__metric">
  <span class="strait-mobile-detail__metric-value">{{ strait.globalShareLabel }}</span>
  <span class="strait-mobile-detail__metric-label">Global share</span>
</div>
```

This gives the metrics grid up to 5 items (oil, LNG, cargo, vessels, global share). With the 2-column grid, the 5th item will sit alone in the last row, left-aligned. This is acceptable and standard for metric grids. Alternatively, consider using `grid-template-columns: repeat(auto-fill, minmax(120px, 1fr))` for more flexible column filling.

**Decision for implementer:** Whether to also remove the `globalShareLabel` from the hero section (to avoid duplication) or keep it in both places. The hero placement provides immediate context; the grid placement groups it with other stats. Keeping both is defensible -- the hero shows it as a headline, the grid shows it as a data point.

#### Research Insights (Change 2)

**Critical Data Finding -- Label Length Mismatch:**
The actual `globalShareLabel` values in the data are full descriptive sentences, not short numbers:
- `"~30% of global trade"`
- `"~20% of global maritime trade"`
- `"~12% of global trade by volume"`
- `"~13-15% of global trade by volume"`
- `"~10% of global trade by volume"`
- `"~20% of global petroleum consumption"`

The other metric card values are short numbers (e.g., "5.5", "1,234", "$2.4T"). Placing a full sentence like "~20% of global petroleum consumption" in the `.strait-mobile-detail__metric-value` slot (styled at `font-size: 18px; font-weight: 600`) will overflow or look visually inconsistent with the numeric cards.

**Recommended approach -- extract the percentage:**
```vue
<div v-if="strait.globalShareLabel" class="strait-mobile-detail__metric">
  <span class="strait-mobile-detail__metric-value">{{ globalSharePct }}</span>
  <span class="strait-mobile-detail__metric-label">Global share</span>
</div>
```

```ts
const globalSharePct = computed(() => {
  const match = props.strait.globalShareLabel.match(/~?[\d.–-]+%/)
  return match ? match[0] : props.strait.globalShareLabel
})
```

This extracts just `"~30%"` or `"~13-15%"` for the value slot, keeping it visually consistent with other metrics. The full label remains in the hero section for context.

**CSS Grid with Odd Item Count:**
For 5 items in a 2-column grid, the best practice is to let the last item sit left-aligned in its row. Using `repeat(auto-fill, minmax(120px, 1fr))` would allow 3 columns on wider phones (414px+), but this changes the visual rhythm and may make individual cards too narrow. The 2-column fixed grid is cleaner and more predictable. If the lone 5th item feels visually unbalanced, span it across both columns:

```css
.strait-mobile-detail__metric:last-child:nth-child(odd) {
  grid-column: 1 / -1;
}
```

However, this makes the global share card wider than others, which may over-emphasize it. Recommendation: keep the default left-aligned single-column placement for the 5th item.

**Note on item count variability:** Three straits (Taiwan, Luzon, Lombok) have `null` for `oilMbpd` and `lngBcfd`. With the `v-if` guards, those straits show only 3 metrics (cargo, vessels, global share) instead of 5. The grid handles this gracefully -- 3 items in a 2-column grid leaves the 3rd item alone in the last row, same as the 5-item case.

### Change 3: Chart title and legend sizing for mobile

Increase the chart title and legend font sizes for mobile readability:

```css
/* In StraitHistoryChart.vue or via a mobile override */
.history-chart__title {
  font-size: 11px;  /* was 10px */
}

.history-chart__legend-item {
  font-size: 11px;  /* was 10px */
}
```

The SVG tick labels (`font-size: 8px` in the viewBox coordinate space) scale proportionally with the viewBox, so they will be larger with the wider viewBox from Change 1.

#### Research Insights (Change 3)

**Accessibility -- WCAG Compliance:**
- WCAG 2.2 Success Criterion 1.4.4 (Resize Text) requires text to be resizable up to 200% without loss of content. The chart title and legend are HTML elements (not SVG text), so they respect browser zoom. The 10px→11px bump helps baseline readability but does not fully address the guideline. Consider using `clamp(11px, 2.8vw, 14px)` for fluid sizing that scales with viewport width.
- The SVG tick labels (8px in viewBox coordinates) are _not_ resizable by browser text zoom because they scale with the viewBox, not the viewport. This is an inherent limitation of SVG text in data visualizations and falls under the WCAG "Essential" exception for information that would be lost if resized.

**Font Size Recommendation:**
- For the `.history-chart__title` (HTML `<h3>`), 11px is the minimum acceptable size. On high-DPI mobile screens (3x), this renders at ~33 physical pixels, which is legible. However, 12px would provide better readability without any visual cost, especially for the uppercase + letter-spacing treatment which reduces perceived size.
- For `.history-chart__legend-item`, 11px is appropriate since legend text is secondary information.

**Implementation note:** These styles are scoped to `StraitHistoryChart.vue` (using `<style scoped>`), so changes only affect this component. No global side effects.

### Change 4: Vessel breakdown legend wrap fix

The stacked bar legend uses `display: flex` with `gap: 14px`. On narrow viewports, legend items can wrap mid-word. Add `flex-wrap: wrap` and a minimum gap to ensure clean wrapping:

```css
/* In public/styles.css (stacked bar styles are global) */
.stacked-bar__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;  /* row-gap column-gap */
}
```

This is a minor polish fix. The existing styles in `public/styles.css` for stacked bars should already have `flex-wrap`, but verify.

#### Research Insights (Change 4)

**Codebase Audit Finding -- Change 4 is partially already done:**
The current `public/styles.css` (line 99-104) already has:
```css
.stacked-bar__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}
```

The `flex-wrap: wrap` is already present. The only remaining change is updating `gap: 10px` to `gap: 8px 14px` (separate row/column gaps). This is a smaller change than the plan originally described.

**Additionally**, the `.stacked-bar__legend-item` already has `font-size: 11px` (line 110), so no font size change is needed for the legend items in the stacked bar context.

## Technical Considerations

### StraitHistoryChart prop addition is backward-compatible

Adding `width` and `height` as optional props with defaults matching the current hardcoded values (280, 140) means the desktop usage of `StraitHistoryChart` is completely unaffected. The desktop `StraitDetailPanel` does not need any changes.

### SVG viewBox scaling behavior

The `StraitHistoryChart` SVG uses `viewBox="0 0 ${W} ${H}"` with CSS `width: 100%; height: auto`. This means:
- The SVG always fills its container width
- The height is determined by the aspect ratio (`H / W`)
- Increasing `W` from 280 to 320 (while increasing `H` from 140 to 180) changes the aspect ratio from 2:1 to ~1.78:1, making the chart slightly taller relative to its width. This is desirable on mobile where vertical space is abundant.

### D3 scale computations are already reactive

All scales (`xScale`, `yScaleCargo`, `yScaleVessels`) and line generators use `computed()` properties that depend on `W`, `H`, and `PAD`. Making these reactive (via `computed(() => props.width)`) means the chart will re-render correctly if the props change. No additional work needed.

### No new dependencies

All changes use existing utilities (`fmtUsd`, `fmtNum`, `computeVesselSegments`), existing types (`Strait`, `StraitHistoricalEntry`), and existing D3 imports. No new packages or composables are needed.

### Stacked bar global styles

The stacked bar styles live in `public/styles.css`, not in the component's scoped styles. Any changes to `.stacked-bar__legend` will apply globally. Verify the desktop `StraitDetailPanel` stacked bar is not negatively affected by the `flex-wrap` addition (it likely already wraps correctly at its fixed width, so this is a no-op for desktop).

### Third consumer: StraitQuantPanel.vue

The plan originally identified two consumers of `StraitHistoryChart`: `StraitDetailPanel.vue` (desktop) and `StraitMobileDetail.vue` (mobile). A codebase audit reveals a third consumer: `StraitQuantPanel.vue` (line 87), which also renders `<StraitHistoryChart>` without passing width/height props. This consumer will correctly receive the 280x140 defaults, so it is backward-compatible. However, it must be tested after the prop addition to confirm no regressions.

### Vue 3 `withDefaults` pattern

The plan uses `withDefaults(defineProps<{...}>(), {...})` which is the correct Vue 3.3+ pattern for typed props with defaults. This is preferred over the runtime `defineProps({...})` syntax because it provides full TypeScript inference. The project already uses `<script setup lang="ts">` throughout, so this is consistent.

## System-Wide Impact

- **StraitHistoryChart API surface**: Adding optional `width`/`height` props is additive. Three consumers exist: `StraitDetailPanel`, `StraitQuantPanel`, and `StraitMobileDetail`. Only `StraitMobileDetail` will pass explicit dimensions; the other two get the existing 280x140 defaults.
- **Stacked bar legend**: The only change needed in `public/styles.css` is updating `gap: 10px` to `gap: 8px 14px`. The `flex-wrap: wrap` is already present. Both mobile and desktop use the same `.stacked-bar` classes. The gap adjustment is safe -- the row-gap only activates when items actually wrap to a second line.
- **No state changes**: All modifications are presentational. No new reactive state, no new API calls, no data mutations.
- **Global share metric card**: Adding a new metric card with extracted percentage text introduces one new `computed()` property (`globalSharePct`) -- minimal reactive overhead.

## Acceptance Criteria

- [x] **Chart readable at mobile widths**: `StraitHistoryChart` renders with adequate label sizing and spacing on viewports 320px-600px wide
- [x] **Chart props**: `StraitHistoryChart` accepts optional `width` and `height` props, defaulting to current 280/140
- [x] **Mobile detail passes mobile-optimized dimensions**: `StraitMobileDetail` passes wider viewBox dimensions (e.g., 320x180) to the chart
- [x] **Global share in metrics grid**: The global share stat appears as a metric card in the quantitative section
- [x] **Chart title/legend legible**: Title and legend text are at least 11px on mobile
- [x] **Vessel legend wraps cleanly**: The stacked bar legend uses `flex-wrap: wrap` with appropriate gap
- [x] **Desktop unaffected**: `StraitHistoryChart` in desktop `StraitDetailPanel` and `StraitQuantPanel` renders identically (default props match current hardcoded values)
- [x] **No regressions**: All 6 straits render correctly on mobile, historical chart shows for straits with >1 year of data, vessel breakdown renders for all straits
- [x] **Global share value formatting**: The metric card shows only the percentage (e.g., "~30%"), not the full sentence
- [x] **Variable metric count**: Straits with null oil/LNG values (Taiwan, Luzon, Lombok) render a 3-item grid correctly

## Files to Modify

| File | Change |
|---|---|
| `components/straits/StraitHistoryChart.vue` | Add optional `width`/`height` props, make `W`/`H`/`PAD` reactive via `computed`, use proportional padding, bump title font to 12px |
| `components/straits/StraitMobileDetail.vue` | Pass mobile-optimized dimensions to `StraitHistoryChart`, add global share metric card with extracted percentage, add `globalSharePct` computed |
| `public/styles.css` | Update `.stacked-bar__legend` gap from `10px` to `8px 14px` (flex-wrap already present) |

## Implementation Sequence

1. **StraitHistoryChart props** — Add `width`/`height` props with defaults, convert `W`/`H`/`PAD` to computed. Verify desktop still renders identically.
2. **Mobile chart dimensions** — In `StraitMobileDetail`, pass `:width="320" :height="180"` to `StraitHistoryChart`. Test on mobile viewports.
3. **Global share metric** — Add the global share card to the metrics grid in `StraitMobileDetail`. Verify grid layout with 5 items.
4. **Legend polish** — Update `.stacked-bar__legend` in `public/styles.css`. Check both mobile and desktop.
5. **Chart text sizing** — Bump title/legend font sizes in `StraitHistoryChart`. Verify both contexts.
6. **Cross-viewport testing** — Test on 320px, 375px, 414px, and 600px widths. Verify all 6 straits.

## Dependencies & Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Changing chart viewBox proportions distorts desktop rendering | Very low | Props default to current values; desktop passes no props |
| 5-item metrics grid looks unbalanced with lone last item | Low | `auto-fill` grid or span the last item across both columns |
| Global share label duplication (hero + grid) feels redundant | Low | Design decision — implementer can remove from hero if preferred |
| Stacked bar `flex-wrap` changes desktop layout | Very low | Desktop bar fits in a single line; wrap only triggers on overflow |
| Chart padding constants too tight on some straits with large numbers | Low | Test with Malacca (highest values) and Lombok (lowest values) to verify label fit |
| **NEW:** `globalShareLabel` text overflow in metric card | **Medium** | Extract percentage only via regex; full label stays in hero |
| **NEW:** `StraitQuantPanel.vue` regression from prop addition | Low | Third consumer uses no explicit props, gets defaults; add to test matrix |
| **NEW:** SVG tick labels still small at 320px viewport | Low | At 320px container, the viewBox scales the 8px text to ~8px rendered. Proportional padding helps, but verify on physical devices |
| **NEW:** `globalSharePct` regex fails on unexpected label format | Very low | The fallback returns the full `globalShareLabel` string if regex match fails |

## Open Questions

1. **Remove global share from hero?** The `globalShareLabel` currently appears below the strait name in the hero. Adding it to the metrics grid creates duplication. Should it be removed from the hero, kept in both, or styled differently in each context? **Research recommendation:** Keep both. The hero shows the full descriptive label as editorial context; the metric card shows the extracted percentage as a data point. These serve different purposes and the visual presentation is distinct enough to not feel redundant.
2. **Chart aspect ratio on landscape mobile?** The proposed 320x180 viewBox is optimized for portrait. On landscape phones (rare for scrolling content), the chart will be quite wide. Is this acceptable, or should the chart cap its max-width? **Research recommendation:** Add `max-width: 560px` to `.history-chart__svg` for landscape constraint. The parent `.strait-mobile-detail` already caps at `max-width: 600px`, so this is a minor belt-and-suspenders addition.
3. **Metric grid column count?** Currently uses `repeat(2, 1fr)`. With 5 metrics, should the grid switch to `repeat(auto-fill, minmax(120px, 1fr))` to allow 3 columns on wider phones? **Research recommendation:** Keep `repeat(2, 1fr)`. The auto-fill approach creates unpredictable column counts across viewports, and the metric cards contain numeric data that benefits from consistent visual scanning in a fixed 2-column layout.
4. **NEW: Chart title font size -- 11px or 12px?** The plan proposes 11px. Research suggests 12px is more readable for uppercase + letter-spaced text on mobile, with no visual cost. Recommend 12px for the title, 11px for the legend items.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) — Key decisions: long scroll with qual-first/quant-second (#5), reuse of StraitHistoryChart (#Technical Considerations)
- **Predecessor plan:** [docs/plans/2026-03-09-feat-detail-page-layout-hero-qualitative-content-plan.md](docs/plans/2026-03-09-feat-detail-page-layout-hero-qualitative-content-plan.md) — BF-91 delivered the detail page layout this task builds on
- **Linear issue:** [BF-92](https://linear.app/ccm-design/issue/BF-92/detail-page-quantitative-section)
- Chart component: `components/straits/StraitHistoryChart.vue`
- Mobile detail: `components/straits/StraitMobileDetail.vue`
- Shared formatters: `utils/straitFormatters.ts`
- Data types: `types/strait.ts`
- Data utilities: `utils/straitsData.ts`
- Global styles (stacked bar): `public/styles.css`
- Third chart consumer: `components/straits/StraitQuantPanel.vue`

## Research References

- [Responsive SVG with viewBox](https://mathisonian.com/writing/easy-responsive-svgs-with-viewbox) -- viewBox scaling patterns
- [WCAG 2.5.8 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) -- touch target requirements and "Essential" exception for data visualizations
- [CSS Grid responsive cards without media queries](https://css-tricks.com/look-ma-no-media-queries-responsive-layouts-using-css-grid/) -- auto-fill/auto-fit patterns for metric grids
- [D3 responsive chart best practices](https://moldstud.com/articles/p-creating-responsive-visualizations-with-d3js-techniques-and-best-practices) -- mobile D3 patterns
