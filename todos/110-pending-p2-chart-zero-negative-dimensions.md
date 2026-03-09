---
status: pending
priority: p2
issue_id: "110"
tags: [code-review, quality, defensive-programming]
dependencies: []
---

# Chart Zero/Negative Dimension Props

## Problem Statement
`StraitHistoryChart.vue` accepts optional `width` and `height` props with defaults of 280 and 140, but does not validate that the values are positive. Passing zero or negative values would produce `NaN` in the proportional padding calculations (`Math.round(H.value * 0.11)` etc.) and break the SVG viewBox, D3 scale ranges, and axis label positioning.

**Why it matters:** While unlikely in normal use, a future consumer or data-driven scenario could pass invalid dimensions, causing a silently broken chart with no error message.

## Findings
- **File:** `components/straits/StraitHistoryChart.vue`, lines 7-23
- PAD computed uses multiplication on `H.value` and `W.value` without guards
- D3 scale ranges depend on `H.value - PAD.value.bottom` which would be negative/NaN
- SVG viewBox `0 0 ${W} ${H}` would produce invalid SVG with zero/negative values

## Proposed Solutions

### Option A: Clamp props with Math.max
- Add `const W = computed(() => Math.max(props.width, 40))` and same for H
- **Pros:** Simple, one-line fix, prevents NaN
- **Cons:** Silently corrects invalid input
- **Effort:** Small
- **Risk:** Low

### Option B: Validate with Vue prop validator
- Add `validator: (v: number) => v > 0` to both prop definitions
- **Pros:** Catches issues in dev mode with Vue warnings
- **Cons:** Only warns in dev, doesn't prevent runtime breakage in prod
- **Effort:** Small
- **Risk:** Low

### Option C: Combine both (recommended)
- Add prop validators AND clamp in computed
- **Pros:** Dev-time warnings + runtime safety
- **Effort:** Small
- **Risk:** Low

## Recommended Action
<!-- Filled during triage -->

## Technical Details
- **Affected files:** `components/straits/StraitHistoryChart.vue`
- **Components:** StraitHistoryChart
- **Database changes:** None

## Acceptance Criteria
- [ ] Zero or negative width/height does not produce NaN or broken SVG
- [ ] Vue dev warning is shown for invalid prop values
- [ ] Default dimensions (280x140) still work unchanged

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Created from PR #29 code review | Proportional padding pattern needs guard |

## Resources
- PR: https://github.com/ccmdesign/bfna-indopacific/pull/29
- Linear: BF-92
