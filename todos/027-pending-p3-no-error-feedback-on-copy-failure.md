---
status: pending
priority: p3
issue_id: "027"
tags: [code-review, ux, accessibility]
dependencies: ["024"]
---

# No Visual Error Feedback When Clipboard Copy Fails

## Problem Statement

When `navigator.clipboard.writeText()` fails in `composables/useEmbedCode.ts` (line 39), the `catch` block silently sets `copied.value = false` and returns `false`. The `EmbedCodeButton.vue` component only has two visual states: default ("Copy Embed Code") and success ("Copied!"). There is no error state to inform the user that the copy operation failed.

**Why it matters:** Users who click the button and see no change may assume the feature is broken or repeatedly click it. An explicit error state (e.g., "Copy failed") improves usability and accessibility.

## Findings

- **Location:** `composables/useEmbedCode.ts` lines 39-41, `components/EmbedCodeButton.vue` line 17
- **Evidence:** The catch block returns `false` but no `error` ref is exposed. The button template has no third state.
- **Agent:** ux-reviewer, accessibility-reviewer
- **Impact:** Low -- edge case, but poor UX when it occurs.

## Proposed Solutions

### Option 1: Add an `error` ref to the composable and a third button state
- **Pros:** Complete user feedback; accessible
- **Cons:** Minor additional complexity
- **Effort:** Small
- **Risk:** None

### Option 2: Show a browser alert on failure as a simple fallback
- **Pros:** Zero component changes
- **Cons:** Alerts are disruptive and poor UX
- **Effort:** Small
- **Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `composables/useEmbedCode.ts`, `components/EmbedCodeButton.vue`
- **Components:** `useEmbedCode` composable, `EmbedCodeButton` component
- **Database changes:** None

## Acceptance Criteria

- [ ] The user sees visual feedback when clipboard copy fails
- [ ] The `aria-live` region announces the error to screen readers
- [ ] The error state clears after a timeout or next attempt

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #11 code review | Silent failures should always have user-facing feedback |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/11
- Related: todo 024 (Clipboard API availability guard)
