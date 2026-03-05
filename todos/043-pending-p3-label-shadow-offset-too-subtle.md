---
status: pending
priority: p3
issue_id: "043"
tags: [code-review, accessibility, visual]
dependencies: []
---

# Label Shadow Offset (1px) Too Subtle for Legibility

## Problem Statement

The label drop shadow is created by duplicating the `<text>` element with a +1/+1 pixel offset (lines 141-142). At the SVG viewBox scale of 1200x675, a 1-unit offset produces a barely perceptible shadow, especially when the map is displayed at smaller physical sizes. This reduces text legibility over varied background regions of the satellite image.

## Findings

- **File:** `components/StraitMap.vue` lines 141-142 — `:x="strait.labelX + 1"` `:y="strait.labelY + 1"`
- Shadow fill is `rgba(0, 0, 0, 0.6)` which is good opacity but the offset is too tight
- The plan mentions using an SVG `<filter>` as an alternative, which would provide Gaussian blur for better contrast

## Proposed Solutions

### Option A: Increase offset to 2-3 viewBox units
- **Pros:** Simple; immediately more visible
- **Cons:** May look heavy at very large displays
- **Effort:** Small
- **Risk:** Low

### Option B: Use SVG `<filter>` with `feDropShadow` or `feGaussianBlur`
- **Pros:** Smoother, more professional shadow; better contrast
- **Cons:** Slightly more complex SVG; minor performance cost
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `components/StraitMap.vue` lines 140-148

## Acceptance Criteria

- [ ] Label text is legible over both light and dark regions of the satellite image
- [ ] Shadow is visually perceptible at 1440x900 viewport

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during PR #14 code review | SVG text offset shadows need larger values than CSS text-shadow equivalents |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/14
