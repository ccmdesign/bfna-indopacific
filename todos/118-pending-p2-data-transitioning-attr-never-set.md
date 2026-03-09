---
status: resolved
priority: p2
issue_id: "BF-93"
tags: [code-review, quality, css]
dependencies: []
---

# CSS selector targets data-transitioning attribute that is never set

## Problem Statement

In `public/styles.css`, the rule `.strait-circle[data-transitioning] .strait-particle-canvas { display: none; }` targets an attribute `data-transitioning` that is never set anywhere in the codebase. The particle canvas will never be hidden during transitions, which could cause visual artifacts (particles visible on/behind the floating clone).

## Findings

- `public/styles.css` (new addition): `.strait-circle[data-transitioning] .strait-particle-canvas { display: none; }` - dead CSS rule
- No JavaScript in the PR sets `data-transitioning` on any element
- No existing code in the repository sets this attribute
- The intent was likely to hide the particle canvas during the FLIP animation, but the implementation was omitted

## Proposed Solutions

### Option 1: Set data-transitioning attribute during animation

**Approach:** In `useStraitTransition.ts`, set `data-transitioning` on the source/hero `.strait-circle` element when entering `animating-forward` or `animating-back` state, and remove it when returning to `idle` or `settled`.

**Pros:**
- Completes the intended behavior
- Prevents particle artifacts during animation

**Cons:**
- Requires DOM manipulation outside the clone

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Remove the dead CSS rule

**Approach:** Delete the rule if particle hiding is not needed.

**Pros:**
- Removes dead code

**Cons:**
- Particles may be visible during transition, causing visual artifacts

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

(To be filled during triage.)

## Technical Details

**Affected files:**
- `public/styles.css` - the `.strait-circle[data-transitioning]` rule
- `composables/useStraitTransition.ts` - would need attribute management

## Resources

- **PR:** #30

## Acceptance Criteria

- [ ] Either the data-transitioning attribute is set during animation OR the dead CSS rule is removed
- [ ] No particle canvas artifacts visible during the FLIP transition

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Claude Code (PR Review)

**Actions:**
- Identified CSS selector with no matching attribute in JavaScript
- Confirmed via codebase search that data-transitioning is never set
