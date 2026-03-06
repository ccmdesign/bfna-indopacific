---
status: pending
priority: p3
issue_id: "067"
tags: [code-review, accessibility, quality]
dependencies: []
---

# Close Button Uses HTML Entity Instead of SVG Icon

## Problem Statement

The close button (line 229) uses `&times;` (multiplication sign character) as its visual content. While this has an `aria-label="Close zoom"` for screen readers, the visual rendering of `&times;` varies across fonts and platforms. An SVG icon or Unicode "X" character would be more consistent and scale better at different sizes.

## Findings

- **Agent:** quality-reviewer
- **Location:** `components/StraitLensZoom.vue:229`
- **Evidence:** `&times;` character rendering varies by font
- **Impact:** Minor visual inconsistency across platforms

## Proposed Solutions

### Option A: SVG Close Icon

Replace `&times;` with an inline SVG "X" icon for consistent rendering.

- **Effort:** Small
- **Risk:** None

### Option B: Accept Current Implementation

`&times;` is widely used and the button has proper `aria-label`. Acceptable for MVP.

- **Effort:** None
- **Risk:** None

## Technical Details

- **Affected files:** `components/StraitLensZoom.vue`

## Acceptance Criteria

- [ ] Close button renders consistently across browsers

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #18 review | |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/18
