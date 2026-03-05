---
status: resolved
priority: p2
issue_id: "041"
tags: [code-review, accessibility, architecture]
dependencies: []
---

# Hardcoded SVG `id` Attributes Will Collide on Multi-Instance Pages

## Problem Statement

The SVG uses hardcoded `id="map-title"` and `id="map-desc"` for its accessible `<title>` and `<desc>` elements, referenced via `aria-labelledby="map-title map-desc"`. If `StraitMap.vue` is rendered more than once on the same page (e.g., main page and an embed preview), these IDs will collide, producing invalid HTML and breaking the `aria-labelledby` association for screen readers.

The component is already used on both `/straits` and `/embed/straits` routes, and while those are separate pages today, any future composition (e.g., a dashboard or print view) would trigger this bug.

## Findings

- **File:** `components/StraitMap.vue` lines 103, 106, 107
- `aria-labelledby="map-title map-desc"` — hardcoded
- `id="map-title"` and `id="map-desc"` — hardcoded
- Vue's `useId()` composable (Vue 3.5+) or a simple `crypto.randomUUID()` could generate unique IDs

## Proposed Solutions

### Option A: Use Vue's `useId()` to generate unique prefixes
- **Pros:** Framework-native; SSR-safe; no external dependencies
- **Cons:** Requires Vue 3.5+ (check project version)
- **Effort:** Small
- **Risk:** Low

### Option B: Use a prop-based id prefix
- **Pros:** Explicit; works with any Vue version
- **Cons:** Requires parent to pass unique IDs
- **Effort:** Small
- **Risk:** Low

## Recommended Action



## Technical Details

- **Affected files:** `components/StraitMap.vue` lines 103, 106, 107
- **Components:** StraitMap

## Acceptance Criteria

- [ ] SVG title/desc IDs are unique per component instance
- [ ] `aria-labelledby` correctly references the instance-specific IDs
- [ ] Screen reader announces the correct map title when multiple instances exist

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during PR #14 code review | Hardcoded IDs are a common accessibility anti-pattern in reusable components |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/14
