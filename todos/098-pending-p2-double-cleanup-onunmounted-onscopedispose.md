---
status: pending
priority: p2
issue_id: "098"
tags: [code-review, architecture, vue]
dependencies: []
---

# Double Cleanup: onUnmounted + onScopeDispose Both Fire

## Problem Statement

`cleanup()` is registered with both `onUnmounted` and `onScopeDispose` (lines 542-543). When a component unmounts, Vue disposes its effect scope, so both hooks fire and `cleanup()` runs twice. While the current implementation is mostly idempotent (removeEventListener is a no-op for already-removed listeners), the pattern is fragile: any future non-idempotent logic added to `cleanup()` would silently double-execute.

**Why it matters:** Double cleanup is a latent bug pattern. It also sends a misleading signal to future contributors that both hooks are independently necessary.

## Findings

- **Source:** `composables/useShipSimulation.ts` lines 542-543
- **Evidence:** `onUnmounted(cleanup)` and `onScopeDispose(cleanup)` registered back-to-back.
- **Pattern reference:** The existing `useParticleSystem.ts` uses only `onUnmounted` for cleanup (no `onScopeDispose`).

## Proposed Solutions

### Option A: Use only `onScopeDispose` with a guard
- Remove `onUnmounted(cleanup)`, keep only `onScopeDispose(cleanup)`. `onScopeDispose` fires in both scenarios (component unmount and standalone effect scope disposal).
- **Pros:** Single registration, covers all cases
- **Cons:** Slightly less obvious for developers unfamiliar with Vue scope lifecycle
- **Effort:** Trivial
- **Risk:** None

### Option B: Add an idempotency guard to cleanup
- Add `let cleaned = false` flag; early-return if already cleaned.
- **Pros:** Belt-and-suspenders safety
- **Cons:** Extra state variable
- **Effort:** Trivial
- **Risk:** None

## Recommended Action

_Pending triage._

## Technical Details

- **Affected files:** `composables/useShipSimulation.ts`
- **Components:** Lifecycle management

## Acceptance Criteria

- [ ] `cleanup()` executes exactly once regardless of disposal path
- [ ] No regression in component unmount or scope disposal scenarios

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-07 | Created | PR #24 code review finding |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/24
- File: `composables/useShipSimulation.ts` lines 542-543
- Vue docs: https://vuejs.org/api/reactivity-advanced.html#onscopedispose
