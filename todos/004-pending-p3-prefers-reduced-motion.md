---
status: pending
priority: p3
issue_id: "004"
tags: [code-review, accessibility, css, animation]
dependencies: []
---

# Add prefers-reduced-motion Support for Float Animation

## Problem Statement

The `@keyframes float` animation in `pages/index.vue` (lines 117-124) continuously animates the background planet image with a 6-second infinite ease-in-out cycle. This animation does not respect the `prefers-reduced-motion` media query, meaning users who have configured their OS to reduce motion will still see the animation.

**Why it matters:** WCAG 2.3.3 (Animation from Interactions) and user preference respect are important accessibility considerations. Users with vestibular disorders or motion sensitivity may experience discomfort from continuous animations. This is a pre-existing issue, not introduced by this PR.

## Findings

- **Location:** `pages/index.vue`, lines 114 (`.bg-image` with `animation: float 6s ease-in-out infinite`) and lines 117-124 (`@keyframes float`)
- **Evidence:** No `@media (prefers-reduced-motion: reduce)` query exists in the file or in global styles to disable or simplify this animation.
- **Agent:** accessibility-reviewer
- **Impact:** Low -- affects users with motion sensitivity preferences.

## Proposed Solutions

### Option 1: Add a prefers-reduced-motion media query to disable the animation
- **Pros:** Simple, follows accessibility best practices
- **Cons:** None
- **Effort:** Small (add ~5 lines of CSS)
- **Risk:** None

```css
@media (prefers-reduced-motion: reduce) {
  .bg-image {
    animation: none;
  }
}
```

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `pages/index.vue`
- **Components:** Scoped CSS animations
- **Database changes:** None

## Acceptance Criteria

- [ ] A `@media (prefers-reduced-motion: reduce)` rule disables or simplifies the float animation
- [ ] Users with "Reduce Motion" enabled in OS settings see a static background image

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #4 code review | Pre-existing issue, not introduced by migration |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/4
- [WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
