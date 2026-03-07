---
status: resolved
priority: p3
issue_id: "070"
tags: [code-review, quality, dead-code]
dependencies: []
---

# displayLabel() Function Defined But Never Used in Template

## Problem Statement

In `StraitData.vue`, the `displayLabel()` function (lines 23-31) computes a formatted label string based on `labelAnchor` and `posX`, but it is never called in the template. The template uses `StraitLabel` with just `name`, not the formatted display label.

## Findings

- **Source:** `components/straits/StraitData.vue`, lines 23-31
- **Evidence:** Template does not reference `displayLabel()` anywhere

## Proposed Solutions

### Option A: Remove the function
- **Pros:** Clean up dead code
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

- **Affected files:** `components/straits/StraitData.vue`

## Acceptance Criteria

- [ ] No dead code in StraitData.vue

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Identified during PR #20 code review | Function exists from prior iteration |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/20
