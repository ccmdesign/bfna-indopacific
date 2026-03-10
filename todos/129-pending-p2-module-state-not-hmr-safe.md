---
status: pending
priority: p2
issue_id: "129"
tags: [code-review, quality, developer-experience]
dependencies: []
---

# Module-Level Swipe State Not HMR-Safe

## Problem Statement

`useSwipeNavigation.ts` uses module-level mutable state (`_isSwipeNavigation`, `_slideDirection`) that persists across Hot Module Replacement (HMR) updates during development. If a developer edits this file while a swipe navigation is in progress (or right after one), the `_isSwipeNavigation` flag may be stale (`true` when it should be `false`), causing the next `StraitMobileDetail` mount to skip `history.pushState` -- breaking back-button navigation until a full page reload.

This is the same pattern flagged in existing todo `117-pending-p2-module-state-survives-hmr.md` for `useStraitTransition.ts`.

## Findings

- **File:** `composables/useSwipeNavigation.ts`, lines 8, 23
- `let _isSwipeNavigation = false` and `const _slideDirection = ref(null)` are module-level
- Vite HMR replaces the module but does not reset these values if `import.meta.hot.accept` is not handled
- Existing todo #117 documents the same issue for `useStraitTransition.ts`

## Proposed Solutions

### Option A: Add HMR reset handler
```ts
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    _isSwipeNavigation = false
    _slideDirection.value = null
  })
}
```

- **Pros:** Clean dev experience
- **Effort:** Small
- **Risk:** None

## Technical Details

- **Affected files:** `composables/useSwipeNavigation.ts`

## Acceptance Criteria

- [ ] Module-level state resets on HMR update
- [ ] Back-button navigation works correctly after editing the composable during dev

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Code review finding | PR #31, related to todo #117 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/31
- Related: `todos/117-pending-p2-module-state-survives-hmr.md`
