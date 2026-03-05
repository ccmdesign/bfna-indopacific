---
status: pending
priority: p2
issue_id: "034"
tags: [code-review, quality, css]
dependencies: []
---

# Unused `.strait-title` CSS Grid Placement Rule

## Problem Statement

The `.layout-2` block in `public/styles.css` defines a `.strait-title` placement rule (grid-row, grid-column, z-index, align-self, padding), but no element in the current PR or codebase has the class `strait-title`. This creates dead CSS that may confuse future developers about whether this class is meant to be used or was accidentally left behind.

**Why it matters:** Dead CSS in a shared global stylesheet is more impactful than dead scoped CSS. Other developers may assume this rule is active and avoid using the same grid area, or they may accidentally apply the class expecting certain behavior. The rule should either be used in this PR or deferred until the component that needs it is implemented.

## Findings

- **Location:** `/public/styles.css`, lines 73-79 (`.layout-2 .strait-title` block)
- **Evidence:** No element in `StraitMap.vue`, `StraitsInfographic.vue`, or `straits.vue` uses the class `strait-title`. The plan mentions it as a "region for the title overlay (top-left)" but the current implementation renders the title inside `StraitMap.vue` as `.map-title`, not as a separate grid-positioned element.
- **Agent:** code-simplicity-reviewer, architecture-strategist
- **Impact:** Low functional impact (dead code), but contributes to confusion about the intended grid architecture. The `.strait-title` rule implies a separate title element should exist outside the map container, but the actual implementation places the title inside it.

## Proposed Solutions

### Option 1: Remove `.strait-title` rule until Phase 2+ needs it
- **Pros:** No dead CSS; follows YAGNI principle; the rule can be added back when the title overlay is actually implemented as a separate grid child
- **Cons:** Requires re-adding when needed
- **Effort:** Small (delete 7 lines)
- **Risk:** None

### Option 2: Add a comment noting this is a forward-compatibility placeholder
- **Pros:** Documents intent without removing the rule; low effort
- **Cons:** Still dead CSS; comments can become stale
- **Effort:** Small
- **Risk:** None

### Option 3: Move the title outside StraitMap into a separate grid-positioned element
- **Pros:** Uses the CSS rule as intended; separates title from map for independent positioning
- **Cons:** More refactoring than needed for Phase 1 scope
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `public/styles.css`
- **Components:** `.layout-2` grid system
- **Related:** The `.layout-1` pattern only defines rules for classes that are actively used by `RenewablesInfographic.vue` children

## Acceptance Criteria

- [ ] Either `.strait-title` CSS rule is removed, or an element with that class exists in the straits page template
- [ ] No dead CSS rules in `.layout-2` block

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-04 | Identified during PR #13 code review | Forward-compatibility CSS should be deferred until the component that uses it is implemented |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/13
- File: `public/styles.css`, lines 66-80
