---
status: pending
priority: p2
issue_id: "030"
tags: [code-review, css, duplication, maintainability]
dependencies: []
---

# Duplicated Button Styles Between InfographicCard.vue and EmbedCodeButton.vue

## Problem Statement

The `.view-link` styles in `InfographicCard.vue` (lines 105-126) are nearly identical to the `.embed-code-button` styles in `EmbedCodeButton.vue` (lines 46-68). Both share the same font-family, font-size, font-weight, padding, border, border-radius, background, color, hover states, and focus-visible styles. This creates a maintenance burden where button style changes must be synchronized across two files.

## Findings

- **Location:** `components/InfographicCard.vue` lines 105-126, `components/EmbedCodeButton.vue` lines 46-68
- **Evidence:** Both define identical visual properties:
  - `font-family: 'Encode Sans', sans-serif`
  - `font-size: 0.875rem`
  - `font-weight: 600`
  - `padding: 0.5rem 1.25rem`
  - `border: 1px solid rgba(255, 255, 255, 0.2)`
  - `border-radius: 0.375rem`
  - `background: rgba(255, 255, 255, 0.08)`
  - `color: rgba(255, 255, 255, 0.85)`
  - Identical hover and focus-visible states
- **Risk:** Style drift when one is updated but not the other. Known pattern from existing todo `028-pending-p3-visually-hidden-css-duplication.md`.

## Proposed Solutions

### Option A: Extract shared button class to `public/styles.css`
- **Description:** Create a `.btn-secondary` (or similar) utility class in `public/styles.css` that both components use. Remove duplicated scoped styles.
- **Pros:** Single source of truth; easy to maintain; follows existing pattern of global styles in `public/styles.css`.
- **Cons:** Moves from scoped to global styles; requires coordinated change across components.
- **Effort:** Small
- **Risk:** Low

### Option B: Create a shared CSS file imported by both components
- **Description:** Create `assets/styles/buttons.css` and import it in both components' `<style>` blocks.
- **Pros:** Keeps styles associated with components; avoids global namespace.
- **Cons:** Adds a new file; Vue scoped styles may need adjustment.
- **Effort:** Small
- **Risk:** Low

### Option C: Accept duplication with a synchronization comment
- **Description:** Add comments in both files referencing the other, similar to the gradient duplication comment pattern used in `default.vue` and `embed.vue`.
- **Pros:** No code changes needed; documents the relationship.
- **Cons:** Comments can become stale; does not prevent drift.
- **Effort:** Small
- **Risk:** Medium (drift risk remains)

## Recommended Action

_To be determined during triage._

## Technical Details

- **Affected files:** `components/InfographicCard.vue`, `components/EmbedCodeButton.vue`, potentially `public/styles.css`
- **Components:** InfographicCard, EmbedCodeButton
- **Database changes:** None

## Acceptance Criteria

- [ ] Button styles are defined in a single location
- [ ] Both the view link and embed button render identically before and after refactor
- [ ] Hover and focus-visible states work correctly on both elements

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-03 | Created | Code review finding from PR #12 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/12
- Related: `todos/028-pending-p3-visually-hidden-css-duplication.md` (similar pattern)
