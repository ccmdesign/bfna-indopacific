---
status: pending
priority: p3
issue_id: "011"
tags: [code-review, quality, css, architecture, BF-70]
dependencies: []
---

# CSS Duplication Drift Risk Between default.vue and embed.vue

## Problem Statement

The `layouts/embed.vue` duplicates ~40 lines of background gradient CSS from `layouts/default.vue` (the `.page-wrapper`, `::before`, and `::after` rules). This was a conscious design decision documented in the plan, choosing duplication over extraction for simplicity. However, there is no mechanism (lint rule, comment, or test) to detect when these two copies drift apart unintentionally.

**Why it matters:** If a future developer updates the gradient colors, pseudo-element overlays, or responsive breakpoints in one layout but not the other, the infographic pages and embed pages will have visually different backgrounds. Since the whole point of the embed layout is to provide "the same immersive background experience," silent drift would undermine this goal.

## Findings

- **Location:** `layouts/embed.vue` lines 15-51 (scoped styles); `layouts/default.vue` lines 47-84 (scoped styles)
- **Evidence:** Side-by-side comparison shows the two style blocks are identical except that `default.vue` includes `padding-bottom: 4rem` (for the footer). The shared portion covers `.page-wrapper` background, `::before` radial gradient overlay, `::after` dark gradient overlay, and the responsive media query.
- **Agent:** architecture-strategist, code-simplicity-reviewer
- **Impact:** No current issue, but creates a maintenance risk for visual inconsistency over time.

## Proposed Solutions

### Option 1: Add a code comment linking the two files
- **Pros:** Zero-effort reminder for developers; makes the duplication intentional and visible
- **Cons:** Comments can be ignored; no automated enforcement
- **Effort:** Small (add 2 comments, one in each file)
- **Risk:** None
- **Example:** `/* NOTE: Background styles are intentionally duplicated in layouts/embed.vue. Update both files when changing the gradient. See BF-70 plan for rationale. */`

### Option 2: Extract shared styles into `assets/layout-base.css`
- **Pros:** DRY; single source of truth; eliminates drift risk entirely
- **Cons:** Adds indirection; the plan explicitly chose against this; two layouts may diverge intentionally in the future
- **Effort:** Medium (create new file, update both layouts to import)
- **Risk:** Low -- Vue SFC scoped `@import` works but generates separate scoping hashes per layout

### Option 3: Accept as-is, revisit if a third layout is added
- **Pros:** No code change; YAGNI principle
- **Cons:** Drift may go unnoticed
- **Effort:** None
- **Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `layouts/embed.vue`, `layouts/default.vue`
- **Components:** Layout scoped styles
- **Database changes:** None

## Acceptance Criteria

- [ ] Either (a) both layout files contain a cross-reference comment, or (b) shared styles are extracted, or (c) decision to accept risk is documented

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #7 code review | Plan chose duplication over extraction for ~40 lines of CSS; no drift detection mechanism exists |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/7
- Files: `layouts/embed.vue` (lines 15-51), `layouts/default.vue` (lines 47-84)
- Plan rationale: `docs/plans/2026-03-03-feat-create-embed-layout-plan.md`, Part 2: Handle CSS duplication
