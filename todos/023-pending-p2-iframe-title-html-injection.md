---
status: pending
priority: p2
issue_id: "023"
tags: [code-review, security, composable]
dependencies: []
---

# Iframe Title Attribute: Unescaped HTML Interpolation

## Problem Statement

In `composables/useEmbedCode.ts` (line 25), the `title` parameter is interpolated directly into the iframe HTML string using a template literal without HTML-entity escaping. A title containing a double-quote (`"`) would break the generated `<iframe>` tag and could produce malformed HTML in the embedder's page.

**Why it matters:** Although `title` values are currently developer-controlled strings set in `definePageMeta`, this is a latent injection vector. If a future infographic's title contains a `"` character (e.g., `"Strait of Malacca"`) or if the composable is ever reused with dynamic input, the embed code output becomes broken or exploitable HTML.

## Findings

- **Location:** `composables/useEmbedCode.ts`, line 25
- **Evidence:** The template literal `title="${title}"` directly interpolates the raw string with no escaping of `"`, `<`, `>`, or `&` characters.
- **Agent:** security-reviewer, code-quality-reviewer
- **Impact:** Medium -- currently safe because titles are hardcoded, but violates defense-in-depth. Any title with special HTML characters will produce malformed embed code.

## Proposed Solutions

### Option 1: Escape HTML-special characters in the title before interpolation
- **Pros:** Simple, complete fix; no external dependency; preserves current API
- **Cons:** Adds ~5 lines of escaping utility code
- **Effort:** Small
- **Risk:** None

```typescript
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const embedCode = computed(() =>
  `<iframe src="${embedUrl.value}" width="1280" height="800" style="border:0" loading="lazy" allowfullscreen title="${escapeHtml(title)}"></iframe>`
)
```

### Option 2: Use DOM APIs to construct the iframe element
- **Pros:** Automatically handles escaping; more robust
- **Cons:** Only works client-side; heavier approach for a simple string
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `composables/useEmbedCode.ts`
- **Components:** `useEmbedCode` composable, `EmbedCodeButton.vue` (consumer)
- **Database changes:** None

## Acceptance Criteria

- [ ] A title containing `"`, `<`, `>`, or `&` does not produce malformed HTML output
- [ ] Existing titles render correctly in the generated embed code
- [ ] Unit test or manual verification with edge-case title values

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #11 code review | Template literal HTML generation needs escaping even for "trusted" inputs |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/11
- File: `composables/useEmbedCode.ts`, line 25
