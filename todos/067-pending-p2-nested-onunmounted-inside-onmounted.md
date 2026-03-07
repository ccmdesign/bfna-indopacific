---
status: resolved
priority: p2
issue_id: "067"
tags: [code-review, quality, vue]
dependencies: []
---

# Nested onUnmounted Inside onMounted Is Non-Standard Vue Pattern

## Problem Statement

In `StraitCircle.vue`, `onUnmounted` is called inside the `onMounted` callback. While Vue technically supports this (it registers the hook on the current component instance), it is an unconventional pattern that can confuse maintainers and may behave unexpectedly if the component is unmounted before `onMounted` fires (SSR edge case). The standard pattern is to call `onUnmounted` at the top level of `<script setup>`.

## Findings

- **Source:** `components/straits/StraitCircle.vue`, lines 15-23
- **Evidence:**
  ```typescript
  onMounted(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    // ...
    mql.addEventListener('change', handler)
    onUnmounted(() => mql.removeEventListener('change', handler))
  })
  ```
- The `handler` variable is scoped to `onMounted`, making it unavailable at top-level for cleanup. The fix is to hoist the reference.

## Proposed Solutions

### Option A: Hoist handler and use top-level onUnmounted
- **Pros:** Standard Vue lifecycle pattern; easier to understand
- **Cons:** Minor refactor; handler ref is null until mounted
- **Effort:** Small
- **Risk:** Low

### Option B: Keep as-is with a code comment
- **Pros:** No code change
- **Cons:** Pattern remains non-standard; may confuse future maintainers
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

- **Affected files:** `components/straits/StraitCircle.vue`

## Acceptance Criteria

- [ ] `onUnmounted` is at top level of `<script setup>` or documented if nested
- [ ] MediaQueryList listener is properly cleaned up on unmount

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Identified during PR #20 code review | Vue allows nested lifecycle hooks but it is non-standard |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/20
