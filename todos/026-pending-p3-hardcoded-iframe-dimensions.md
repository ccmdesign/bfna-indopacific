---
status: pending
priority: p3
issue_id: "026"
tags: [code-review, ux, embed]
dependencies: []
---

# Hardcoded Iframe Dimensions (1280x800) Not Responsive

## Problem Statement

The generated embed code in `composables/useEmbedCode.ts` (line 25) uses fixed pixel dimensions `width="1280" height="800"`. Embedders with narrower containers will see horizontal scrollbars or overflow. There is no guidance or alternative for responsive embedding.

**Why it matters:** Modern embed patterns (YouTube, Vimeo, etc.) provide responsive embed options or at minimum document how to make the iframe responsive. The current output assumes the embedder has at least 1280px of horizontal space, which may not be true on tablets, blog sidebars, or CMS content areas.

## Findings

- **Location:** `composables/useEmbedCode.ts`, line 25
- **Evidence:** `width="1280" height="800"` are hardcoded in the iframe template literal.
- **Agent:** ux-reviewer, frontend-reviewer
- **Impact:** Low -- embedders can modify the code, but the default output may produce a poor initial experience.

## Proposed Solutions

### Option 1: Use percentage width with aspect ratio container in the generated snippet
- **Pros:** Responsive by default; industry standard pattern
- **Cons:** More complex embed code output (wrapper div + styles)
- **Effort:** Small
- **Risk:** None

### Option 2: Keep fixed dimensions but add a comment in the generated code
- **Pros:** Simplest change; guides embedders
- **Cons:** Still not responsive by default
- **Effort:** Small
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `composables/useEmbedCode.ts`
- **Components:** `useEmbedCode` composable
- **Database changes:** None

## Acceptance Criteria

- [ ] The generated embed code either uses responsive dimensions or documents how to make it responsive
- [ ] Existing embed routes still render correctly at their designed dimensions

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #11 code review | Fixed pixel dimensions are not ideal for embed snippets |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/11
