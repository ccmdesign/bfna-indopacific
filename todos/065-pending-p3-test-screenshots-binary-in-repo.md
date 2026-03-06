---
status: wont_fix
priority: p3
issue_id: "065"
tags: [code-review, quality, repo-hygiene]
dependencies: []
---

# Test Screenshot PNGs Modified in PR Diff

## Problem Statement

The PR diff includes modifications to 4 binary PNG files in `test-screenshots/`:
- `test-screenshots/straits-lens-01-initial.png`
- `test-screenshots/straits-lens-02-after-click.png`
- `test-screenshots/straits-lens-03-final.png`
- `test-screenshots/straits-lens-04-escape-verify.png`

These screenshots reference the "lens" feature that was reverted and whose component (`StraitLens.vue`) is deleted in this PR. The screenshots are now stale artifacts from the reverted BF-77 implementation and should be removed or replaced with screenshots of the new circle design.

**Why it matters:** Stale test screenshots from a reverted feature add confusion and bloat the repository with irrelevant binary files.

## Findings

- **Location:** `test-screenshots/straits-lens-*.png`
- **Evidence:** File names reference "lens" feature; `StraitLens.vue` is deleted in this PR
- **Agent:** quality-reviewer
- **Impact:** Minor repo hygiene issue; stale artifacts from reverted feature

## Proposed Solutions

### Option 1: Delete the stale lens screenshots
- **Pros:** Removes confusion; reduces repo size
- **Cons:** None
- **Effort:** Trivial
- **Risk:** None

### Option 2: Replace with new screenshots of the redesigned circles
- **Pros:** Provides visual documentation of the new design
- **Cons:** Requires capturing new screenshots
- **Effort:** Small
- **Risk:** None

## Technical Details

- **Affected files:** `test-screenshots/straits-lens-*.png` (4 files)

## Acceptance Criteria

- [ ] Stale lens screenshots are removed or replaced

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #19 code review | Binary artifacts from reverted feature remain in tree |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/19
