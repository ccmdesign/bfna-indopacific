---
status: resolved
priority: p3
issue_id: "057"
tags: [code-review, vue, quality, BF-84]
dependencies: []
---

# Import statement placed after useHead() in embeds.vue

## Problem Statement

In `pages/test/embeds.vue`, the `import { infographics }` statement appears at line 20, after the `useHead()` call (lines 8-18). Convention dictates imports should be at the top of `<script setup>`. While this works in Vue/Nuxt (imports are hoisted by the JS engine), it breaks reading order and could confuse contributors.

## Findings

- **Source:** Quality review of PR #17
- **Location:** `pages/test/embeds.vue:20`
- **Evidence:** The `import` is placed between `useHead()` and the `useEmbedCode` mapping block.

## Proposed Solutions

### Option A: Move import to top of script setup
Move `import { infographics } from '~/data/infographics'` to line 2 (after `<script setup lang="ts">`).

- **Pros:** Follows convention, improves readability
- **Cons:** Trivial change
- **Effort:** Small
- **Risk:** None

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected files:** `pages/test/embeds.vue`

## Acceptance Criteria

- [ ] Import statement is at the top of `<script setup>` block

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #17 code review | JS import hoisting means placement doesn't affect runtime, only readability |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/17
