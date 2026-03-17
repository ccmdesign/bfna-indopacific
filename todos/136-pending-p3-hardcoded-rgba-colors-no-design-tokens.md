---
status: wont_fix
priority: p3
issue_id: "BF-110"
tags: [code-review, quality, design-system]
dependencies: []
---

# Mobile component styling replaces CSS custom properties with hardcoded rgba values

## Problem Statement

The StraitCard, StraitCardList, and StraitMobileDetail component changes replace `var(--color-text-primary)`, `var(--color-accent)`, `var(--color-card-bg)`, `var(--color-threat)`, etc. with hardcoded `rgba(255, 255, 255, ...)` and `hsl(...)` values. This undermines the design token system and makes future theming or dark/light mode changes require updating each component individually.

## Findings

- `StraitCard.vue:131-168` — replaced `var(--color-text-primary)`, `var(--color-accent)`, `var(--color-text-secondary)`, `var(--color-text-dim)` with hardcoded rgba values
- `StraitCardList.vue:193` — replaced color token with `rgba(255, 255, 255, 0.4)`
- `StraitMobileDetail.vue:231-382` — replaced `var(--color-text-primary)`, `var(--color-text-dim)`, `var(--color-threat)`, `var(--color-threat-bg)`, `var(--color-threat-border)` with hardcoded values
- The desktop panels (StraitQualPanel, StraitQuantPanel) may already use hardcoded values as the "Swiss/Bauhaus" style reference

## Proposed Solutions

### Option 1: Define new design tokens for the Swiss style

**Approach:** Create new CSS custom properties reflecting the Swiss/Bauhaus palette and use them in the mobile components.

**Pros:**
- Maintains single source of truth for colors
- Enables future theming

**Cons:**
- More CSS variables to manage
- May conflict with existing token definitions

**Effort:** Medium
**Risk:** Low

### Option 2: Accept hardcoded values for this visual style

**Approach:** This is a deliberate design decision for a specific visual language. Accept and document.

**Effort:** None
**Risk:** Low

## Technical Details

**Affected files:** `components/straits/StraitCard.vue`, `components/straits/StraitCardList.vue`, `components/straits/StraitMobileDetail.vue`

## Acceptance Criteria

- [ ] Decision on whether to maintain design tokens or accept hardcoded values for Swiss styling

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-11 | Created | Code review of PR #34 (BF-110) |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/34
