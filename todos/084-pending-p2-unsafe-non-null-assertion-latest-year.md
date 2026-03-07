---
status: resolved
priority: p2
issue_id: "084"
tags: [code-review, quality, robustness, BF-96]
dependencies: []
---

# Unsafe Non-Null Assertion on LATEST_YEAR

## Problem Statement

In `StraitMap.vue` line 27, `LATEST_YEAR` is computed with:

```ts
const LATEST_YEAR = Object.keys(historical).sort().pop()!
```

The `!` non-null assertion will cause a runtime crash if `historical` is an empty object (`.pop()` returns `undefined`). While the current data file has entries, this is fragile if the data format changes or during development with test data.

## Findings

- **Agent:** quality-reviewer
- **Evidence:** `components/StraitMap.vue` line 27
- **Location:** Module-level constant, executed on component mount

## Proposed Solutions

### Option 1: Add a guard with a fallback (Recommended)
```ts
const LATEST_YEAR = Object.keys(historical).sort().pop() ?? '2025'
```

- **Pros:** Safe, clear fallback
- **Cons:** Silent fallback may hide data issues
- **Effort:** Small
- **Risk:** Low

### Option 2: Throw a descriptive error
```ts
const years = Object.keys(historical).sort()
if (!years.length) throw new Error('straits.json historical data must contain at least one year')
const LATEST_YEAR = years[years.length - 1]
```

- **Pros:** Fail-fast with clear message
- **Cons:** Still crashes, but with a helpful error
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `components/StraitMap.vue`

## Acceptance Criteria

- [ ] No non-null assertion on potentially undefined value
- [ ] Component handles empty historical data gracefully or with a clear error

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Identified during PR #22 code review | Non-null assertions on `.pop()` are fragile |
| 2026-03-07 | Resolved (Option 1): replaced `!` with `?? '2025'` fallback | Safe default prevents crash on empty data |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/22
