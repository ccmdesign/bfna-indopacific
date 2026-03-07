---
status: pending
priority: p3
issue_id: "078"
tags: [code-review, quality, typescript, BF-78]
dependencies: []
---

# Unused `altPoints` Field in StraitPath Type

## Problem Statement

The `StraitPath` interface in `types/strait.ts` (line 69) declares an optional `altPoints` field for a second shipping lane, but no code in the PR (or the codebase) reads or populates this field. None of the strait path definitions in `data/straits/strait-paths.ts` use it either.

This is speculative design -- a type field with no implementation.

## Findings

- **Source:** `types/strait.ts`, line 69-70
- **Evidence:** `altPoints?: [Point, Point, Point, Point]` -- grep across the codebase finds zero reads
- **Impact:** Minor -- clutters the type definition, may mislead future contributors into thinking multi-lane is partially implemented

## Proposed Solutions

### Option A: Remove `altPoints` until needed
- **Approach:** Delete the field; re-add when multi-lane is actually implemented
- **Pros:** YAGNI -- types match reality
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

### Option B: Keep and document as future placeholder
- **Approach:** Add a `@todo` JSDoc comment
- **Pros:** Signals intent
- **Cons:** Speculative code persists
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A

## Technical Details

- **Affected files:** `types/strait.ts`

## Acceptance Criteria

- [ ] No unused type fields in StraitPath interface
- [ ] Build passes cleanly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #21 code review | Speculative type field |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/21
