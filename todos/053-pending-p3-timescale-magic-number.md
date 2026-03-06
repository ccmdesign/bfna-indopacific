---
status: pending
priority: p3
issue_id: "053"
tags: [code-review, quality, BF-77]
dependencies: []
---

# timeScale(1.2) on close is an undocumented magic number

## Problem Statement

In `useStraitTransition.ts` line 170, `timeline.timeScale(1.2)` speeds up the reverse animation by 20%. This constant is not documented or extracted to a named constant, making it easy to overlook during future tuning.

## Findings

- **Source:** `composables/useStraitTransition.ts:170`
- **Agent:** quality-reviewer

## Proposed Solutions

### Option A: Extract to a named constant with a comment
- **Effort:** Small
- **Risk:** Low

```ts
const CLOSE_TIME_SCALE = 1.2 // 20% faster reverse for snappier feel
timeline.timeScale(CLOSE_TIME_SCALE)
```

## Acceptance Criteria

- [ ] Magic number is replaced with a named constant

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #16 review | |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/16
