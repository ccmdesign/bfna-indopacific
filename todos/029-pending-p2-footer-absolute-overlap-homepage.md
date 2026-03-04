---
status: resolved
priority: p2
issue_id: "029"
tags: [code-review, css, layout, homepage]
dependencies: []
---

# Footer `position: absolute` Causes Overlap Risk on Scrollable Homepage

## Problem Statement

The footer in `layouts/default.vue` uses `position: absolute; bottom: 0` (line 104-116), which positions it relative to the `.page-wrapper` container. On the new homepage with `.layout-home` (which uses `display: flex`, `height: auto`, `overflow: visible`), the footer sits at the bottom of the container rather than at the end of the document flow.

The `padding-bottom: 6rem` on `.layout-home` provides clearance, but when there are only 2 cards the footer overlaps the last card if the viewport is too short, and when content grows beyond the viewport the footer stays pinned to the absolute bottom of the flex container rather than scrolling with the page.

This was already identified in the plan deepening notes but was not addressed in the implementation.

## Findings

- **Location:** `layouts/default.vue` lines 103-116 (footer CSS), `public/styles.css` lines 123-136 (`.layout-home`)
- **Evidence:** Footer uses `position: absolute; bottom: 0`, while `.layout-home` changes `.page-wrapper` from a fixed-viewport grid to a scrollable flex column. These two approaches conflict.
- **Risk:** On short viewports with 2 cards, the footer can overlap the bottom card. The `padding-bottom: 6rem` mitigates but does not fully solve.

## Proposed Solutions

### Option A: Make footer flow-based on homepage
- **Description:** Add a conditional class or override in `.layout-home` that changes the footer from `position: absolute` to `position: relative` or `position: static`, allowing it to sit in the document flow.
- **Pros:** Footer always appears below content regardless of content height; no padding hack needed.
- **Cons:** Requires layout-specific footer styling; may need scoped overrides.
- **Effort:** Small
- **Risk:** Low

### Option B: Use `position: sticky` for homepage footer
- **Description:** Apply `position: sticky; bottom: 0` to the footer when `.layout-home` is active. This keeps the footer visible at the bottom of the viewport but allows it to be pushed down by content.
- **Pros:** Maintains footer visibility; works with scrollable content.
- **Cons:** Sticky positioning can behave unexpectedly in certain overflow contexts.
- **Effort:** Small
- **Risk:** Low

### Option C: Increase padding-bottom to guarantee clearance
- **Description:** Keep `position: absolute` but increase `padding-bottom` from `6rem` to `8rem` to ensure the footer never overlaps.
- **Pros:** Simplest change; no positioning logic to modify.
- **Cons:** Does not solve the fundamental problem; still a workaround.
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_To be determined during triage._

## Technical Details

- **Affected files:** `layouts/default.vue`, `public/styles.css`
- **Components:** Default layout footer, `.layout-home` class
- **Database changes:** None

## Acceptance Criteria

- [ ] Footer does not overlap card content on any viewport size (320px to 2560px)
- [ ] Footer appears below card grid content when scrolling
- [ ] Footer remains visually correct on infographic pages (no regression)

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-03 | Created | Code review finding from PR #12 |
| 2026-03-03 | Resolved (Option A) | Added `.layout-home footer { position: relative; margin-top: auto; }` to `public/styles.css`, making footer flow-based on homepage. Combined with `justify-content: flex-start` and `margin: auto 0` on `.homepage-hub` for proper centering. |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/12
- Plan notes identifying this issue: `docs/plans/2026-03-03-feat-build-homepage-hub-with-infographic-cards-plan.md` (line 25-26)
