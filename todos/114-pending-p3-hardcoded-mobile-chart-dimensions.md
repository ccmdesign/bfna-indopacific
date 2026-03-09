---
status: pending
priority: p3
issue_id: "114"
tags: [code-review, quality, responsiveness]
dependencies: []
---

# Hardcoded Mobile Chart Dimensions

## Problem Statement
`StraitMobileDetail.vue` passes hardcoded `:width="320" :height="180"` to `StraitHistoryChart`. While this works for current mobile widths, it doesn't adapt if the container is narrower than 320px (small phones) or wider (tablets in portrait). The chart's `preserveAspectRatio="xMidYMid meet"` and `width: 100%` CSS mean the SVG scales, but the internal coordinate system and text sizing are optimized for 320x180.

**Why it matters:** The proportional padding ratios were designed around the chart's coordinate dimensions. At very different display sizes, the padding proportions may look unbalanced because the SVG text (8px, 11px, 12px) is in viewBox coordinates, not screen pixels.

## Findings
- **File:** `components/straits/StraitMobileDetail.vue`, line 198
- Hardcoded: `:width="320" :height="180"`
- The parent container uses `max-width: 600px` so the chart could render at up to 600px wide
- SVG viewBox scaling means text and padding are proportionally correct at any size, but tick label readability may vary

## Proposed Solutions

### Option A: Accept current dimensions
- 320x180 is a reasonable mobile-first default; SVG scaling handles the rest
- **Pros:** No change needed
- **Effort:** None
- **Risk:** None

### Option B: Use container-width-aware computed
- Use a ResizeObserver (already in the component) to set chart width dynamically
- **Pros:** Optimal text sizing at all widths
- **Cons:** Adds complexity for marginal benefit
- **Effort:** Medium
- **Risk:** Low

## Recommended Action
<!-- Filled during triage -->

## Technical Details
- **Affected files:** `components/straits/StraitMobileDetail.vue`

## Acceptance Criteria
- [ ] Chart looks correct on screens from 320px to 600px wide

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Created from PR #29 code review | SVG viewBox scaling mitigates this |

## Resources
- PR: https://github.com/ccmdesign/bfna-indopacific/pull/29
