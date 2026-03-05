---
status: resolved
priority: p2
issue_id: "039"
tags: [code-review, quality, ux]
dependencies: []
---

# Duplicate "Back to home" Link on Test Page

## Problem Statement

The test page at `pages/test/embeds.vue` renders its own "Back to home" NuxtLink inside the header (line 43), but the `default` layout already renders a back-link nav for every route that is not `/` (see `layouts/default.vue` line 21: `showBackLink` defaults to true when `route.path !== '/'`). This results in two "Back to home" links visible on the page simultaneously -- one from the layout (top-left absolute positioned) and one from the page header (centered).

**Why it matters:** Duplicate navigation links create a confusing UX and fail accessibility heuristics (redundant interactive elements). It signals the page was not tested visually with the layout.

## Findings

- `layouts/default.vue` line 21: `const showBackLink = computed(() => route.meta.showBackLink !== false && route.path !== '/')`
- `pages/test/embeds.vue` line 43: `<NuxtLink to="/" class="back-link">&larr; Back to home</NuxtLink>`
- The page does not set `showBackLink: false` in `definePageMeta`, so the layout back-link is active.

## Proposed Solutions

### Option A: Remove the page-level back link (Recommended)
Remove the `<NuxtLink>` from the test page header and rely on the layout's built-in back-link navigation.

- **Pros:** Zero duplication; consistent with all other pages
- **Cons:** None
- **Effort:** Small
- **Risk:** None

### Option B: Hide the layout back link via page meta
Add `showBackLink: false` to `definePageMeta` and keep the page's custom link.

- **Pros:** Allows custom placement/styling of the back link
- **Cons:** Deviates from the pattern used by other pages
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A -- remove the `<NuxtLink>` from the page header.

## Technical Details

**Affected files:**
- `pages/test/embeds.vue` (line 43)

## Acceptance Criteria

- [ ] Only one "Back to home" link is visible on `/test/embeds`
- [ ] Navigation back to home works correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during code review of PR #15 | Layout already provides back-link for non-root routes |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/15
- Layout back-link logic: `layouts/default.vue:21`
