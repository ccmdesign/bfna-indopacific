---
status: pending
priority: p2
issue_id: "048"
tags: [code-review, accessibility, animation, BF-77]
dependencies: []
---

# Reduced-motion close path leaves stale GSAP timeline

## Problem Statement

In `useStraitTransition.ts`, the `close()` function has a reduced-motion branch (lines 152-166) that instantly resets element styles and calls `onReverseComplete`. However, it does **not** call `ctx?.revert()` or `kill()`, leaving the GSAP context and timeline from the `open()` call still alive. On the next `open()` call, `ctx?.revert()` is called (line 65), but in between, the stale timeline holds references to DOM elements that may have been unmounted (the lens is removed via `v-if` after `onReverseComplete` sets `selectedStrait` to null).

This can cause GSAP warnings or silent failures on subsequent open/close cycles when reduced motion is enabled.

## Findings

- **Source:** `composables/useStraitTransition.ts:148-166` (close function) and lines 64-65 (open function cleanup)
- **Agent:** architecture-strategist
- **Evidence:** The reduced-motion branch in `open()` (line 78-86) sets properties but does not create a timeline. The `close()` reduced-motion branch does not clean up the context created during `open()`. If open was called with motion enabled, then user toggles reduced motion, then closes - the timeline from the motion-enabled open persists.

## Proposed Solutions

### Option A: Call kill() at the end of the reduced-motion close branch
- **Pros:** Clean, simple, ensures no stale state
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

```ts
if (reducedMotion) {
  // ... existing instant reset ...
  kill()  // <-- add this
  callbacks?.onReverseComplete?.()
  return
}
```

### Option B: Always revert context in close before checking timeline
- **Pros:** Handles all edge cases
- **Cons:** May be overly aggressive
- **Effort:** Small
- **Risk:** Low

## Recommended Action

*(To be filled during triage)*

## Technical Details

- **Affected files:** `composables/useStraitTransition.ts`
- **Affected components:** useStraitTransition composable

## Acceptance Criteria

- [ ] Toggling reduced motion mid-session does not leave stale GSAP state
- [ ] Repeated open/close cycles with reduced motion produce no GSAP warnings
- [ ] `kill()` or equivalent cleanup runs in the reduced-motion close path

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #16 review | GSAP context cleanup must happen in all code paths |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/16
- GSAP Context docs: https://gsap.com/docs/v3/GSAP/gsap.context()
