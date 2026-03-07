---
status: resolved
priority: p2
issue_id: "086"
tags: [code-review, quality, dead-code, BF-96]
dependencies: []
---

# Dead Code: `displayLabel()` Function in StraitData.vue

## Problem Statement

The `displayLabel()` function defined at lines 26-35 of `StraitData.vue` is never called in the template or elsewhere. The template directly uses `:text="name"` when rendering `<StraitLabel>`. This is dead code that may confuse future developers.

## Findings

- **Agent:** quality-reviewer
- **Evidence:** `components/straits/StraitData.vue` lines 26-35 define `displayLabel()`, but the template at line 62 passes `:text="name"` directly
- **Note:** There is an existing todo (070) for this same finding from a prior review. This is a confirmation that it persists in this PR.

## Proposed Solutions

### Option 1: Remove the function (Recommended)
Delete the `displayLabel()` function entirely.

- **Pros:** Cleaner code
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `components/straits/StraitData.vue`

## Acceptance Criteria

- [ ] `displayLabel()` function is removed or actively used in the template

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Confirmed still present during PR #22 review | Related to existing todo 070 |
| 2026-03-07 | Resolved: removed dead `displayLabel()` function from StraitData.vue | Template uses `:text="name"` directly |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/22
- Related: `todos/070-pending-p3-unused-displaylabel-function.md`
