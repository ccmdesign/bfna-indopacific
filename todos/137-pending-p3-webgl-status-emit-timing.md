---
status: resolved
priority: p3
issue_id: "137"
tags: [code-review, quality, vue]
dependencies: []
---

# FisheyeLens webgl-status emit may fire before parent listener is attached

## Problem Statement

`FisheyeLens.vue` emits `webgl-status` in two places: (1) in a `watch(webglAvailable, ...)` and (2) in `onMounted` as a sync check. The `onMounted` emit fires during the component's own mount lifecycle. In Vue 3, child components mount before parents, so the parent's `@webgl-status` listener should be attached by template binding time. However, the `webglAvailable` ref is set inside `useFisheyeCanvas`'s own `onMounted`, which runs in the same tick. The order is: child `onMounted` (useFisheyeCanvas sets `webglAvailable = true`) then child component's `onMounted` (checks and emits). This works, but relies on composable `onMounted` hooks running before component `onMounted` hooks in registration order.

**Why it matters:** This is fragile — if the composable's `onMounted` is ever reordered or made async, the sync emit would fire with stale `false` value. The watcher would eventually catch up, but there's a flash where `webglReady` is false in the parent.

## Findings

- **Location:** `components/straits/FisheyeLens.vue` lines 38-42
- **Evidence:** The `onMounted` block at line 39 checks `webglAvailable.value` which was set in the composable's `onMounted`. Vue 3 runs `onMounted` hooks in registration order (FIFO), so composable hooks registered first run first.
- **Agent:** quality-reviewer

## Proposed Solutions

### Option A: Remove the onMounted emit, rely on watcher only
The `watch` on `webglAvailable` handles all cases including sync resolution. Remove the `onMounted` emit.

- **Pros:** Simpler, no timing dependency
- **Cons:** `watch` with default options doesn't fire on initial value; would need `{ immediate: true }`
- **Effort:** Small
- **Risk:** Low

### Option B: Use watchEffect instead
`watchEffect` runs immediately and tracks `webglAvailable` reactively.

- **Pros:** Single reactive source of truth
- **Cons:** Fires on every change (minor — boolean only toggles once)
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_To be decided during triage._

## Technical Details

- **Affected files:** `components/straits/FisheyeLens.vue`

## Acceptance Criteria

- [ ] webgl-status emits reliably regardless of lifecycle ordering
- [ ] No flash of incorrect fallback image

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-10 | Created | Code review finding from PR #33 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/33
