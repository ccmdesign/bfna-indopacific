---
status: pending
priority: p2
issue_id: "083"
tags: [code-review, architecture, browser-compatibility, BF-96]
dependencies: []
---

# CSS Anchor Positioning Used Without Fallback

## Problem Statement

The `StraitMap.vue` component uses CSS Anchor Positioning (`position-anchor`, `anchor()`, `anchor-name`) to position the left and right detail panels relative to the selected strait circle. This CSS feature is only supported in Chromium-based browsers (Chrome 125+, Edge 125+). As of mid-2025, Firefox and Safari do NOT support it.

Users on Firefox or Safari will see panels positioned incorrectly or not at all when a strait is selected.

## Findings

- **Agent:** architecture-reviewer, quality-reviewer
- **Evidence:**
  - `components/StraitMap.vue` lines 449-464: `.strait-panel-left` and `.strait-panel-right` use `position-anchor: --selected-strait` and `top: anchor(center)`
  - `components/straits/StraitData.vue` line 49: sets `anchorName: selected ? '--selected-strait' : 'none'`
- **Browser support:** https://caniuse.com/css-anchor-positioning -- ~75% global coverage (no Firefox, no Safari)

## Proposed Solutions

### Option 1: Add JS-based fallback positioning (Recommended)
Compute panel position in JS using the selected strait's `posX`/`posY` and apply via inline styles. Use `@supports (anchor-name: --x)` to detect native support and skip the JS path when available.

- **Pros:** Works in all browsers, progressive enhancement
- **Cons:** More code, slight complexity
- **Effort:** Medium
- **Risk:** Low

### Option 2: Use only JS positioning, drop CSS Anchor
Remove CSS Anchor entirely and position panels with computed styles.

- **Pros:** Simpler, universal
- **Cons:** Loses the declarative elegance of CSS Anchor
- **Effort:** Medium
- **Risk:** Low

### Option 3: Accept Chromium-only for now
Document the limitation, revisit when Safari/Firefox ship support.

- **Pros:** No work
- **Cons:** ~25% of users get a broken experience
- **Effort:** None
- **Risk:** High (user-facing)

## Recommended Action

Option 1 -- progressive enhancement with JS fallback.

## Technical Details

- **Affected files:** `components/StraitMap.vue` (panel positioning CSS), `components/straits/StraitData.vue` (anchor-name)
- **Components:** StraitMap, StraitData
- **Database changes:** None

## Acceptance Criteria

- [ ] Panels appear correctly positioned next to selected strait in Chrome, Firefox, and Safari
- [ ] `@supports` query used to avoid double-positioning in Chromium

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Identified during PR #22 code review | CSS Anchor Positioning is Chromium-only as of 2025 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/22
- https://caniuse.com/css-anchor-positioning
