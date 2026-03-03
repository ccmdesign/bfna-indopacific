---
status: pending
priority: p3
issue_id: "008"
tags: [code-review, architecture, css, future-proofing]
dependencies: []
---

# Absolute-positioned footer may overlap content on scrollable pages

## Problem Statement

The layout footer uses `position: absolute; bottom: 0` which removes it from normal document flow. For the current single-viewport infographic pages this works correctly, but future pages with scrollable or variable-height content will have their bottom content hidden behind the 4rem footer bar. There is no `padding-bottom` or margin on the slot content area to compensate.

**Why it matters:** The shared layout is designed to serve multiple infographic pages. If any future page has content taller than the viewport, the footer will overlap the bottom of that content. This is a forward-looking concern, not a current bug.

## Findings

- **Location:** `layouts/default.vue`, lines 71-84 (footer CSS)
- **Evidence:** Footer uses `position: absolute; bottom: 0; height: 4rem`. The `.page-wrapper` uses `max-height: 100vh` (desktop) or `height: 100%` (mobile). No padding-bottom is applied to the content area.
- **Agent:** architecture-strategist, performance-oracle
- **Impact:** No current impact. Potential issue for future pages with taller content.

## Proposed Solutions

### Option 1: Add `padding-bottom: 4rem` to `.page-wrapper` for scrollable pages
- **Pros:** Simple, ensures content never hides behind footer
- **Cons:** Adds unnecessary padding on single-viewport pages
- **Effort:** Small
- **Risk:** Low -- may need per-page opt-in via a meta flag

### Option 2: Address when a scrollable page is actually added
- **Pros:** No premature optimization, solves the right problem at the right time
- **Cons:** Must remember to handle this later
- **Effort:** None now
- **Risk:** Could be forgotten

### Option 3: Switch footer to `position: sticky; bottom: 0`
- **Pros:** Footer stays at bottom without overlapping content
- **Cons:** Requires the page-wrapper to be a scroll container, may affect current grid layout
- **Effort:** Medium
- **Risk:** Medium -- could change visual behavior of current pages

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `layouts/default.vue`
- **Components:** Footer CSS positioning
- **Database changes:** None

## Acceptance Criteria

- [ ] Current pages render identically (no visual regression)
- [ ] Future scrollable pages do not have content hidden behind footer

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #6 code review | Absolute positioning in shared layouts requires careful consideration for varying content heights |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/6
- File: `layouts/default.vue` lines 71-84
