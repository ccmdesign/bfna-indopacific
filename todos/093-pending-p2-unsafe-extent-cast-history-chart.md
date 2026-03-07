---
status: pending
priority: p2
issue_id: "093"
tags: [code-review, quality, security]
dependencies: []
---

# Unsafe `as` Cast on d3 extent() in StraitHistoryChart

## Problem Statement

In `StraitHistoryChart.vue` lines 27 and 35, `extent()` returns are cast with `as [number, number]`. If `historical` prop is an empty object or contains no numeric data, `extent()` returns `[undefined, undefined]`, and the cast silences this. The resulting NaN values propagate into `scaleLinear().domain()`, producing broken scales and invisible chart lines.

**Why it matters:** An empty or malformed historical data prop will produce a silently broken chart with no error feedback.

## Findings

- **Source:** `components/straits/StraitHistoryChart.vue` lines 27, 35
- **Evidence:** `const [lo, hi] = extent(cargoData.value) as [number, number]` -- `extent` can return `[undefined, undefined]` for empty arrays.

## Proposed Solutions

### Option A: Guard against empty data
- Check `cargoData.value.length === 0` early and return empty/placeholder SVG
- **Pros:** Clean UX, no NaN propagation
- **Cons:** Minor code addition
- **Effort:** Small
- **Risk:** None

### Option B: Use nullish coalescing on extent results
- `const [lo = 0, hi = 0] = extent(cargoData.value) as [number | undefined, number | undefined]`
- **Pros:** Inline fix, minimal change
- **Cons:** Chart still renders with 0-0 domain (meaningless)
- **Effort:** Trivial
- **Risk:** Low

## Recommended Action

_(To be filled during triage)_

## Technical Details

- **Affected files:** `components/straits/StraitHistoryChart.vue`

## Acceptance Criteria

- [ ] Chart handles empty historical data without NaN in scales
- [ ] No unsafe `as` cast that silences undefined values

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #23 code review | d3 extent() returns undefined for empty arrays |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/23
