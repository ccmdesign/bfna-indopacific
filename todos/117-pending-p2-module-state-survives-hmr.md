---
status: resolved
priority: p2
issue_id: "BF-93"
tags: [code-review, architecture, dx]
dependencies: []
---

# Module-level singleton state survives HMR causing stale transitions

## Problem Statement

`useStraitTransition.ts` stores shared state at module level (lines 27-36): `state`, `cardRect`, `storedScrollY`, `currentAnimation`, `cloneEl`, `capturedStraitId`, `reducedMotion`, `orientationChanged`, `listenersInitialized`. During Vite hot-module replacement, the module re-executes but the old event listeners on `matchMedia` persist, `listenersInitialized` resets to `false` (adding duplicate listeners), and stale animation state from a previous module version can cause the transition to get stuck in a non-idle state.

## Findings

- Module-level `let` variables (lines 31-36) are re-initialized on HMR, but old `matchMedia` listeners remain
- `listenersInitialized` resets to `false`, so each HMR cycle adds another pair of `matchMedia` listeners
- `state` ref is re-created, but any component holding a reference to the old ref won't see updates
- This is a dev-only issue but can cause confusing bugs during development

## Proposed Solutions

### Option 1: Use import.meta.hot to clean up on HMR

**Approach:** Add `import.meta.hot?.dispose()` to remove old listeners and reset state on module replacement.

**Pros:**
- Standard Vite pattern for singleton modules
- Prevents listener accumulation

**Cons:**
- Adds dev-only code

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Use Nuxt's useState for shared reactive state

**Approach:** Replace module-level refs with `useState()` which persists correctly across HMR.

**Pros:**
- Framework-idiomatic
- Handles HMR automatically

**Cons:**
- Non-reactive module-level variables (`cloneEl`, `currentAnimation`) still need manual handling
- Slight overhead

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

(To be filled during triage.)

## Technical Details

**Affected files:**
- `composables/useStraitTransition.ts:27-36` - module-level state declarations
- `composables/useStraitTransition.ts:65-74` - listener initialization block

## Resources

- **PR:** #30

## Acceptance Criteria

- [ ] HMR does not accumulate duplicate matchMedia listeners
- [ ] Transition state resets cleanly after HMR
- [ ] No stale animation state after code changes during development

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Claude Code (PR Review)

**Actions:**
- Identified module-level singleton pattern with no HMR cleanup
- Traced listener registration that duplicates on each HMR cycle
