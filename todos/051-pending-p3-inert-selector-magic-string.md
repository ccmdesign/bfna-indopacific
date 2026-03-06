---
status: pending
priority: p3
issue_id: "051"
tags: [code-review, architecture, BF-77]
dependencies: []
---

# Inert background selector is a magic string coupling

## Problem Statement

`StraitLens.vue` line 66 uses `document.querySelector('.straits-infographic')` to set the `inert` attribute on the background. This creates a tight coupling between the child component (`StraitLens`) and the parent's CSS class name. If the parent class changes, inert management silently breaks with no error.

## Findings

- **Source:** `components/StraitLens.vue:66`
- **Agent:** architecture-strategist

## Proposed Solutions

### Option A: Pass a ref or ID from the parent as a prop
- **Effort:** Small
- **Risk:** Low

### Option B: Use a well-known data attribute (e.g., `data-main-content`) instead of a class
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] Inert management does not depend on a CSS class name

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #16 review | |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/16
