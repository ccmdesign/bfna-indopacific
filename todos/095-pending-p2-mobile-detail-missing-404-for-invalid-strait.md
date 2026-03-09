---
status: pending
priority: p2
issue_id: "095"
tags: [code-review, quality, ux, BF-89]
dependencies: []
---

# Mobile Detail Page Shows Nothing for Invalid Strait ID

## Problem Statement

On mobile, when a user navigates to `/infographics/straits/invalid-id`, the page validates the ID via `VALID_IDS` and sets `straitId` to `null`. The template then falls through: `!isMobile` is false, `!straitId` is true, so `<StraitCardList>` renders. This is acceptable behavior (redirect to list), but inconsistent with the desktop path which also silently deselects.

More critically, if `straitId` is valid but `selectedStrait` is somehow `undefined` (data loading issue), all three `v-if`/`v-else-if` conditions fail and the page renders nothing — no error message, no fallback.

## Findings

- **Agent:** quality-reviewer
- **Evidence:** `pages/infographics/straits/[[id]].vue` template — no catch-all `v-else` branch after the three conditions

## Proposed Solutions

### Option 1: Add v-else fallback
Add a `<div v-else>` with a "Strait not found" message or redirect to the list.

- **Pros:** Handles edge case gracefully
- **Cons:** Minor template addition
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `pages/infographics/straits/[[id]].vue`

## Acceptance Criteria

- [ ] Invalid strait ID on mobile shows card list or error message
- [ ] No blank page possible in any viewport/route combination

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
