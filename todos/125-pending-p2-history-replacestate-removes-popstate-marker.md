---
status: pending
priority: p2
issue_id: "125"
tags: [code-review, architecture, navigation]
dependencies: []
---

# history.replaceState Removes Popstate Marker Before Navigate

## Problem Statement

In `StraitMobileDetail.vue` line 60, the swipe handler calls `history.replaceState(null, '')` to remove the dummy history entry's `straitTransition` marker before navigating. However, this also clears the state object entirely, which means if the `navigateTo({ replace: true })` call is async and a `popstate` event fires between `replaceState` and `navigateTo`, the `handlePopstate` listener (line 107-113) will NOT match `e.state?.straitTransition !== undefined` and will silently fail to handle back navigation.

This is a narrow race window but could cause the back button to stop working on slow devices.

## Findings

- **File:** `components/straits/StraitMobileDetail.vue`, lines 59-62
- `history.replaceState(null, '')` clears the state marker
- The `handlePopstate` check on line 108 relies on `e.state?.straitTransition !== undefined`
- If `popstate` fires between `replaceState` and the completion of `navigateTo`, the back-button handler becomes inert
- On swipe re-mount, `isSwipeNavigation()` correctly skips the new `pushState`, so the new component also has no dummy entry -- back button works via normal browser history

## Proposed Solutions

### Option A: Use `history.go(-1)` instead of replaceState
Pop the dummy entry before navigating, then use `navigateTo({ replace: true })` on the actual route entry.

- **Pros:** Cleanly removes the dummy entry without clearing state
- **Effort:** Small
- **Risk:** Medium -- `history.go(-1)` is async and triggers `popstate`, which the existing listener would catch and trigger `playReverse`. Would need to set a guard flag.

### Option B: Keep replaceState but preserve a non-conflicting state
Use `history.replaceState({ swipeNavigating: true }, '')` so the state is not null but does not match the `straitTransition` check.

- **Pros:** Minimal change, preserves state
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option B -- minimal and avoids the async complexity of Option A.

## Technical Details

- **Affected files:** `components/straits/StraitMobileDetail.vue`

## Acceptance Criteria

- [ ] Back button works correctly after swiping through multiple straits
- [ ] No race condition between replaceState and navigateTo
- [ ] History stack has exactly [list, current-strait, dummy] after any swipe sequence

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Code review finding | PR #31 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/31
