---
status: resolved
priority: p3
issue_id: "058"
tags: [code-review, vue, ux, BF-84]
dependencies: []
---

# No empty-state handling when all infographics are draft

## Problem Statement

If all entries in `data/infographics.ts` are set to `status: 'draft'`, the homepage renders an empty `<div class="infographic-cards">` grid with no cards and no user feedback. While this is an unlikely scenario in production, it represents a missing edge case.

## Findings

- **Source:** Scenario exploration of PR #17
- **Location:** `pages/index.vue:27-34` (template v-for over publishedInfographics)
- **Evidence:** No `v-if` or empty-state fallback when `publishedInfographics` is empty.

## Proposed Solutions

### Option A: Add a conditional empty-state message
```vue
<div v-if="publishedInfographics.length" class="infographic-cards" ...>
  ...
</div>
<p v-else class="empty-state">No infographics available yet.</p>
```

- **Pros:** Better UX for edge case
- **Cons:** Extra template code for unlikely scenario
- **Effort:** Small
- **Risk:** None

### Option B: Accept as-is (YAGNI)
With only 2 items and one always published, this is not a real risk.

- **Effort:** None
- **Risk:** None

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected files:** `pages/index.vue`

## Acceptance Criteria

- [ ] Homepage displays a meaningful message when no published infographics exist

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #17 code review | Edge case: empty filtered array with no UI fallback |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/17
