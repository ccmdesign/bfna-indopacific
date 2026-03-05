---
status: resolved
priority: p3
issue_id: "044"
tags: [code-review, quality, responsive]
dependencies: []
---

# SVG Label Font Size (14px) Not Responsive to Viewport

## Problem Statement

The SVG label text uses a hardcoded `font-size: 14px` in CSS (lines 219, 226). Because the SVG uses a viewBox, this 14px is in viewBox coordinate units (not CSS pixels), so it scales proportionally with the SVG. However, the plan notes that on viewports narrower than ~900px, circles will overlap. At those sizes, 14px viewBox-unit text rendered into a small physical area may become illegibly small, and labels may overlap each other.

## Findings

- **File:** `components/StraitMap.vue` lines 219, 226 — `font-size: 14px` in both label classes
- No responsive breakpoint for the SVG content
- Plan acknowledges: "On viewports narrower than ~900px, circles at current RADIUS_MIN/MAX will overlap"

## Proposed Solutions

### Option A: Accept current behavior — mobile is out of scope for this ticket
- **Pros:** No work; plan already calls this out as a future consideration
- **Cons:** Poor experience on tablets
- **Effort:** None
- **Risk:** Low (known limitation)

### Option B: Add a CSS media query to hide labels below a breakpoint
- **Pros:** Prevents overlap; labels reappear on larger screens
- **Cons:** Loses information on smaller screens
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `components/StraitMap.vue` lines 217-231

## Acceptance Criteria

- [ ] Labels are legible at target viewports (1440x900, 1920x1080)
- [ ] A decision is documented for sub-900px behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during PR #14 code review | SVG viewBox font-size units scale with the SVG, but physical readability depends on container size |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/14
