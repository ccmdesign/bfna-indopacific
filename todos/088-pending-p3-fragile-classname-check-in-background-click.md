---
status: resolved
priority: p3
issue_id: "088"
tags: [code-review, quality, maintainability, BF-96]
dependencies: []
---

# Fragile Class-Name Check in onBackgroundClick

## Problem Statement

`StraitMap.vue` line 295 checks `el.classList.contains('map-bg')` and `el.classList.contains('map-inner')` to determine if a click was on the background. With Vue scoped CSS, these class names get data-attribute suffixes at runtime. The check works because `classList.contains` matches the original class name even with scoped attributes, but the pattern is fragile and non-obvious.

A safer approach would use `data-*` attributes or ref comparisons.

## Findings

- **Agent:** quality-reviewer
- **Evidence:** `components/StraitMap.vue` lines 293-298

## Proposed Solutions

### Option 1: Use data attributes
Add `data-map-bg` to the background elements and check `el.hasAttribute('data-map-bg')`.

- **Pros:** Explicit, independent of CSS scoping
- **Cons:** Minor template change
- **Effort:** Small
- **Risk:** Low

### Option 2: Use template refs
Add refs to the background elements and compare against `event.target`.

- **Pros:** Type-safe, no string matching
- **Cons:** More refs to manage
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `components/StraitMap.vue`

## Acceptance Criteria

- [ ] Background click detection does not rely on CSS class name strings

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Identified during PR #22 code review | Avoid class-name checks with scoped CSS |
| 2026-03-07 | Resolved (Option 1): added `data-map-bg` attributes and switched to `el.hasAttribute('data-map-bg')` | Independent of CSS scoping |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/22
