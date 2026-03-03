---
status: resolved
priority: p3
issue_id: "014"
tags: [code-review, quality, nuxt, BF-71]
dependencies: []
---

# Redundant showBackLink: false in pages/index.vue

## Problem Statement

`pages/index.vue` sets `showBackLink: false` in `definePageMeta`, but the `layouts/default.vue` layout already computes `showBackLink` to be `false` when `route.path === '/'`:

```js
const showBackLink = computed(() => route.meta.showBackLink !== false && route.path !== '/')
```

The explicit `showBackLink: false` is therefore redundant for the root route. While harmless, it adds noise to the page metadata and could confuse future developers into thinking the back link would appear without it.

**Why it matters:** Minor code clarity issue. Removing it makes the page file slightly cleaner without changing behavior.

## Findings

- **Location:** `pages/index.vue` line 6
- **Evidence:** `definePageMeta({ ..., showBackLink: false, ... })` -- but `layouts/default.vue` line 18 already returns `false` for `route.path === '/'` regardless of the meta value.
- **Agent:** code-simplicity-reviewer
- **Impact:** Low -- purely cosmetic/clarity improvement.

## Proposed Solutions

### Option 1: Remove `showBackLink: false` from pages/index.vue
- **Pros:** Cleaner code; removes redundant configuration
- **Cons:** None -- behavior is identical
- **Effort:** Trivial
- **Risk:** None

### Option 2: Keep as-is for explicitness
- **Pros:** Makes the intent clear that the home page should never show a back link
- **Cons:** Redundant with layout logic
- **Effort:** None
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `pages/index.vue`
- **Components:** Page metadata, layout logic
- **Database changes:** None

## Acceptance Criteria

- [ ] The `/` route does not show a back link (verified visually)
- [ ] No functional change in behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #8 code review | Layout already handles root route back-link suppression |
| 2026-03-03 | Resolved (Option 1): removed `showBackLink: false` from `pages/index.vue` definePageMeta | Layout computed property already returns false for route.path === '/' |

## Resources

- **PR:** https://github.com/ccmdesign/bfna-indopacific/pull/8
- **Files:** `pages/index.vue`, `layouts/default.vue`
