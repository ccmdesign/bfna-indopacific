---
status: resolved
priority: p3
issue_id: "033"
tags: [code-review, css, layout, scalability]
dependencies: []
---

# `justify-content: center` on `.layout-home` May Need Adjustment as Cards Scale

## Problem Statement

The `.layout-home` class in `public/styles.css` uses `justify-content: center` on a flex column layout. With the current 2 cards, the content is shorter than the viewport on most screens, so the cards are vertically centered -- which looks correct. However, as more infographics are added (the PR body mentions a planned third infographic), the content will exceed viewport height and the `justify-content: center` will cause content to overflow upward, making the header inaccessible without scrolling up.

## Findings

- **Location:** `public/styles.css` line 133
- **Evidence:** `.layout-home` uses `display: flex; flex-direction: column; align-items: center; justify-content: center`. With `overflow: visible` and `min-height: 100svh`, when content exceeds the viewport, `justify-content: center` distributes overflow equally above and below the container, which can push the header above the initial viewport.
- **Risk:** Low -- current 2-card count is fine. Will become noticeable when 3+ cards push total content height past viewport height.

## Proposed Solutions

### Option A: Change to `justify-content: flex-start` with top padding
- **Description:** Replace `justify-content: center` with `justify-content: flex-start` and add `padding-top` to create the desired spacing from the top.
- **Pros:** Content always starts from a predictable position; scales correctly with any number of cards.
- **Cons:** Less visually centered when content is short (2 cards).
- **Effort:** Small
- **Risk:** None

### Option B: Use `margin: auto` on the content instead
- **Description:** Keep `justify-content: flex-start` and use `margin: auto 0` on `.homepage-hub` to center it when space allows, while naturally pushing content down when it overflows.
- **Pros:** Centers when short, aligns to top when tall; best of both worlds.
- **Cons:** Slightly more nuanced CSS.
- **Effort:** Small
- **Risk:** None

## Recommended Action

_To be determined during triage._

## Technical Details

- **Affected files:** `public/styles.css`, potentially `pages/index.vue`
- **Components:** `.layout-home` class, `.homepage-hub` class
- **Database changes:** None

## Acceptance Criteria

- [ ] Homepage looks correct with 2 cards (current state)
- [ ] Homepage scrolls correctly when 3+ cards are present (simulated)
- [ ] Header is always visible at the top of the page without scrolling up

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-03 | Created | Code review finding from PR #12 |
| 2026-03-03 | Resolved (Option B) | Changed `.layout-home` from `justify-content: center` to `justify-content: flex-start`, and added `margin: auto 0` on `.homepage-hub` to center when content is short while scrolling naturally when content exceeds viewport. |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/12
- CSS spec: `justify-content: center` overflow behavior on flex containers
