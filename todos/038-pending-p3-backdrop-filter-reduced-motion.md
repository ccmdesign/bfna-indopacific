---
status: pending
priority: p3
issue_id: "038"
tags: [code-review, accessibility, performance, css]
dependencies: []
---

# `backdrop-filter: blur()` Without `prefers-reduced-motion` Guard

## Problem Statement

`StraitMap.vue` applies `backdrop-filter: blur(8px)` to `.strait-item` cards. While not an animation, `backdrop-filter` is a GPU-intensive effect that can cause jank on low-end devices and may be visually uncomfortable for users with vestibular disorders. The project already uses `@media (prefers-reduced-motion: reduce)` guards in `public/styles.css` for button transitions and in `RenewablesInfographic.vue` for the float animation, but this new blur effect has no such guard.

**Why it matters:** Consistency with the project's existing accessibility pattern. The `backdrop-filter` is a visual enhancement, not essential to functionality. Removing it under `prefers-reduced-motion` is a low-effort improvement that aligns with the project's existing accessibility practices.

## Findings

- **Location:** `/components/StraitMap.vue`, line 59 (`backdrop-filter: blur(8px)`)
- **Evidence:** No `@media (prefers-reduced-motion: reduce)` rule in StraitMap.vue's scoped styles. The project has this media query in `public/styles.css` (line 210) and `RenewablesInfographic.vue` (line 44).
- **Agent:** accessibility-reviewer, performance-oracle
- **Impact:** Minor. Affects users on low-end mobile devices and users with motion sensitivity preferences.

## Proposed Solutions

### Option 1: Add reduced-motion media query to disable blur
- **Pros:** Consistent with project pattern; improves performance on low-end devices; respects user preferences
- **Cons:** Cards lose glassmorphism effect for reduced-motion users (still functional)
- **Effort:** Small (add 5 lines of CSS)
- **Risk:** None

```css
@media (prefers-reduced-motion: reduce) {
  .strait-item {
    backdrop-filter: none;
  }
}
```

### Option 2: Leave as-is
- **Pros:** No change needed
- **Cons:** Inconsistent with project accessibility patterns
- **Effort:** None
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `components/StraitMap.vue`
- **Line:** 59

## Acceptance Criteria

- [ ] `backdrop-filter: blur()` has a `prefers-reduced-motion` fallback, or a deliberate decision is documented to omit it

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-04 | Identified during PR #13 code review | backdrop-filter is GPU-intensive and should follow the same reduced-motion pattern as animations |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/13
- File: `components/StraitMap.vue`
- Reference: [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
