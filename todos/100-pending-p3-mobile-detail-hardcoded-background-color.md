---
status: pending
priority: p3
issue_id: "100"
tags: [code-review, quality, css, BF-89]
dependencies: []
---

# Mobile Components Use Hardcoded Colors Instead of CSS Variables

## Problem Statement

`StraitMobileDetail.vue` and `StraitCard.vue` use many hardcoded color values (e.g., `rgba(255, 255, 255, 0.85)`, `rgba(13, 13, 13, 0.95)`, `#fff`, `hsl(348, 80%, 72%)`) instead of the project's CSS custom properties (e.g., `var(--color-accent)`, `var(--color-card-bg)`). Some references do use variables (e.g., `var(--color-accent)`, `var(--color-cargo-container)`), but the majority are hardcoded. This makes theme changes difficult.

## Findings

- **Agent:** quality-reviewer
- **Evidence:** `StraitMobileDetail.vue` and `StraitCard.vue` — numerous hardcoded color values throughout scoped styles

## Proposed Solutions

### Option 1: Replace hardcoded values with CSS variables
Define missing variables in `public/styles.css` and use them throughout.

- **Pros:** Consistent theming, easier maintenance
- **Cons:** Requires audit of all color values
- **Effort:** Medium
- **Risk:** Low

## Technical Details

- **Affected files:** `components/straits/StraitMobileDetail.vue`, `components/straits/StraitCard.vue`

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
