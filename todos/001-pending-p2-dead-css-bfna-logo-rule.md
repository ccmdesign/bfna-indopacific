---
status: resolved
priority: p2
issue_id: "001"
tags: [code-review, quality, css]
dependencies: []
---

# Dead CSS Rule: `.bfna-logo` in pages/index.vue

## Problem Statement

The `pages/index.vue` file contains a scoped CSS rule for `.bfna-logo` (lines 33-48), but no element in the template uses the class `bfna-logo`. The footer logo image uses the class `bfna-logo-footer` instead. This dead CSS was carried over verbatim from the original `app.vue` during the migration.

**Why it matters:** Dead CSS adds unnecessary bytes to the page output and creates confusion for future developers who may assume the class is used somewhere. In a scoped SFC context, it is clearly unreachable.

## Findings

- **Location:** `/pages/index.vue`, lines 33-48 (scoped style block)
- **Evidence:** The template at line 27 uses `class="bfna-logo-footer"`, but the CSS rule targets `.bfna-logo` (without the `-footer` suffix). No element in the template or any child component uses the `.bfna-logo` class.
- **Agent:** code-simplicity-reviewer, quality-reviewer
- **Impact:** Low functional impact (dead code), but contributes to codebase confusion and ~15 lines of unnecessary CSS.

## Proposed Solutions

### Option 1: Remove the dead `.bfna-logo` rule entirely
- **Pros:** Cleanest solution, removes dead code
- **Cons:** None -- the rule is provably unreachable in a scoped context
- **Effort:** Small (delete 16 lines)
- **Risk:** None

### Option 2: Rename `.bfna-logo` to `.bfna-logo-footer` if it was intended to apply
- **Pros:** May restore originally intended styling
- **Cons:** Requires visual verification that the footer logo should have absolute positioning (which seems unlikely given the footer's flex layout)
- **Effort:** Small
- **Risk:** Low -- could cause unexpected visual changes if the absolute positioning was not intended for the footer logo

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `pages/index.vue`
- **Components:** Page-level scoped styles
- **Database changes:** None

## Acceptance Criteria

- [ ] The `.bfna-logo` CSS rule is removed from `pages/index.vue` (or renamed if intended)
- [ ] The footer BFNA logo renders correctly after the change
- [ ] No visual regression on the page

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #4 code review | Dead CSS carried over from original app.vue migration |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/4
- File: `pages/index.vue` lines 33-48 (CSS) and line 27 (template)
