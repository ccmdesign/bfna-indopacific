---
status: pending
priority: p3
issue_id: "BF-93"
tags: [code-review, quality]
dependencies: []
---

# Magic number 100ms delay in playReverse not derived from CSS constant

## Problem Statement

In `useStraitTransition.ts` line 239, `playReverse` uses `await new Promise(resolve => setTimeout(resolve, 100))` with a comment "Brief delay for content to fade out (100ms, driven by CSS)". The CSS `strait-transition-content--exit` uses `transition: opacity 100ms ease`. These two values are the same but not derived from a shared constant, creating a maintenance risk if one is changed without the other.

## Findings

- `composables/useStraitTransition.ts:239` - hardcoded 100ms setTimeout
- `public/styles.css` - `.strait-transition-content--exit` has `transition: opacity 100ms ease`
- The DEFAULTS object already centralizes forward/reverse durations but not this exit delay

## Proposed Solutions

### Option 1: Add EXIT_DELAY to DEFAULTS constant

**Approach:** Add `exitDelay: 100` to DEFAULTS and reference it in both places (JS uses the constant, CSS can use a comment referencing it).

**Effort:** 10 minutes

**Risk:** Low

## Recommended Action

(To be filled during triage.)

## Technical Details

**Affected files:**
- `composables/useStraitTransition.ts:17-22` - DEFAULTS object
- `composables/useStraitTransition.ts:239` - setTimeout call

## Resources

- **PR:** #30

## Acceptance Criteria

- [ ] The 100ms delay is defined in a single constant

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Claude Code (PR Review)
