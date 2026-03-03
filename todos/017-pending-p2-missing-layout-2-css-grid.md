---
status: resolved
priority: p2
issue_id: "017"
tags: [code-review, architecture, quality, css, BF-72]
dependencies: []
---

# Missing `.layout-2` CSS Grid Definition for Straits Pages

## Problem Statement

The new straits page wrappers (`pages/infographics/straits.vue` and `pages/embed/straits.vue`) both set `layoutClass: 'layout-2'` via `definePageMeta`, but no `.layout-2` CSS grid rule exists anywhere in the codebase. Only `.layout-1` is defined in `public/styles.css`. This means the straits pages render inside the `.master-grid` container but have no grid placement rules for their child elements (`.title`, `.description`, `.chart`, etc.).

**Why it matters:** The placeholder component uses `display: contents` and `grid-column: 1 / -1` which works acceptably for now (full-width centering), but the real `StraitsInfographic` component (which will include a map, sidebar, and multiple positioned elements per the brainstorm) will have no grid positioning at all. The `layout-2` grid definition is tracked as a separate task (BF-38) but its absence should be noted here because the PR introduces routes that depend on it.

## Findings

- **Location:** `pages/infographics/straits.vue` line 3, `pages/embed/straits.vue` line 4
- **Evidence:** `layoutClass: 'layout-2'` is set but `grep -r 'layout-2' *.css` finds no CSS definition. Only `.layout-1` exists in `public/styles.css` (line 66).
- **Agent:** architecture-strategist, code-simplicity-reviewer
- **Impact:** Medium -- the placeholder renders adequately without it, but the class reference is dangling. Future work on the real straits component will fail to position correctly until `.layout-2` is defined.

## Proposed Solutions

### Option 1: Add a minimal `.layout-2` stub to `public/styles.css`
- Add an empty or basic `.layout-2 { }` rule as a placeholder, with a comment referencing BF-38.
- **Pros:** Eliminates the dangling class reference; makes it explicit that layout-2 is a known gap
- **Cons:** Adds code that does nothing functionally; may confuse future developers
- **Effort:** Trivial
- **Risk:** None

### Option 2: Track as dependency, leave as-is
- Accept that `.layout-2` will be defined when BF-38 is implemented. The placeholder renders correctly without it.
- **Pros:** No unnecessary code; clean separation of concerns
- **Cons:** Dangling class reference in production
- **Effort:** None
- **Risk:** Low

### Option 3: Add `.layout-2` with the straits-specific grid from the brainstorm
- Implement the full `.layout-2` grid definition now based on the straits brainstorm specifications.
- **Pros:** Routes are fully ready for the real component
- **Cons:** Premature; the grid spec may change when the real component is built; couples this PR to BF-38 scope
- **Effort:** Medium
- **Risk:** Medium (premature implementation)

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `public/styles.css`, `pages/infographics/straits.vue`, `pages/embed/straits.vue`
- **Components:** CSS grid layout system
- **Database changes:** None

## Acceptance Criteria

- [ ] `.layout-2` class is either defined in CSS or explicitly documented as pending BF-38
- [ ] Straits placeholder page renders correctly with proper visual centering
- [ ] No console warnings or visual regressions

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #10 code review | The straits pages reference a layout class that doesn't exist yet; tracked as BF-38 |

## Resources

- **PR:** https://github.com/ccmdesign/bfna-indopacific/pull/10
- **Related task:** BF-38 (implement foundational routing and .layout-2 CSS grid system)
- **Files:** `public/styles.css`, `pages/infographics/straits.vue`, `pages/embed/straits.vue`
