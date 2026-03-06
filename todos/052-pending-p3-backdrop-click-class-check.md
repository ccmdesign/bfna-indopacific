---
status: resolved
priority: p3
issue_id: "052"
tags: [code-review, quality, BF-77]
dependencies: []
---

# Backdrop click detection relies on class name instead of event target comparison

## Problem Statement

In `StraitLens.vue` line 93, backdrop click detection checks `(e.target as HTMLElement).classList.contains('lens-backdrop')`. This is fragile -- if the class name changes or scoped CSS hashing is applied differently, clicks outside content won't close the lens. The idiomatic pattern is `e.target === e.currentTarget`.

## Findings

- **Source:** `components/StraitLens.vue:92-96`
- **Agent:** quality-reviewer

## Proposed Solutions

### Option A: Use `e.target === e.currentTarget`
- **Effort:** Small
- **Risk:** Low

```ts
function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}
```

## Acceptance Criteria

- [ ] Clicking the backdrop closes the lens regardless of CSS class naming

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #16 review | |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/16
