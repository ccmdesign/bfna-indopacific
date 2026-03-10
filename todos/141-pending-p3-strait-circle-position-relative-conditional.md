---
status: resolved
priority: p3
issue_id: "141"
tags: [code-review, css, layout]
dependencies: []
---

# StraitCircle only gets position:relative when selected — FisheyeLens relies on it

## Problem Statement

`StraitCircle.vue` applies `position: relative` only via the `.strait-circle--selected` class. The `FisheyeLens` canvas uses `position: absolute; inset: 0` to fill the circle. Since `FisheyeLens` is only rendered when `selected` is true (via `v-if`), this works — but the coupling is implicit. If someone changes the `v-if` condition to show the lens before the `--selected` class is applied, the canvas would not be positioned correctly.

**Why it matters:** This is a minor coupling concern. The CSS architecture is correct for the current implementation but could surprise future developers.

## Findings

- **Location:** `components/straits/StraitCircle.vue` CSS line `.strait-circle--selected { position: relative; overflow: hidden; }`
- **Evidence:** FisheyeLens uses `position: absolute; inset: 0` which requires a positioned ancestor. That ancestor only gets `position: relative` when selected.
- **Agent:** quality-reviewer

## Proposed Solutions

### Option A: Always apply position:relative to .strait-circle
Move `position: relative; overflow: hidden` to `.strait-circle` base class.

- **Pros:** Eliminates implicit coupling
- **Cons:** overflow:hidden on non-selected circles may clip hover effects
- **Effort:** Small
- **Risk:** Low — needs visual testing

### Option B: Accept current coupling, add a comment
Document the dependency between `v-if="selected"` and `--selected` class.

- **Pros:** No code change, low risk
- **Cons:** Comment may go stale
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_To be decided during triage._

## Technical Details

- **Affected files:** `components/straits/StraitCircle.vue`

## Acceptance Criteria

- [ ] FisheyeLens positioning is reliable regardless of future condition changes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-10 | Created | Code review finding from PR #33 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/33
