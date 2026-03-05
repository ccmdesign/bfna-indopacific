---
status: resolved
priority: p3
issue_id: "043"
tags: [code-review, ux, layout]
dependencies: ["041"]
---

# Absolute Footer May Overlap Test Page Content

## Problem Statement

The default layout's footer is `position: absolute; bottom: 0` with `height: 4rem`. The page wrapper has `padding-bottom: 4rem` to compensate. However, on the test page, the footer will contain only the BFNA logo (no `embedSlug` or `footerSource` in page meta), and if the page scrolls (per finding #041), the absolute footer will stick to the bottom of the container, potentially overlapping scrolled content.

**Why it matters:** On a scrollable test page, the absolute footer behavior may produce a floating footer that overlaps the last embed section's content.

## Findings

- `layouts/default.vue` lines 103-116: `footer { position: absolute; bottom: 0; height: 4rem; }`
- The test page does not set `embedSlug` or `footerSource`, so the footer shows only the BFNA logo
- With scrollable content, absolute positioning may cause overlap

## Proposed Solutions

### Option A: Accept minor overlap
The footer only shows a small logo for the test page. The `padding-bottom: 4rem` on the wrapper should provide enough clearance if scrolling is fixed via finding #041.

- **Pros:** No changes needed
- **Cons:** Edge case overlap possible
- **Effort:** None
- **Risk:** Low

### Option B: Hide footer on test page via layout class
Use the `.layout-test` class to hide or minimize the footer.

- **Pros:** Clean test page
- **Cons:** Hides the BFNA branding
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A -- accept it, as the padding-bottom should provide sufficient clearance once scrolling is fixed.

## Technical Details

**Affected files:**
- `layouts/default.vue` (footer styles)

## Acceptance Criteria

- [ ] Footer does not obscure readable content on the test page

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during code review of PR #15 | Related to absolute footer pattern flagged in existing todo 008 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/15
- Existing related todo: `008-pending-p3-absolute-footer-overlap-risk.md`
