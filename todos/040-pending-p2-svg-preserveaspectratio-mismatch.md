---
status: pending
priority: p2
issue_id: "040"
tags: [code-review, architecture, svg]
dependencies: []
---

# SVG preserveAspectRatio Uses "slice" Instead of Plan's "meet"

## Problem Statement

The implementation uses `preserveAspectRatio="xMidYMid slice"` on the SVG overlay, while the deepened plan explicitly recommends `"xMidYMid meet"`. With `slice`, the SVG content is scaled up to fill the container and then **cropped**, which means circles and labels near the edges of the viewBox may be clipped on viewports that don't match the 16:9 aspect ratio. This is especially problematic for the Bab el-Mandeb (posX=20) and Hormuz (posX=25) circles on the left edge.

## Findings

- **File:** `components/StraitMap.vue` line 101 — `preserveAspectRatio="xMidYMid slice"`
- **Plan states:** `preserveAspectRatio="xMidYMid meet"` (see plan line ~18, Enhancement Summary #2)
- The background `<img>` uses `object-fit: cover` which is the CSS equivalent of `slice` — so the image crops. If the SVG also uses `slice`, both layers crop in sync, which keeps circles aligned with the map. However, if viewports are significantly non-16:9, edge circles will be cropped.
- Using `meet` would show the full SVG (with letterboxing) but could misalign with the `cover`-cropped image.

## Proposed Solutions

### Option A: Keep "slice" but verify edge-circle visibility
- **Pros:** Circles stay aligned with the background image at all aspect ratios
- **Cons:** Must verify no circles are cropped at common viewports (1440x900, 1920x1080, tablet)
- **Effort:** Small
- **Risk:** Low — just needs viewport testing

### Option B: Switch to "meet" and change img to object-fit: contain
- **Pros:** Guarantees all circles are always visible
- **Cons:** May show letterboxing (dark bars); changes the visual design
- **Effort:** Small
- **Risk:** Medium — visual design change

### Option C: Add viewport-aware circle position clamping
- **Pros:** Best of both worlds — slice for alignment, clamped positions for visibility
- **Cons:** More complex implementation
- **Effort:** Medium
- **Risk:** Low

## Recommended Action



## Technical Details

- **Affected files:** `components/StraitMap.vue` line 101
- **Components:** StraitMap

## Acceptance Criteria

- [ ] All 6 circles are visible (not cropped) at 1440x900 and 1920x1080 viewports
- [ ] Circles remain aligned over their geographic positions on the background image
- [ ] Decision is documented (slice vs meet) with rationale

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during PR #14 code review | slice keeps alignment with cover image but may crop edge circles |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/14
- Plan: `docs/plans/2026-03-05-feat-overview-map-proportional-circles-plan.md`
