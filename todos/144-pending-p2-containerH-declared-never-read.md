---
status: pending
priority: p2
issue_id: "BF-111"
tags: [code-review, quality, dead-code]
dependencies: []
---

# containerH ref declared but never read in StraitMap.vue

## Problem Statement

The `containerH` ref was moved from its original location (near the ResizeObserver) to the top of the script block (near `containerW`) in this PR. While `containerW` is used in the `radiusScale` computed, `containerH` is declared and assigned in the ResizeObserver callback but never read anywhere in the component. This is dead code that may confuse future maintainers.

## Findings

- `containerH` is declared at line 30 of the diff: `const containerH = ref(0)`
- It is assigned in the ResizeObserver callback (existing code, not new)
- It is never referenced in any computed, template, or function

## Proposed Solutions

### Option 1: Remove containerH if truly unused

**Approach:** Remove the ref declaration and the assignment in the ResizeObserver.

**Effort:** 5 minutes
**Risk:** Low (verify no template bindings use it)

### Option 2: Keep for future use, add comment

**Approach:** Add `// TODO: used by upcoming lens feature` or similar.

**Effort:** 2 minutes
**Risk:** Low

## Technical Details

**Affected files:**
- `components/StraitMap.vue`

## Resources

- **PR:** #35

## Acceptance Criteria

- [ ] `containerH` is either used or removed

## Work Log

### 2026-03-12 - Code Review Discovery

**By:** Claude Code (ce-review)
