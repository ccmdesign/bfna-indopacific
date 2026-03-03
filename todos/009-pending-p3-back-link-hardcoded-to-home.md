---
status: pending
priority: p3
issue_id: "009"
tags: [code-review, architecture, navigation, future-proofing]
dependencies: []
---

# Back-link NuxtLink hardcoded to "/" limits future navigation depth

## Problem Statement

The back-link in `layouts/default.vue` always navigates to `/` via `<NuxtLink to="/">Back to home</NuxtLink>`. For a flat site structure (home + sibling pages), this is correct. However, if the site later introduces nested routes (e.g. `/region/china`), the back link should point to the parent level rather than always the root.

**Why it matters:** This is a minor forward-looking concern. The current site structure only has a homepage and sibling infographic pages, making `/` the correct target. If deeper nesting is introduced, this hardcoded value would need to change.

## Findings

- **Location:** `layouts/default.vue`, line 14 (`<NuxtLink to="/">Back to home</NuxtLink>`)
- **Evidence:** The `to` prop is hardcoded to `/`. There is no mechanism for pages to override the back-link target via `definePageMeta`.
- **Agent:** architecture-strategist
- **Impact:** None currently. Potential limitation for nested route structures.

## Proposed Solutions

### Option 1: Allow pages to override back-link target via `definePageMeta`
- **Pros:** Flexible, pages control their own navigation
- **Cons:** Adds complexity to the meta contract
- **Effort:** Small (add `backLinkTarget` to meta, default to `/`)
- **Risk:** None

### Option 2: Use `router.back()` instead of hardcoded link
- **Pros:** Always goes to the previous page in history
- **Cons:** Unpredictable if user navigated directly to the page (no history), breaks `<NuxtLink>` prefetching
- **Effort:** Small
- **Risk:** Medium -- poor UX for direct navigation

### Option 3: Address when nested routes are actually added
- **Pros:** No premature abstraction
- **Cons:** Must remember to revisit
- **Effort:** None now
- **Risk:** Could be forgotten

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `layouts/default.vue`
- **Components:** Back-link navigation
- **Database changes:** None

## Acceptance Criteria

- [ ] Back-link navigates correctly for current site structure
- [ ] If enhanced: pages can optionally override back-link target

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #6 code review | Hardcoded navigation targets should be revisited when route hierarchy deepens |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/6
- File: `layouts/default.vue` line 14
