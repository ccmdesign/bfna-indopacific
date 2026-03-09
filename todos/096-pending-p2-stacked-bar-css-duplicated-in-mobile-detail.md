---
status: pending
priority: p2
issue_id: "096"
tags: [code-review, quality, css-duplication, BF-89]
dependencies: []
---

# Stacked Bar CSS Duplicated Between StraitDetailPanel and StraitMobileDetail

## Problem Statement

`StraitMobileDetail.vue` contains ~70 lines of `.stacked-bar*` CSS rules that duplicate the same pattern from `StraitDetailPanel.vue`. While `computeVesselSegments` was correctly extracted to a shared utility, the CSS was copy-pasted. Changes to the stacked bar design will need to be applied in two places.

## Findings

- **Agent:** quality-reviewer
- **Evidence:** `components/straits/StraitMobileDetail.vue` lines ~761-822 — `.stacked-bar__track`, `.stacked-bar__segment`, `.stacked-bar__legend`, etc.

## Proposed Solutions

### Option 1: Extract to a shared StraitVesselBar component
Create a `StraitVesselBar.vue` component that encapsulates both the template and styles.

- **Pros:** Single source of truth, reusable
- **Cons:** New component file
- **Effort:** Medium
- **Risk:** Low

### Option 2: Move stacked-bar styles to global CSS
Add `.stacked-bar*` rules to `public/styles.css` (unscoped).

- **Pros:** Quick fix
- **Cons:** Pollutes global namespace
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `components/straits/StraitMobileDetail.vue`, `components/straits/StraitDetailPanel.vue`

## Acceptance Criteria

- [ ] Stacked bar styles defined in one place only

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
