---
status: resolved
priority: p2
issue_id: "092"
tags: [code-review, quality]
dependencies: []
---

# Dead Code: parsePointsString Never Called

## Problem Statement

`parsePointsString` function in `scripts/parse-corridor-svg.ts` (lines 36-50) is defined but never called anywhere. Only `parsePointsAttribute` is used for SVG parsing. This is confusing dead code.

**Why it matters:** Dead code in a script that generates production data creates confusion about which parsing path is authoritative.

## Findings

- **Source:** `scripts/parse-corridor-svg.ts` lines 36-50
- **Evidence:** grep for `parsePointsString` shows only the function definition, no call sites.

## Proposed Solutions

### Option A: Remove the function
- Delete `parsePointsString` entirely
- **Pros:** Clean, removes confusion
- **Cons:** None
- **Effort:** Trivial
- **Risk:** None

## Recommended Action

Option A implemented: Removed the unused `parsePointsString` function from `scripts/parse-corridor-svg.ts`.

## Technical Details

- **Affected files:** `scripts/parse-corridor-svg.ts`

## Acceptance Criteria

- [ ] No dead parsing functions in the script
- [ ] Script still produces correct corridors.json output

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #23 code review | Unused helper function in parse script |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/23
