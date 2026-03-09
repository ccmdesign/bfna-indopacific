---
status: pending
priority: p3
issue_id: "102"
tags: [code-review, quality, memory-leak, BF-89]
dependencies: []
---

# useViewport Cleanup Depends on onScopeDispose Timing

## Problem Statement

`useViewport.ts` uses `onScopeDispose` to clean up the `matchMedia` event listener. This is correct for composables used within Vue's setup scope, but if the composable is ever called outside a component setup context (e.g., in a utility or at module level), the listener would never be cleaned up. The code is currently only called inside `[[id]].vue` setup, so this is a low-risk issue.

## Findings

- **Agent:** quality-reviewer
- **Evidence:** `composables/useViewport.ts` line 15 — `onScopeDispose(() => mql.removeEventListener(...))`

## Proposed Solutions

### Option 1: Accept current implementation
`onScopeDispose` is the standard Nuxt/Vue pattern for composable cleanup. No action needed.

- **Effort:** None

### Option 2: Add defensive check
Use `getCurrentScope()` to verify a scope exists before registering the dispose callback.

- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `composables/useViewport.ts`

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
