---
status: pending
priority: p2
issue_id: "091"
tags: [code-review, architecture, css, BF-89]
dependencies: []
---

# Breakpoint Mismatch Between JS (899px) and CSS (900px)

## Problem Statement

`useViewport.ts` uses `max-width: 899px` for the mobile breakpoint, while `public/styles.css` uses `max-width: 900px`. At exactly 900px wide, CSS applies mobile layout overrides (flex column, no grid) but JavaScript renders the desktop `<StraitMap>` component. This creates a broken layout state where the desktop SVG map renders inside a mobile-optimized flex container.

## Findings

- **Agent:** architecture-strategist
- **Evidence:**
  - `composables/useViewport.ts` line 11: `matchMedia('(max-width: 899px)')`
  - `public/styles.css` line ~85: `@media (max-width: 900px)`

## Proposed Solutions

### Option 1: Align both to 899px
Change CSS to `@media (max-width: 899px)` to match the JS breakpoint.

- **Pros:** Simple, consistent
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

### Option 2: Extract breakpoint to a shared constant
Define `MOBILE_BREAKPOINT = 900` in a shared config, use `max-width: ${MOBILE_BREAKPOINT - 1}px` in JS and CSS custom property for the media query.

- **Pros:** Single source of truth
- **Cons:** CSS media queries can't use JS variables natively (needs build-time solution)
- **Effort:** Medium
- **Risk:** Low

## Technical Details

- **Affected files:** `composables/useViewport.ts`, `public/styles.css`

## Acceptance Criteria

- [ ] JS and CSS breakpoints match exactly
- [ ] At every viewport width, either mobile OR desktop layout is active (never both/neither)

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
