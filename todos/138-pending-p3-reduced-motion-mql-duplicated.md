---
status: pending
priority: p3
issue_id: "138"
tags: [code-review, quality, code-duplication]
dependencies: []
---

# prefers-reduced-motion detection duplicated in StraitCircle and StraitMap

## Problem Statement

PR #33 adds a reactive `prefers-reduced-motion` media query listener in `StraitCircle.vue` (lines 31-42). An identical pattern already exists in `StraitMap.vue` (line 84). Both components independently create `matchMedia` listeners for the same query. This is a duplication that could be extracted into a shared composable.

**Why it matters:** Code duplication increases maintenance burden. If the detection pattern needs to change (e.g., to handle SSR differently), it must be updated in multiple places.

## Findings

- **Location:** `components/straits/StraitCircle.vue` lines 31-42, `components/StraitMap.vue` line 84
- **Evidence:** Both use `window.matchMedia('(prefers-reduced-motion: reduce)')` with event listeners. StraitMap uses a simpler one-shot check; StraitCircle adds a reactive listener.
- **Agent:** quality-reviewer

## Proposed Solutions

### Option A: Extract a useReducedMotion composable
Create `composables/useReducedMotion.ts` that returns a reactive `Ref<boolean>`.

- **Pros:** Single source of truth; reusable across all components
- **Cons:** One more file; may be over-engineering for 2 usages
- **Effort:** Small
- **Risk:** Low

### Option B: Accept duplication
Two usages is borderline for extraction. Leave as-is.

- **Pros:** No code churn
- **Cons:** If a third component needs it, extraction becomes more valuable
- **Effort:** None
- **Risk:** Low

## Recommended Action

_To be decided during triage._

## Technical Details

- **Affected files:** `components/straits/StraitCircle.vue`, `components/StraitMap.vue`

## Acceptance Criteria

- [ ] Either extract shared composable or document the intentional duplication

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-10 | Created | Code review finding from PR #33 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/33
