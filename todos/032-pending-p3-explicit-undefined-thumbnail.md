---
status: resolved
priority: p3
issue_id: "032"
tags: [code-review, typescript, quality, cleanup]
dependencies: []
---

# Explicit `thumbnail: undefined` in Static Data Array Is Unnecessary

## Problem Statement

In `pages/index.vue` (lines 26-41), the `infographics` static data array explicitly sets `thumbnail: undefined` for both entries. Since `thumbnail` is already an optional property in the `InfographicEntry` interface (`thumbnail?: string`), omitting the key entirely achieves the same result and is idiomatic TypeScript.

## Findings

- **Location:** `pages/index.vue` lines 32 and 38
- **Evidence:** Both infographic entries include `thumbnail: undefined`. The `InfographicEntry` interface (line 22) declares `thumbnail?: string`, meaning omission is equivalent.
- **Risk:** None -- purely cosmetic/idiom concern.

## Proposed Solutions

### Option A: Remove explicit `thumbnail: undefined` lines
- **Description:** Simply delete the `thumbnail: undefined` lines from both entries. The optional prop handles the absence correctly.
- **Pros:** Cleaner, idiomatic TypeScript; less visual noise.
- **Cons:** Loses the explicit signal that thumbnails are "planned but not yet available."
- **Effort:** Small
- **Risk:** None

### Option B: Replace with a `TODO` comment
- **Description:** Replace `thumbnail: undefined` with `// TODO: add thumbnail path (public/images/thumbnails/renewables.webp)` to signal intent while removing the unnecessary property.
- **Pros:** Documents the planned work; cleaner code.
- **Cons:** Adds a comment that could become stale.
- **Effort:** Small
- **Risk:** None

## Recommended Action

_To be determined during triage._

## Technical Details

- **Affected files:** `pages/index.vue`
- **Components:** Homepage hub page
- **Database changes:** None

## Acceptance Criteria

- [ ] `thumbnail: undefined` removed or replaced with a TODO comment
- [ ] No TypeScript compilation errors
- [ ] Card renders correctly with placeholder (no thumbnail)

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-03 | Created | Code review finding from PR #12 |
| 2026-03-03 | Resolved (Option A) | Removed `thumbnail: undefined` from both infographic entries in `pages/index.vue`. The optional `thumbnail?: string` interface handles absence correctly. |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/12
