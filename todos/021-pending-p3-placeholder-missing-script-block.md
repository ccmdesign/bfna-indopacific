---
status: pending
priority: p3
issue_id: "021"
tags: [code-review, quality, vue, BF-72]
dependencies: []
---

# `StraitsInfographic.vue` Placeholder Missing `<script setup>` Block

## Problem Statement

The `StraitsInfographic.vue` placeholder component has only `<template>` and `<style scoped>` blocks but no `<script setup>` block. The existing `RenewablesInfographic.vue` component includes `<script setup>` with an import statement. While Vue SFCs do not require a script block, omitting it breaks the pattern established by the sibling component.

**Why it matters:** Minor consistency issue. When the real component is built, a script block will be needed for imports (gsap, d3, data). Having the block present (even empty) from the start establishes the correct SFC structure.

## Findings

- **Location:** `components/infographics/StraitsInfographic.vue` (entire file -- no `<script>` section)
- **Evidence:** Compare with `components/infographics/RenewablesInfographic.vue` which has `<script setup>` at line 1
- **Agent:** code-simplicity-reviewer
- **Impact:** Low -- purely stylistic/consistency

## Proposed Solutions

### Option 1: Add an empty `<script setup>` block
- Add `<script setup>\n</script>` before the `<template>` block.
- **Pros:** Consistent with sibling component; ready for future imports
- **Cons:** Empty block adds noise
- **Effort:** Trivial
- **Risk:** None

### Option 2: Leave as-is
- The placeholder is temporary; it will be replaced when the real component is built.
- **Pros:** No unnecessary code
- **Cons:** Minor inconsistency
- **Effort:** None
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `components/infographics/StraitsInfographic.vue`
- **Components:** Placeholder component
- **Database changes:** None

## Acceptance Criteria

- [ ] SFC block order is consistent across all infographic components
- [ ] No functional regressions

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #10 code review | Placeholder omits script block; functionally fine but inconsistent with pattern |

## Resources

- **PR:** https://github.com/ccmdesign/bfna-indopacific/pull/10
- **Files:** `components/infographics/StraitsInfographic.vue`, `components/infographics/RenewablesInfographic.vue`
