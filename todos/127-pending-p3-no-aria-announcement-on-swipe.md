---
status: pending
priority: p3
issue_id: "127"
tags: [code-review, accessibility]
dependencies: []
---

# No ARIA Live Region Announcement on Swipe Navigation

## Problem Statement

When a user swipes to navigate between strait detail pages, screen reader users receive no announcement of the navigation. The page content changes but there is no `aria-live` region or route announcement to indicate which strait is now displayed. This makes the swipe feature invisible to assistive technology users.

## Findings

- **Files:** `composables/useSwipeNavigation.ts`, `components/straits/StraitMobileDetail.vue`
- The swipe triggers `navigateTo({ replace: true })` which performs a client-side route change
- Nuxt does announce route changes via its built-in `<NuxtRouteAnnouncer>`, but since `replace: true` is used, the announcement behavior may vary
- No explicit `aria-live="polite"` region exists to announce "Now viewing: Strait of Malacca"

## Proposed Solutions

### Option A: Add an aria-live region that announces the strait name
Add a visually-hidden `aria-live="polite"` element that updates with the strait name on navigation.

- **Pros:** Reliable, framework-independent
- **Effort:** Small
- **Risk:** None

### Option B: Verify Nuxt route announcer handles replace navigations
Test whether `<NuxtRouteAnnouncer>` fires for `navigateTo({ replace: true })` and rely on it if so.

- **Pros:** No extra code
- **Effort:** Small (testing only)
- **Risk:** Low -- may not work for replace navigations

## Technical Details

- **Affected files:** `components/straits/StraitMobileDetail.vue` or `pages/infographics/straits/[[id]].vue`

## Acceptance Criteria

- [ ] Screen reader announces the new strait name after swipe navigation
- [ ] Announcement uses `aria-live="polite"` (not "assertive")

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Code review finding | PR #31 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/31
