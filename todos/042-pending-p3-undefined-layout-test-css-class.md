---
status: resolved
priority: p3
issue_id: "042"
tags: [code-review, quality, css]
dependencies: ["041"]
---

# Undefined layout-test CSS Class

## Problem Statement

The test page sets `layoutClass: 'layout-test'` in `definePageMeta` (line 9), which gets applied to the `.page-wrapper` div in the default layout. However, no `.layout-test` CSS class is defined anywhere in the codebase. The class is applied to the DOM but has no visual effect.

**Why it matters:** This is a dead reference. It suggests the developer intended to add layout overrides for the test page but did not follow through. This is related to finding #041 (layout scrolling), where defining this class could solve the overflow issue.

## Findings

- `pages/test/embeds.vue` line 9: `layoutClass: 'layout-test'`
- `layouts/default.vue` line 30: `:class="layoutClass"` applies it to `.page-wrapper`
- No `.layout-test` CSS rule exists in any stylesheet

## Proposed Solutions

### Option A: Define .layout-test with scrolling overrides
Add a `.layout-test` rule (in default.vue or global styles) that enables vertical scrolling and removes the 100vh constraint.

- **Pros:** Fixes the undefined class and the scrolling issue simultaneously
- **Cons:** None
- **Effort:** Small
- **Risk:** None

### Option B: Remove the layoutClass meta if unused
If no layout overrides are needed, remove the `layoutClass: 'layout-test'` from the page meta.

- **Pros:** Cleaner code
- **Cons:** Loses the hook for future layout customization
- **Effort:** Small
- **Risk:** None

## Recommended Action

Option A -- define the class with scrolling overrides (combines with finding #041).

## Technical Details

**Affected files:**
- `pages/test/embeds.vue` (line 9)
- `layouts/default.vue` or `assets/styles.css` (new CSS rule)

## Acceptance Criteria

- [ ] `.layout-test` class is either defined with appropriate styles or removed from page meta

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during code review of PR #15 | layoutClass is applied but never defined |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/15
