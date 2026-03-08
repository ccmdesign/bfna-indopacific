---
status: resolved
priority: p3
issue_id: "BF-101"
tags: [code-review, quality, correctness]
dependencies: []
---

# D3 join exit selection not handled explicitly

## Problem Statement

The D3 `join()` call in `StraitCircle.vue` (line 47) only provides `enter` and `update` callbacks. The `exit` selection uses D3's default behavior (remove elements). While this works correctly, explicitly handling exit makes the behavior self-documenting and allows for future exit animations or debugging.

## Findings

- `StraitCircle.vue:47-57` — `.join(enter, update)` without explicit `exit` callback
- D3's default exit behavior is `.remove()`, which is correct for this use case
- The `v-if="showShips"` on the parent SVG also provides a hard cleanup path when the strait is deselected

## Proposed Solutions

### Option 1: Add explicit exit callback

**Approach:** Add `exit => exit.remove()` as the third argument to `.join()`.

**Pros:**
- Self-documenting code
- Easy to add exit animations later

**Cons:**
- Marginally more code

**Effort:** 2 minutes

**Risk:** Low

## Recommended Action

*To be filled during triage.*

## Technical Details

**Affected files:**
- `components/straits/StraitCircle.vue:47-57` — D3 join call

## Resources

- **PR:** #25

## Acceptance Criteria

- [ ] Exit selection handled explicitly in D3 join

## Work Log

### 2026-03-08 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Noted implicit exit behavior in D3 join pattern
