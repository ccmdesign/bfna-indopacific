---
status: resolved
priority: p3
issue_id: "BF-91"
tags: [code-review, quality, vue]
dependencies: []
---

# Redundant getCurrentScope() guard inside onMounted

## Problem Statement

The `getCurrentScope()` check on line 43 is redundant because `onMounted` always executes within the component's setup scope. `getCurrentScope()` will always return a truthy value in this context. The guard adds unnecessary complexity without providing any safety.

## Findings

- `StraitMobileDetail.vue:43` - `if (getCurrentScope())` wraps `onScopeDispose`
- Vue's `onMounted` lifecycle hook always runs within the component's effect scope
- `onScopeDispose` would work correctly without the guard
- The import of `getCurrentScope` on line 2 could also be removed

## Proposed Solutions

### Option 1: Remove the guard

**Approach:** Call `onScopeDispose` directly without the `getCurrentScope()` check.

**Pros:**
- Simpler, less misleading code
- Removes unused import

**Cons:**
- Minor cosmetic change

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `components/straits/StraitMobileDetail.vue:2,43`

## Resources

- **PR:** #28

## Acceptance Criteria

- [ ] `getCurrentScope` import removed
- [ ] `onScopeDispose` called directly inside `onMounted`

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified redundant scope guard inside onMounted callback
