---
status: wont_fix
priority: p3
issue_id: "BF-110"
tags: [code-review, architecture, css-layout]
dependencies: []
---

# StraitMap map-inner changed from relative to absolute positioning

## Problem Statement

In `components/StraitMap.vue`, `.map-inner` is changed from `position: relative` to `position: absolute`. The commit message says this prevents the container from not shrinking on resize. However, absolute positioning removes the element from normal flow, which means the parent no longer sizes itself based on `.map-inner` content. This is likely correct for the grid layout (where the parent grid cell sizes the container), but should be validated that it does not break any layout scenario where the parent depends on the child's intrinsic size.

## Findings

- `StraitMap.vue:522` — `position: relative` changed to `position: absolute`
- `.map-inner` uses `grid-column: 1 / -1; grid-row: 1 / -1` — so it fills the grid cell regardless of position mode
- The commit message specifically notes this fixes a resize-shrink bug
- Per project memory, `.straits-infographic` uses `display: contents` so grid placement is on the children

## Proposed Solutions

### Option 1: Accept the change with visual regression testing

**Approach:** Validate across all 6 straits on desktop and mobile. The fix is targeted at a specific resize bug.

**Effort:** Small
**Risk:** Low

## Technical Details

**Affected files:** `components/StraitMap.vue`

## Acceptance Criteria

- [ ] Map renders correctly in all 6 straits on desktop
- [ ] Map renders correctly on mobile
- [ ] Resize behavior works without the original shrink bug

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-11 | Created | Code review of PR #34 (BF-110) |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/34
