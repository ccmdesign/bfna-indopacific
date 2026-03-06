---
status: pending
priority: p3
issue_id: "059"
tags: [code-review, quality, BF-84]
dependencies: []
---

# Comment references internal "review finding #040" in embeds.vue

## Problem Statement

The comment at `pages/test/embeds.vue:31` says "See review finding #040". This references an internal todo file (`todos/040-pending-p2-double-useembedcode-invocation.md`), not a standard code reference. Future contributors unfamiliar with the todos directory may find this confusing.

## Findings

- **Source:** Quality review of PR #17
- **Location:** `pages/test/embeds.vue:31`
- **Evidence:** `// grows.  See review finding #040.`

## Proposed Solutions

### Option A: Replace with a self-contained comment
Change to something like: `// grows. Known duplication -- each embed invokes useEmbedCode twice (here and inside EmbedCodeButton).`

- **Pros:** Self-documenting, no external reference needed
- **Cons:** Slightly longer comment
- **Effort:** Small
- **Risk:** None

### Option B: Accept as-is
The comment provides a trail to the todo file for those who know the convention.

- **Effort:** None
- **Risk:** None

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected files:** `pages/test/embeds.vue`

## Acceptance Criteria

- [ ] Code comments are self-contained or reference standard identifiers (issue numbers, not internal todo IDs)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #17 code review | Internal todo references in code comments may confuse contributors |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/17
