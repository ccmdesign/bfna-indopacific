---
status: resolved
priority: p2
issue_id: "007"
tags: [code-review, quality, css, maintainability]
dependencies: []
---

# Empty span element used as flex spacer in footer

## Problem Statement

In `layouts/default.vue`, when no `footerSource` is provided by a page, an empty `<span v-else></span>` is rendered to act as a flex spacer keeping the BFNA logo right-aligned. This is a fragile pattern: the visual correctness of the footer depends on an invisible, semantically meaningless element. If a developer removes or restructures the footer without understanding this hidden dependency, the logo alignment breaks.

**Why it matters:** As new pages are added (some may not have a source attribution), the footer needs to degrade gracefully. A CSS-only approach is self-documenting and does not depend on conditional DOM elements.

## Findings

- **Location:** `layouts/default.vue`, line 27 (`<span v-else></span>`)
- **Evidence:** The footer uses `display: flex; justify-content: space-between`. When the `<a>` is hidden (no `footerSource`), the `<span v-else>` serves as the left-side flex item so `space-between` pushes the logo right. Without it, the logo would be left-aligned.
- **Agent:** code-simplicity-reviewer
- **Impact:** Low functional impact currently, but reduces maintainability.

## Proposed Solutions

### Option 1: Replace `v-if/v-else` with CSS `margin-left: auto` on the logo
- **Pros:** Self-documenting, no invisible DOM elements, works regardless of whether the source link exists
- **Cons:** Slight CSS change
- **Effort:** Small (remove `<span v-else>`, add `margin-left: auto` to `.bfna-logo-footer`)
- **Risk:** None -- visually identical result

### Option 2: Keep current pattern but add an HTML comment explaining purpose
- **Pros:** No code change, documents intent
- **Cons:** Still relies on invisible DOM element, comments can go stale
- **Effort:** Trivial
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `layouts/default.vue`
- **Components:** Footer section of layout
- **Database changes:** None

## Acceptance Criteria

- [ ] Footer BFNA logo remains right-aligned when `footerSource` is absent
- [ ] Footer BFNA logo remains right-aligned when `footerSource` is present
- [ ] No invisible/empty DOM elements used for layout purposes
- [ ] Visual regression check passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #6 code review | Empty elements as flex spacers are a maintainability anti-pattern |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/6
- File: `layouts/default.vue` line 27
