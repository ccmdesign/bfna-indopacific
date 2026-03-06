---
status: pending
priority: p3
issue_id: "064"
tags: [code-review, quality, dead-code]
dependencies: ["045"]
---

# select-strait Event Still Emitted but Not Consumed by Any Page

## Problem Statement

The `select-strait` event is emitted by `StraitMap.vue` (line 199), forwarded by `StraitsInfographic.vue` (line 9), but no page-level component listens to it. The previous `StraitLens.vue` component (deleted in this PR) was the intended consumer. With the Lens feature reverted and its component removed, this event chain is now dead scaffolding.

**Why it matters:** This is existing tech debt (already tracked in todo 045) that persists through this PR. The PR correctly documents this as "intentional scaffolding" (line 193-194 comment), which is acceptable. Noting for completeness.

## Findings

- **Location:** `components/StraitMap.vue` line 196-199, `components/infographics/StraitsInfographic.vue` line 4 and 9
- **Evidence:** `grep -r "select-strait" pages/` returns no results
- **Agent:** quality-reviewer
- **Impact:** Dead code, but intentionally preserved for future Lens feature (BF-39/BF-76)

## Proposed Solutions

### Option 1: Accept as intentional scaffolding (Recommended)
- **Pros:** Ready for future Lens feature; code comment documents intent
- **Cons:** Dead code in the meantime
- **Effort:** None
- **Risk:** None

## Technical Details

- **Affected files:** `components/StraitMap.vue`, `components/infographics/StraitsInfographic.vue`
- **Related todos:** 045-pending-p3-select-strait-event-unconsumed.md

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #19 code review | Intentional scaffolding, duplicates existing todo 045 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/19
