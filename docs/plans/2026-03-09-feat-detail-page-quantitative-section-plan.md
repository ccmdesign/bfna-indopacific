---
title: "feat: Detail page quantitative section"
type: feat
status: active
date: 2026-03-09
linear: BF-92
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
---

# feat: Detail page quantitative section

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

## System-Wide Impact

- **StraitHistoryChart API surface**: Adding optional `width`/`height` props is additive. The only consumer on desktop is `StraitDetailPanel`. It passes no width/height, so it gets the existing 280x140 defaults.
- **Stacked bar legend**: Global style change in `public/styles.css`. Both mobile and desktop use the same `.stacked-bar` classes. The `flex-wrap: wrap` addition is safe -- it only activates when items overflow, which does not happen at the desktop panel width.
- **No state changes**: All modifications are presentational. No new reactive state, no new API calls, no data mutations.

## Acceptance Criteria

- [ ] **Chart readable at mobile widths**: `StraitHistoryChart` renders with adequate label sizing and spacing on viewports 320px-600px wide
- [ ] **Chart props**: `StraitHistoryChart` accepts optional `width` and `height` props, defaulting to current 280/140
- [ ] **Mobile detail passes mobile-optimized dimensions**: `StraitMobileDetail` passes wider viewBox dimensions (e.g., 320x180) to the chart
- [ ] **Global share in metrics grid**: The global share stat appears as a metric card in the quantitative section
- [ ] **Chart title/legend legible**: Title and legend text are at least 11px on mobile
- [ ] **Vessel legend wraps cleanly**: The stacked bar legend uses `flex-wrap: wrap` with appropriate gap
- [ ] **Desktop unaffected**: `StraitHistoryChart` in desktop `StraitDetailPanel` renders identically (default props match current hardcoded values)
- [ ] **No regressions**: All 6 straits render correctly on mobile, historical chart shows for straits with >1 year of data, vessel breakdown renders for all straits

## Files to Modify

| File | Change |
|---|---|
| `components/straits/StraitHistoryChart.vue` | Add optional `width`/`height` props, make `W`/`H`/`PAD` reactive via `computed`, adjust mobile padding constants |
| `components/straits/StraitMobileDetail.vue` | Pass mobile-optimized dimensions to `StraitHistoryChart`, add global share metric card to metrics grid |
| `public/styles.css` | Add `flex-wrap: wrap` and `gap: 8px 14px` to `.stacked-bar__legend` |

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

## Open Questions

1. **Remove global share from hero?** The `globalShareLabel` currently appears below the strait name in the hero. Adding it to the metrics grid creates duplication. Should it be removed from the hero, kept in both, or styled differently in each context?
2. **Chart aspect ratio on landscape mobile?** The proposed 320x180 viewBox is optimized for portrait. On landscape phones (rare for scrolling content), the chart will be quite wide. Is this acceptable, or should the chart cap its max-width?
3. **Metric grid column count?** Currently uses `repeat(2, 1fr)`. With 5 metrics, should the grid switch to `repeat(auto-fill, minmax(120px, 1fr))` to allow 3 columns on wider phones?

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
