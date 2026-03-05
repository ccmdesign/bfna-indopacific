---
status: pending
priority: p3
issue_id: "045"
tags: [code-review, architecture, dead-code]
dependencies: []
---

# `select-strait` Event Emitted but Never Consumed

## Problem Statement

`StraitMap.vue` emits a `select-strait` event (line 76-79), and `StraitsInfographic.vue` re-emits it to its parent (line 9). However, no page-level component listens for this event. The event handler chain is wired up through two component layers but terminates at a dead end. While the PR description mentions this is for "future Lens wiring," the dangling event chain adds complexity with no current functionality.

## Findings

- **File:** `components/StraitMap.vue` line 76 — `defineEmits<{ (e: 'select-strait', id: string): void }>()`
- **File:** `components/infographics/StraitsInfographic.vue` line 4, 9 — re-emits the event
- **No consumer found** in any page under `pages/`

## Proposed Solutions

### Option A: Accept as intentional scaffolding for Lens State
- **Pros:** No rework when Lens State is implemented
- **Cons:** Dead code in the meantime
- **Effort:** None
- **Risk:** Low

### Option B: Add a comment or `// TODO` marker explaining the intended consumer
- **Pros:** Documents intent; helps future developers
- **Cons:** Minimal
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `components/StraitMap.vue`, `components/infographics/StraitsInfographic.vue`

## Acceptance Criteria

- [ ] The event is either consumed or clearly documented as scaffolding

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during PR #14 code review | PR description confirms this is future Lens State wiring |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/14
