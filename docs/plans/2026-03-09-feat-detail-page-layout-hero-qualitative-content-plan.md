---
title: "feat: Detail page layout + hero + qualitative content"
type: feat
status: active
date: 2026-03-09
linear: BF-91
origin: docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md
---

# feat: Detail page layout + hero + qualitative content

## Overview

Enhance the existing `StraitMobileDetail.vue` component to align with the brainstorm specification for the mobile detail page. The component already renders all required sections (hero circle, trade value, metrics, description, industries, threats, facts, vessel breakdown, historical chart) but needs three adjustments: (1) reorder content to match the brainstorm's "qual first, quant second" reading flow, (2) make the hero circle responsive instead of fixed-size, and (3) add a particle slot placeholder for future BF-78 integration.

This is an **enhancement task** — not a rebuild. BF-89 delivered the routing and card list, BF-90 polished the card previews, and BF-91 refines the detail page itself.

## Current State (BF-89/BF-90 baseline)

| Capability | Status | File |
|---|---|---|
| Mobile detail page with all sections | Done | `components/straits/StraitMobileDetail.vue` |
| Hero circle via `StraitCircle` (fixed radius 144) | Done | `components/straits/StraitMobileDetail.vue:42-50` |
| Strait name + global share label overlay | Done | `components/straits/StraitMobileDetail.vue:52-53` |
| Trade value hero stat | Done | `components/straits/StraitMobileDetail.vue:57-60` |
| Key metrics grid (oil, LNG, cargo, vessels) | Done | `components/straits/StraitMobileDetail.vue:63-80` |
| Description paragraph | Done | `components/straits/StraitMobileDetail.vue:83-85` |
| Top industries tags | Done | `components/straits/StraitMobileDetail.vue:88-93` |
| Threats tags | Done | `components/straits/StraitMobileDetail.vue:96-101` |
| Key facts list | Done | `components/straits/StraitMobileDetail.vue:104-109` |
| Vessel breakdown stacked bar | Done | `components/straits/StraitMobileDetail.vue:112-132` |
| Historical trend chart | Done | `components/straits/StraitMobileDetail.vue:135-137` |
| Sticky back navigation bar | Done | `components/straits/StraitMobileDetail.vue:26-37` |
| Mobile routing (`[[id]].vue`) | Done | `pages/infographics/straits/[[id]].vue` |
| Particle system in `StraitCircle` (gated to `selected` + polygon-ready) | Done | `components/straits/StraitCircle.vue:15-17` |

## Problem Statement / Motivation

The brainstorm (see `docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md`) specifies the detail page reading order as:

> 1. Hero: zoomed-in circle with satellite image + animated particle flow
> 2. Strait name overlay on the hero
> 3. Description paragraph
> 4. Qualitative data (top industries, threats, key facts)
> 5. Quantitative data (trade value, oil/LNG, vessel breakdown, historical trend chart)

The current implementation places **quantitative data before qualitative data** (trade value and metrics appear between the hero and description). This inverts the brainstorm's "natural mobile reading flow" decision (see brainstorm: Key Decision #5 — "Qual data first, then quant data").

Additionally:
- The hero circle uses a fixed `HERO_RADIUS = 144` (288px diameter), which doesn't adapt to viewport width. On narrow phones (320px viewport) the circle is nearly edge-to-edge, while on wider phones (428px) it looks small.
- No visual slot or placeholder exists for the particle system integration (BF-78/BF-88). While only `hormuz` has polygon data today, the hero should be structurally ready for particles at any circle size.

## Proposed Solution

### Change 1: Reorder sections to qual-first flow

Move the trade value hero stat and key metrics grid **below** the qualitative sections. New order in `StraitMobileDetail.vue` template:

1. Sticky back nav (unchanged)
2. Hero section: circle + name + global share label (unchanged)
3. Description paragraph
4. Top Industries
5. Threats
6. Key Facts
7. **Divider** (visual separator between qual and quant)
8. Trade value hero stat
9. Key metrics grid
10. Vessel breakdown bar
11. Historical trend chart

This matches the brainstorm's reading flow exactly. The divider provides a clear visual break between the qualitative narrative and the quantitative data.

### Change 2: Responsive hero circle

Replace the fixed `HERO_RADIUS = 144` with a responsive approach:

```vue
<!-- StraitMobileDetail.vue -->
const HERO_MAX_DIAMETER = 288  // px, same as current 144 * 2
```

Use CSS to make the hero circle container responsive:

```css
.strait-mobile-detail__hero-circle {
  width: min(65vw, 288px);
  aspect-ratio: 1;
  margin-bottom: 1.25rem;
}
```

Pass the actual rendered size to `StraitCircle` via a `ResizeObserver` or compute from viewport width. The `StraitCircle` component accepts a `radius` prop in pixels, so the computed value needs to be half the container width.

**Implementation approach:** Use a `ref` + `ResizeObserver` on the hero-circle container to get its rendered width, then pass `width / 2` as the radius to `StraitCircle`. This keeps the circle responsive while StraitCircle continues to work with its existing pixel-based API.

```ts
const heroCircleRef = ref<HTMLElement | null>(null)
const heroRadius = ref(144) // fallback

onMounted(() => {
  if (!heroCircleRef.value) return
  const ro = new ResizeObserver(([entry]) => {
    heroRadius.value = Math.round(entry.contentRect.width / 2)
  })
  ro.observe(heroCircleRef.value)
  onScopeDispose(() => ro.disconnect())
})
```

### Change 3: Section divider between qual and quant

Add a lightweight horizontal divider element between the Key Facts section and the Trade Value stat. Style it consistently with the existing `__desc` bottom border:

```css
.strait-mobile-detail__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 8px 0 20px;
}
```

This creates a clear visual boundary that signals the shift from narrative content to data.

## Technical Considerations

### StraitCircle radius reactivity
`StraitCircle` uses the `radius` prop to set `--diameter` via inline style (`radius * 2 + 'px'`). It also has a CSS transition on `width` and `height`. The ResizeObserver approach will cause the radius to update on viewport resize, which will trigger the transition. This is acceptable — the transition is 0.6s cubic-bezier and will produce a smooth resize animation. If this feels sluggish, debounce the ResizeObserver callback or disable the transition for the mobile detail context.

### Particle system readiness
`StraitCircle` already conditionally renders `StraitParticleCanvas` when `selected=true` AND the strait is in `POLYGON_READY_STRAITS`. The mobile detail already passes `:selected="true"`, so particles will render for Hormuz automatically once the particle canvas works at larger sizes. The responsive radius change ensures the `circleSize` prop passed to `StraitParticleCanvas` tracks the actual rendered size. **No additional particle work needed in this task.**

### No new components or files
All changes are within `StraitMobileDetail.vue`. No new components, utils, or types are needed. The template reorder is a cut-and-paste operation within the existing `<template>` block.

### Swipe navigation — out of scope
The brainstorm mentions "horizontal swipe on the detail page navigates to adjacent straits" (see brainstorm: Resolved Questions #2). This requires touch gesture handling and knowledge of the sorted strait list. It is architecturally separate from layout/content ordering and should be tracked as a follow-up task.

## Acceptance Criteria

- [ ] **Qual-first ordering**: Description, Industries, Threats, and Key Facts appear above Trade Value, Metrics, Vessel Breakdown, and Historical Chart
- [ ] **Visual divider**: A subtle horizontal rule separates the qualitative and quantitative sections
- [ ] **Responsive hero circle**: The hero circle scales with viewport width, capped at 288px diameter, using `min(65vw, 288px)` or equivalent
- [ ] **StraitCircle radius prop**: The `radius` passed to `StraitCircle` reflects the actual rendered size (via ResizeObserver), not a hardcoded constant
- [ ] **Particle readiness**: `StraitCircle` continues to receive `:selected="true"` so particles render for polygon-ready straits at the correct size
- [ ] **No regression**: Back navigation, sticky nav, all 6 straits render correctly, no broken styles on viewports 320px-899px
- [ ] **Desktop unaffected**: `StraitMobileDetail` only renders on mobile (`isMobile` guard in `[[id]].vue`)

## Files to Modify

| File | Change |
|---|---|
| `components/straits/StraitMobileDetail.vue` | Reorder template sections, add divider element, replace fixed HERO_RADIUS with responsive ResizeObserver, add hero-circle ref, update CSS |

## Dependencies & Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| ResizeObserver not supported on old mobile browsers | Low (95%+ global support) | Fallback to `heroRadius = 144` default value |
| StraitCircle transition looks janky during viewport resize | Low | Debounce the ResizeObserver callback at 100ms, or add `.strait-circle--no-transition` class for mobile detail context |
| Reorder breaks scroll position or sticky nav behavior | Very low | Sticky nav is `position: sticky; top: 0` and is unaffected by content order below it |

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md](docs/brainstorms/2026-03-07-mobile-strait-cards-brainstorm.md) — Key decisions carried forward: qual-first reading flow (#5), particles as hero decoration (#4), long scroll with no tabs (#5)
- Current implementation: `components/straits/StraitMobileDetail.vue`
- Circle component: `components/straits/StraitCircle.vue`
- Particle canvas: `components/straits/StraitParticleCanvas.vue`
- Mobile routing: `pages/infographics/straits/[[id]].vue`
