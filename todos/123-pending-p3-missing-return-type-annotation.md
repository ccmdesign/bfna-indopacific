---
status: pending
priority: p3
issue_id: "BF-93"
tags: [code-review, quality, typescript]
dependencies: []
---

# useStraitTransition missing explicit return type annotation

## Problem Statement

The `useStraitTransition` function in `composables/useStraitTransition.ts` has no explicit return type annotation. While TypeScript infers the type, an explicit return type would serve as documentation and catch accidental API changes.

## Findings

- `composables/useStraitTransition.ts:49` - function signature has no return type
- The function has two return paths (SSR stub on line 52-59, main return on line 302-309) which should conform to the same interface

## Proposed Solutions

### Option 1: Add explicit return type interface

**Approach:** Define a `UseStraitTransitionReturn` interface and annotate the function return type.

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

(To be filled during triage.)

## Technical Details

**Affected files:**
- `composables/useStraitTransition.ts:49` - function signature

## Resources

- **PR:** #30

## Acceptance Criteria

- [ ] Function has explicit return type annotation
- [ ] Both return paths (SSR and client) conform to the same type

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Claude Code (PR Review)
