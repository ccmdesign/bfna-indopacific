---
status: resolved
priority: p2
issue_id: "069"
tags: [code-review, quality, dead-code]
dependencies: []
---

# selectedStraitId Ref Declared But Never Used in Rendering

## Problem Statement

In `StraitMap.vue`, `selectedStraitId` is declared as a ref and updated by `onActivate`, but it is never referenced in the template or used to derive any computed state. The `onActivate` handler toggles the value but nothing reads it. This is dead state that adds confusion about intended behavior.

## Findings

- **Source:** `components/StraitMap.vue`, line 38: `const selectedStraitId = ref<string | null>(null)`
- **Source:** `components/StraitMap.vue`, lines 44-46: `onActivate` updates it
- **Evidence:** Grep for `selectedStraitId` shows it is only written, never read in template or computed properties
- The `activate` event is emitted by `StraitData` but the resulting state change has no visual effect

## Proposed Solutions

### Option A: Remove selectedStraitId and onActivate if click behavior is not planned
- **Pros:** Cleaner code, no dead state
- **Cons:** Will need to re-add if click-to-select is planned
- **Effort:** Small
- **Risk:** Low

### Option B: Wire selectedStraitId to visual state (e.g., persistent highlight)
- **Pros:** Completes the interaction model
- **Cons:** Scope creep for this PR
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

- **Affected files:** `components/StraitMap.vue`

## Acceptance Criteria

- [ ] Either remove dead code or connect it to a visible UI state

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Identified during PR #20 code review | State is written but never read |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/20
