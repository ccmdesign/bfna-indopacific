---
status: pending
priority: p3
issue_id: "036"
tags: [code-review, quality, css, design-system]
dependencies: []
---

# Hardcoded Color Values Instead of CSS Custom Properties

## Problem Statement

`StraitMap.vue` uses several hardcoded color values in its scoped styles rather than CSS custom properties or design tokens: `rgba(2, 38, 64, 0.95)` (card background), `rgba(255, 255, 255, 0.15)` (card border), `rgba(255, 255, 255, 0.6)` (meta text), `hsl(218, 60%, 58%)` (value highlight), and `rgba(0, 0, 0, 0.3)` (box shadow). The project already uses custom properties for spacing (`--space-*`) and typography (`--size-*`) but has no color tokens.

**Why it matters:** As more infographic pages are added, maintaining visual consistency across components becomes harder with hardcoded values. The `hsl(218, 60%, 58%)` highlight color, for example, is unique to this component and has no counterpart in the existing codebase. This is a systemic issue rather than a bug -- the project currently has no color token system.

## Findings

- **Location:** `/components/StraitMap.vue`, scoped styles (lines 58, 60, 77, 82)
- **Evidence:** Colors are literals, not variables. The existing `default.vue` layout also uses hardcoded colors (e.g., `#0D0D0D`, `#022640`, `rgba(0, 0, 0, 0.2)`), so this is a project-wide pattern, not specific to this PR.
- **Agent:** architecture-strategist
- **Impact:** Low immediate impact. Becomes a maintenance burden as more components are added. Not blocking for Phase 1.

## Proposed Solutions

### Option 1: Define color tokens in `:root` and reference them
- **Pros:** Consistent theming; easier to update colors globally; supports future dark/light mode
- **Cons:** Requires project-wide decision on color token naming; scope exceeds this PR
- **Effort:** Medium (define tokens + update all components)
- **Risk:** Low

### Option 2: Leave as-is for Phase 1, track as tech debt
- **Pros:** No scope creep; addresses when the design system matures
- **Cons:** Drift accumulates with each new component
- **Effort:** None now
- **Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `components/StraitMap.vue` (scoped styles)
- **Project-wide:** `default.vue`, `embed.vue`, `RenewablesInfographic.vue` all use hardcoded colors too

## Acceptance Criteria

- [ ] Either color tokens are defined and used, or this is tracked as a design-system initiative

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-04 | Identified during PR #13 code review | Project lacks a color token system; this is systemic, not PR-specific |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/13
- File: `components/StraitMap.vue`
