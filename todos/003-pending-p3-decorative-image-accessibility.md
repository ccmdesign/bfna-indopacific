---
status: resolved
priority: p3
issue_id: "003"
tags: [code-review, accessibility, html]
dependencies: []
---

# Decorative Background Image Should Use Empty Alt Text

## Problem Statement

The background planet image in `pages/index.vue` uses `alt="Planet Background"`, but the image is purely decorative (it serves as a visual background element with a floating animation). Screen readers will announce "Planet Background" unnecessarily, creating noise for assistive technology users.

**Why it matters:** WCAG 2.1 guideline 1.1.1 (Non-text Content) specifies that decorative images should use `alt=""` so assistive technology can ignore them. This is a pre-existing accessibility issue, not introduced by this PR, but it was carried over.

## Findings

- **Location:** `pages/index.vue`, line 23: `<img src="@/assets/images/background.png" alt="Planet Background" />`
- **Evidence:** The image is wrapped in a `.bg-image` div with `position: absolute`, `z-index: 0`, and a `float` animation. It is clearly decorative background art, not content.
- **Agent:** accessibility-reviewer
- **Impact:** Low -- minor accessibility improvement for screen reader users.

## Proposed Solutions

### Option 1: Change to empty alt and add role="presentation"
- **Pros:** Follows WCAG best practices, clean and explicit
- **Cons:** None
- **Effort:** Small (one-line change)
- **Risk:** None

```html
<img src="@/assets/images/background.png" alt="" role="presentation" />
```

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `pages/index.vue`
- **Components:** Template markup
- **Database changes:** None

## Acceptance Criteria

- [ ] Background image uses `alt=""` and `role="presentation"`
- [ ] Screen reader testing confirms the image is not announced

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #4 code review | Pre-existing issue, carried over during migration |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/4
- [WCAG 2.1 1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html)
