---
status: resolved
priority: p2
issue_id: "042"
tags: [code-review, quality, typescript]
dependencies: []
---

# No TypeScript Interface for Strait Data Shape

## Problem Statement

`StraitMap.vue` imports `straitsData` from a JSON file and accesses properties like `posX`, `posY`, `labelAnchor`, and `flowScalar` without any TypeScript interface. The code relies on TypeScript's JSON module inference and uses non-null assertions (`!`) on the D3 `min()`/`max()` results (lines 23-24). If a strait entry is missing `posX` or `flowScalar`, the error surfaces at runtime as `NaN` coordinates or broken circles, with no compile-time warning.

The `labelAnchor` field uses a string switch statement with four cases (`below`, `above`, `right`, `left`) but has no exhaustive check — a typo in the JSON (e.g., `"bellow"`) would silently fall through, placing the label at the circle center.

## Findings

- **File:** `components/StraitMap.vue` lines 22-24 — non-null assertions on `min()`/`max()`
- **File:** `components/StraitMap.vue` lines 44-61 — switch on `labelAnchor` with no `default` case
- **File:** `data/straits/straits.json` — new fields `posX`, `posY`, `labelAnchor` added without a schema
- **No type file:** `types/` directory only contains `csv-raw.d.ts`

## Proposed Solutions

### Option A: Create a `Strait` TypeScript interface in `types/`
- **Pros:** Compile-time safety; documents the data contract; enables IDE autocomplete
- **Cons:** Requires maintaining the interface alongside the JSON
- **Effort:** Small
- **Risk:** Low

### Option B: Add a runtime validation using Zod or similar
- **Pros:** Catches data issues even with dynamic data sources
- **Cons:** Adds a dependency; overkill for static JSON
- **Effort:** Medium
- **Risk:** Low

## Recommended Action



## Technical Details

- **Affected files:** `components/StraitMap.vue`, `types/` directory, `data/straits/straits.json`

## Acceptance Criteria

- [ ] A `Strait` interface exists with all required fields typed
- [ ] `labelAnchor` is typed as a union literal (`'above' | 'below' | 'left' | 'right'`)
- [ ] The switch statement has a `default` case or exhaustive check
- [ ] Non-null assertions are replaced with proper guards or typed inputs

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during PR #14 code review | JSON imports lose type safety without explicit interfaces |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/14
