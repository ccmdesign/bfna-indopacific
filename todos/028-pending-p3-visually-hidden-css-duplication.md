---
status: pending
priority: p3
issue_id: "028"
tags: [code-review, quality, css, accessibility]
dependencies: []
---

# Visually-Hidden CSS Utility Duplicated in Component Scope

## Problem Statement

The `.visually-hidden` CSS class in `components/EmbedCodeButton.vue` (lines 54-64) is a standard accessibility utility pattern that is scoped to this single component. If other components need the same utility (for screen-reader-only content), they must duplicate these ~10 lines. This pattern should be in a shared stylesheet.

**Why it matters:** CSS utility duplication increases maintenance burden. The `.visually-hidden` pattern is a well-known accessibility utility that benefits from being available globally, similar to how it is provided by frameworks like Bootstrap or Tailwind.

## Findings

- **Location:** `components/EmbedCodeButton.vue`, lines 54-64
- **Evidence:** The `.visually-hidden` class is scoped (`<style scoped>`) to `EmbedCodeButton` only. The project's global `assets/styles.css` or `public/styles.css` do not include this utility.
- **Agent:** code-simplicity-reviewer, architecture-reviewer
- **Impact:** Low -- works correctly, but will drift if duplicated across components.

## Proposed Solutions

### Option 1: Move `.visually-hidden` to the global stylesheet (`assets/styles.css`)
- **Pros:** Single source of truth; available to all components
- **Cons:** Minor global CSS increase
- **Effort:** Small
- **Risk:** None

### Option 2: Keep it scoped but add a comment noting the duplication risk
- **Pros:** No changes to global styles
- **Cons:** Does not prevent future duplication
- **Effort:** Small
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `components/EmbedCodeButton.vue`, `assets/styles.css`
- **Components:** `EmbedCodeButton`, global styles
- **Database changes:** None

## Acceptance Criteria

- [ ] The `.visually-hidden` utility is available globally or the duplication risk is documented
- [ ] The `EmbedCodeButton` screen reader span continues to work correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #11 code review | Accessibility CSS utilities should be global to prevent duplication |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/11
- WebAIM visually-hidden pattern: https://webaim.org/techniques/css/invisiblecontent/
