---
status: pending
priority: p2
issue_id: "024"
tags: [code-review, reliability, browser-compat]
dependencies: []
---

# Missing Clipboard API Availability Guard

## Problem Statement

In `composables/useEmbedCode.ts` (line 32), `navigator.clipboard.writeText()` is called without first checking whether `navigator.clipboard` is defined. The Clipboard API is unavailable in non-secure (HTTP) contexts, some WebViews, and older browsers. While the `try/catch` prevents a runtime crash, the user receives no visible feedback that the copy failed -- the button simply does nothing.

**Why it matters:** On Netlify deploy previews served over HTTPS this works, but if the site is ever accessed via HTTP (e.g., local dev without HTTPS, certain corporate proxies), the button silently fails. Users will click "Copy Embed Code" and have no idea it did not work.

## Findings

- **Location:** `composables/useEmbedCode.ts`, lines 30-43
- **Evidence:** The `catch` block sets `copied.value = false` and returns `false`, but no error state is surfaced to the UI. `EmbedCodeButton.vue` only toggles between "Copy Embed Code" and "Copied!" -- there is no error/unsupported state.
- **Agent:** reliability-reviewer, ux-reviewer
- **Impact:** Medium -- silent failure on unsupported browsers/contexts with no user feedback.

## Proposed Solutions

### Option 1: Add an `error` ref and surface it in the button UI
- **Pros:** Users see feedback when copy fails (e.g., "Copy failed -- select and copy manually"); complete fix
- **Cons:** Adds a third button state; minor UI complexity
- **Effort:** Small
- **Risk:** None

### Option 2: Add a pre-check guard with `navigator.clipboard` availability
- **Pros:** Can disable the button entirely when clipboard is unavailable; cleaner UX
- **Cons:** Does not handle cases where clipboard exists but permission is denied
- **Effort:** Small
- **Risk:** Low

### Option 3: Fallback to `document.execCommand('copy')` with a hidden textarea
- **Pros:** Broadest browser support
- **Cons:** `execCommand` is deprecated; more code; harder to maintain
- **Effort:** Medium
- **Risk:** Low -- deprecated but still widely supported

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `composables/useEmbedCode.ts`, `components/EmbedCodeButton.vue`
- **Components:** `useEmbedCode` composable, `EmbedCodeButton` component
- **Database changes:** None

## Acceptance Criteria

- [ ] The user sees meaningful feedback when clipboard copy fails
- [ ] The button either shows an error state or is disabled/hidden when the Clipboard API is unavailable
- [ ] Safari, Chrome, and Firefox all show correct feedback

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #11 code review | Clipboard API requires secure context; silent failure is poor UX |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/11
- MDN Clipboard API: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
- File: `composables/useEmbedCode.ts`, lines 30-43
