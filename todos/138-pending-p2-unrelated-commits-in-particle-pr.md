---
status: wont_fix
priority: p2
issue_id: "BF-110"
tags: [code-review, process]
dependencies: []
---

# PR includes unrelated commits (mobile styling, CSS fix) alongside particle engine changes

## Problem Statement

PR #34 titled "feat(particles): stuck fade-out & edge dock fade (BF-110)" includes three commits unrelated to particle engine changes:
1. `f00b877` — "design: apply Swiss/Bauhaus desktop styling to mobile index and detail" (StraitCard, StraitCardList, StraitMobileDetail)
2. `0d0f6b6` — "fix: make map-inner absolute so it doesn't prevent container from shrinking on resize" (StraitMap.vue)
3. Plan documentation commits (acceptable as compound-engineering artifacts)

Mixing unrelated UI styling changes with particle engine changes makes it harder to revert either change independently and complicates git bisect if a visual regression is introduced.

## Findings

- 4 of 7 changed files are unrelated to the PR's stated purpose (particle fade-out)
- The mobile styling changes (StraitCard, StraitCardList, StraitMobileDetail) are substantial: 113 additions, 88 deletions
- The particle engine changes (particleEngine.ts, useParticleFlow.ts) are the core: 59 additions, 21 deletions

## Proposed Solutions

### Option 1: Split into separate PRs

**Approach:** Create a separate PR for the mobile Swiss/Bauhaus styling and the map-inner CSS fix.

**Pros:**
- Clean git history, independent revertability
- Each PR can be reviewed on its own merits

**Cons:**
- Requires rebasing and cherry-picking

**Effort:** Medium
**Risk:** Low

### Option 2: Accept as-is, note in PR description

**Approach:** Add a note to the PR that it bundles styling changes with particle changes.

**Effort:** Small
**Risk:** Low

## Technical Details

**Affected files:** All 7 files in the PR

## Acceptance Criteria

- [ ] Decide whether to split or accept bundled PR

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-11 | Created | Code review of PR #34 (BF-110) |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/34
