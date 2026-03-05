---
status: pending
priority: p3
issue_id: "037"
tags: [code-review, accessibility, vue]
dependencies: []
---

# Strait List Missing `aria-label` for Screen Readers

## Problem Statement

The `<ul class="strait-list">` in `StraitMap.vue` renders a list of 6 straits but has no `aria-label` or `aria-labelledby` attribute. While the `<h2>` above it provides visual context, there is no programmatic association between the heading and the list. Screen reader users navigating by landmarks or list elements will encounter an unlabeled list.

**Why it matters:** The semantic `<ul>/<li>` structure is good (better than `<div>` soup), but adding an `aria-label="Maritime chokepoints"` or `aria-labelledby` pointing to the heading would make the list fully accessible. This is a minor accessibility improvement, not a WCAG violation, since lists are not required to be labeled.

## Findings

- **Location:** `/components/StraitMap.vue`, line 14 (`<ul class="strait-list">`)
- **Evidence:** No `aria-label` or `aria-labelledby` attribute on the list. The `<h2 class="map-title">` at line 13 is visually adjacent but not programmatically associated.
- **Agent:** accessibility-reviewer
- **Impact:** Minor accessibility improvement. Not a WCAG AA failure.

## Proposed Solutions

### Option 1: Add `aria-labelledby` linking to the heading
- **Pros:** Programmatic association between heading and list; best practice
- **Cons:** Requires adding an `id` to the `<h2>`
- **Effort:** Small (add `id="strait-map-title"` to h2, add `aria-labelledby="strait-map-title"` to ul)
- **Risk:** None

### Option 2: Add `aria-label` directly
- **Pros:** Simpler, no id needed
- **Cons:** Duplicates the heading text; can drift out of sync
- **Effort:** Small (add `aria-label="Maritime chokepoints"`)
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `components/StraitMap.vue`
- **Lines:** 13-14

## Acceptance Criteria

- [ ] The strait list has an accessible name via `aria-label` or `aria-labelledby`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-04 | Identified during PR #13 code review | Lists benefit from accessible names even though not strictly required |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/13
- File: `components/StraitMap.vue`
- Reference: [WAI-ARIA List labeling](https://www.w3.org/WAI/tutorials/page-structure/labels/)
