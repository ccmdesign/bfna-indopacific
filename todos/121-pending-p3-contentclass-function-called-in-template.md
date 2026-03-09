---
status: resolved
priority: p3
issue_id: "BF-93"
tags: [code-review, performance, quality]
dependencies: []
---

# contentClass is a function re-evaluated every render instead of computed

## Problem Statement

In `StraitMobileDetail.vue` (line 25-34), `contentClass` is defined as a plain function that is called directly in the template (e.g., `:class="contentClass(0)"`). This function is re-evaluated on every render cycle for each call site. Since it depends on reactive `transitionState`, it could be replaced with a computed property (or a set of computed properties) to benefit from Vue's caching.

## Findings

- `components/straits/StraitMobileDetail.vue:25-34` - `contentClass` is a plain function
- Called 7 times in the template with different delay values (0-4)
- Each call re-evaluates `transitionState.value` checks
- Minor performance impact but not idiomatic Vue

## Proposed Solutions

### Option 1: Convert to a computed map

**Approach:** Create a single computed that returns an object/map of delay -> class arrays.

**Pros:**
- Cached by Vue's reactivity system
- Single evaluation per state change

**Cons:**
- Slightly different API in template

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

(To be filled during triage.)

## Technical Details

**Affected files:**
- `components/straits/StraitMobileDetail.vue:25-34`

## Resources

- **PR:** #30

## Acceptance Criteria

- [ ] contentClass is computed/cached rather than re-evaluated per render
- [ ] No visual regression in staggered fade-in

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Claude Code (PR Review)
