---
status: pending
priority: p2
issue_id: "031"
tags: [code-review, css, dead-code, quality]
dependencies: []
---

# Dead Grid CSS Properties in `.layout-home`

## Problem Statement

The `.layout-home` class in `public/styles.css` (lines 124-136) sets `display: flex` to override the `.master-grid` `display: grid`. However, it also includes `grid-template-columns: 1fr` and `grid-template-rows: auto`, which are CSS Grid properties that have no effect when `display: flex` is active. These are dead CSS lines that add confusion about the intended layout model.

## Findings

- **Location:** `public/styles.css` lines 127-128
- **Evidence:** `.layout-home` sets `display: flex` (line 130), making `grid-template-columns: 1fr` (line 127) and `grid-template-rows: auto` (line 128) no-ops. These properties only apply when `display: grid` or `display: inline-grid` is used.
- **Risk:** Low functional risk (the layout works correctly), but it misleads developers reading the code into thinking the grid properties contribute to the layout.

## Proposed Solutions

### Option A: Remove dead grid properties
- **Description:** Delete `grid-template-columns: 1fr` and `grid-template-rows: auto` from `.layout-home` since they are unused with `display: flex`.
- **Pros:** Cleaner CSS; no misleading properties; reduces cognitive load.
- **Cons:** None -- these are truly dead lines.
- **Effort:** Small
- **Risk:** None

### Option B: Add a comment explaining they exist to override `.master-grid`
- **Description:** Keep the properties but add a comment noting they are present to explicitly reset the grid definitions from `.master-grid`, even though they have no visual effect with `display: flex`.
- **Pros:** Documents intent for future developers who might switch back to grid.
- **Cons:** Keeping dead code with a comment is technically worse than removing it.
- **Effort:** Small
- **Risk:** None

## Recommended Action

_To be determined during triage._

## Technical Details

- **Affected files:** `public/styles.css`
- **Components:** `.layout-home` class
- **Database changes:** None

## Acceptance Criteria

- [ ] Dead grid properties removed or documented
- [ ] Homepage layout renders identically before and after change
- [ ] No visual regression on infographic pages

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-03 | Created | Code review finding from PR #12 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/12
- MDN: CSS `display: flex` does not use `grid-template-*` properties
