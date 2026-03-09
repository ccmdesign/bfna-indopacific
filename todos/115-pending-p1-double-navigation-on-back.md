---
status: resolved
priority: p1
issue_id: "BF-93"
tags: [code-review, architecture, reliability]
dependencies: []
---

# Double navigation race on back button

## Problem Statement

The `StraitMobileDetail` component registers both an in-app back button (`handleBack`) and a `popstate` event listener, and both call `navigateTo('/infographics/straits')` after `playReverse()`. If the user triggers the browser back button while `playReverse` is still running from an in-app back click (or vice versa), the component can attempt double navigation. Additionally, the `popstate` handler checks `e.state?.straitTransition !== undefined`, but `straitTransition` is set to `true` -- so this check passes for both the dummy entry and any future state that happens to carry that key. The guard in `playReverse` (`state !== 'settled'`) mitigates some races, but the `handleBack` function does not check state before calling `playReverse`, and `navigateTo` is called unconditionally after the promise resolves.

## Findings

- `handleBack` (line 36-39 of StraitMobileDetail.vue): calls `playReverse()` then `navigateTo` unconditionally.
- `popstate` handler (line 77-82): also calls `playReverse()` then `navigateTo` unconditionally.
- `playReverse` returns early if state is not `settled`, but `handleBack` still calls `navigateTo` even if `playReverse` was a no-op.
- If user clicks in-app back button, `handleBack` runs. But the subsequent `navigateTo` triggers a route change, which pops the dummy history entry, firing `popstate` again. This could produce a second `navigateTo` call, pushing the user back an extra page in history.
- The dummy `history.pushState` on line 76 is never removed on unmount if the user navigates away via a different mechanism (e.g., a link).

## Proposed Solutions

### Option 1: Guard navigateTo with state check

**Approach:** After `playReverse()` resolves in both `handleBack` and `popstate`, check `state.value === 'idle'` before calling `navigateTo`. Remove the `popstate` listener in `handleBack` before navigating to prevent the double-fire.

**Pros:**
- Minimal change, directly addresses the race
- Preserves existing animation logic

**Cons:**
- Still two code paths for the same action

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Unify back navigation into a single function with a "navigating" flag

**Approach:** Create a single `navigateBack()` function with a boolean guard. Both `handleBack` and `popstate` call this function. The guard ensures only the first call proceeds.

**Pros:**
- Eliminates the race entirely
- Single source of truth for back navigation

**Cons:**
- Slightly more refactoring

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

(To be filled during triage.)

## Technical Details

**Affected files:**
- `components/straits/StraitMobileDetail.vue:36-39` - handleBack function
- `components/straits/StraitMobileDetail.vue:76-83` - popstate handler
- `composables/useStraitTransition.ts:227-300` - playReverse function

## Resources

- **PR:** #30
- **Issue:** BF-93

## Acceptance Criteria

- [ ] Clicking in-app back button does not trigger double navigation
- [ ] Browser back button does not trigger double navigation
- [ ] Rapid back-button presses do not cause errors
- [ ] Animation completes or is skipped gracefully in all cases

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Claude Code (PR Review)

**Actions:**
- Identified race condition between handleBack and popstate handler
- Traced control flow through playReverse state machine
- Confirmed both paths call navigateTo unconditionally

**Learnings:**
- History API dummy entries need careful lifecycle management
- Multiple navigation triggers for the same action is a common source of bugs

## Notes

- This is a mobile-only issue (desktop uses StraitMap, not StraitMobileDetail)
- The issue is timing-dependent and may not manifest on fast devices, but is problematic on slower mobile hardware
