---
status: resolved
priority: p2
issue_id: "060"
tags: [code-review, quality, svg, accessibility]
dependencies: []
---

# SVG Filter IDs Not Scoped with useId() -- Multi-Instance Collision Risk

## Problem Statement

In `StraitMap.vue`, the SVG filter IDs `glow-shared` and `label-shadow` are hardcoded strings, while the component already uses `useId()` to scope `titleId` and `descId`. If two instances of `StraitMap` are ever rendered on the same page (e.g., embed previews, comparison views), the duplicate SVG filter IDs will cause browsers to resolve `url(#glow-shared)` to the first DOM occurrence, breaking the glow and label shadow on the second instance.

**Why it matters:** The component already demonstrates awareness of this pattern by scoping `titleId` and `descId` with `useId()`. The filter IDs are an inconsistency that will silently break if the component is reused.

## Findings

- **Location:** `components/StraitMap.vue`, lines 239 and 245 (hardcoded `id="glow-shared"` and `id="label-shadow"`)
- **Evidence:** Lines 12-14 use `useId()` for `titleId` and `descId`, but lines 239 and 245 use plain string IDs for SVG filters. Lines 283 and 318 reference these IDs via `filter="url(#glow-shared)"` and `filter="url(#label-shadow)"`.
- **Agent:** architecture-reviewer, quality-reviewer
- **Impact:** Silent visual breakage if component is multi-instanced. Currently single-instance, but the inconsistency is a maintenance trap.

## Proposed Solutions

### Option 1: Scope filter IDs with the existing `uid`
- **Description:** Change to `const glowFilterId = \`glow-shared-\${uid}\`` and `const labelShadowId = \`label-shadow-\${uid}\``, then use `:id="glowFilterId"` and `:filter="\`url(#\${glowFilterId})\`"` in the template.
- **Pros:** Consistent with existing `titleId`/`descId` pattern; zero risk of collision
- **Cons:** Slightly more verbose template bindings
- **Effort:** Small (10 min)
- **Risk:** None

### Option 2: Accept as-is with a code comment
- **Description:** Add a comment noting the IDs are intentionally unscoped because the component is single-instance.
- **Pros:** No code change
- **Cons:** Inconsistent with existing `useId()` usage; future-proofing gap
- **Effort:** Trivial
- **Risk:** Low (but defers the problem)

## Recommended Action

Option 1 -- scope filter IDs with `uid` for consistency and safety.

## Technical Details

- **Affected files:** `components/StraitMap.vue`
- **Affected lines:** 239, 245, 283, 318

## Acceptance Criteria

- [ ] SVG filter IDs include the `uid` suffix (e.g., `glow-shared-v-0`)
- [ ] All `filter="url(#...)"` references updated to match
- [ ] Visual rendering unchanged (glow and label shadow still work)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #19 code review | Identified inconsistency between useId() usage for title/desc vs hardcoded filter IDs |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/19
- SVG ID scoping: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/id
