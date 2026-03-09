---
status: resolved
priority: p2
issue_id: "BF-93"
tags: [code-review, architecture, quality]
dependencies: []
---

# playReverse uses document.querySelector for fragile DOM coupling

## Problem Statement

In `playReverse()` (line 242 of `useStraitTransition.ts`), the hero circle is located via `document.querySelector('.strait-mobile-detail__hero-circle')`. This is fragile because: (1) the CSS class name is a scoped implementation detail of `StraitMobileDetail.vue` that could change, (2) if multiple instances exist in the DOM (unlikely but possible during transition), the wrong element is selected, and (3) it breaks the composable's encapsulation by coupling it to a specific component's class names.

## Findings

- `composables/useStraitTransition.ts:242` - `document.querySelector('.strait-mobile-detail__hero-circle')`
- The class `.strait-mobile-detail__hero-circle` is defined in `StraitMobileDetail.vue` (scoped CSS)
- However, the scoped CSS class generates a unique attribute selector, so `document.querySelector` actually targets the unscoped class name
- The `playForward` method correctly receives the element as a parameter, but `playReverse` does not

## Proposed Solutions

### Option 1: Store the hero element reference during playForward

**Approach:** Save the `heroCircleEl` parameter from `playForward` in a module-level variable, then use it in `playReverse` instead of querying the DOM.

**Pros:**
- Eliminates DOM query
- Consistent with how playForward receives its target
- No class name coupling

**Cons:**
- Must null-check the stored reference (element could be unmounted)

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

(To be filled during triage.)

## Technical Details

**Affected files:**
- `composables/useStraitTransition.ts:242` - querySelector call
- `composables/useStraitTransition.ts:133` - playForward already receives the element

## Resources

- **PR:** #30

## Acceptance Criteria

- [ ] playReverse does not use document.querySelector
- [ ] Reverse animation still targets the correct element
- [ ] No regression if hero element is unmounted before reverse plays

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Claude Code (PR Review)

**Actions:**
- Identified asymmetry between playForward (receives element) and playReverse (queries DOM)
- Noted fragile class name coupling
