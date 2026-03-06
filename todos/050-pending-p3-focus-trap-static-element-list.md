---
status: resolved
priority: p3
issue_id: "050"
tags: [code-review, accessibility, BF-77]
dependencies: []
---

# Focus trap uses static element list, misses dynamically added elements

## Problem Statement

The manual focus trap in `StraitLens.vue` (lines 28-61) queries focusable elements on every Tab keydown. While this is actually correct for handling dynamic content, the selector `'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'` does not include elements with `role="button"` or other interactive ARIA roles that might be added in the future (e.g., the canvas placeholder for BF-78). This is a minor gap for future-proofing.

## Findings

- **Source:** `components/StraitLens.vue:28-35`
- **Agent:** quality-reviewer

## Proposed Solutions

### Option A: Expand the focusable selector
- **Effort:** Small
- **Risk:** Low

### Option B: Use a lightweight focus-trap library (e.g., focus-trap)
- **Effort:** Medium
- **Risk:** Low

## Acceptance Criteria

- [ ] All interactive elements inside the lens dialog are trapped in the focus cycle

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #16 review | |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/16
