---
status: resolved
priority: p2
issue_id: "BF-93"
tags: [code-review, reliability, animation]
dependencies: []
---

# commitStyles() can throw on detached DOM element

## Problem Statement

In `useStraitTransition.ts`, `animation.commitStyles()` is called on line 202 (forward) and line 288 (reverse). If the clone element has been removed from the DOM before the animation finishes (e.g., due to rapid navigation or component unmount), `commitStyles()` throws a `DOMException: Failed to execute 'commitStyles' on 'Animation': Target element is not connected`. The forward path has a `.catch()` handler, but `commitStyles()` is called in the `.then()` before the catch, so the exception propagates as an unhandled rejection.

## Findings

- `composables/useStraitTransition.ts:202` - `animation.commitStyles()` in forward `.then()` callback
- `composables/useStraitTransition.ts:288` - `animation.commitStyles()` in reverse `try` block (this one is caught)
- The forward path's `.catch()` only catches the `animation.finished` rejection, not errors thrown inside `.then()`
- The reverse path wraps `commitStyles` in try/catch, so it is safe
- The forward path needs the same protection

## Proposed Solutions

### Option 1: Wrap commitStyles in try-catch in the forward .then() handler

**Approach:** Add a try-catch around `commitStyles()` and `cancel()` in the forward animation's `.then()` callback.

**Pros:**
- Minimal change, directly fixes the issue
- Consistent with the reverse path's approach

**Cons:**
- None significant

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

(To be filled during triage.)

## Technical Details

**Affected files:**
- `composables/useStraitTransition.ts:200-210` - forward animation completion handler

## Resources

- **PR:** #30

## Acceptance Criteria

- [ ] No unhandled DOMException when navigating away during forward animation
- [ ] Forward and reverse paths both handle detached elements gracefully

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Claude Code (PR Review)

**Actions:**
- Identified asymmetric error handling between forward and reverse animation paths
- Confirmed commitStyles() throws when element is disconnected from DOM
