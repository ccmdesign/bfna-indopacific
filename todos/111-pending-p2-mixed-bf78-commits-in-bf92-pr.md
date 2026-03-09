---
status: pending
priority: p2
issue_id: "111"
tags: [code-review, architecture, git-hygiene]
dependencies: []
---

# Mixed BF-78 Commits in BF-92 PR

## Problem Statement
PR #29 (BF-92: detail page quantitative section) includes 3 commits from BF-78 (particle system work) alongside 3 BF-92 commits. The particle system commits modify `pages/test/hormuz/index.vue` (219 additions, 96 deletions) and `data/straits/hormuz-polygon.json`, which are unrelated to the stated PR goal of "detail page quantitative section polish."

**Why it matters:** Mixing unrelated changes makes code review harder, complicates git bisect, and conflates two separate feature tracks. If a bug is introduced in either feature, the revert scope is unnecessarily large.

## Findings
- **Commits from BF-78 (unrelated):**
  - `a8679f6` — feat(particles): wait-then-launch spawn, edge-aware targeting
  - `0e937de` — feat(particles): exit-point targeting, radius grow-in, circle mask
  - `50a842c` — feat(particles): progressive spawn, per-waypoint speed, spawn zones
- **Commits from BF-92 (on-topic):**
  - `54df5ef` — docs(plan): Planning artifacts
  - `79d2716` — docs(deepen-plan): Plan Deepening artifacts
  - `6affe84` — feat(straits): responsive chart sizing, global share metric
- 6 files changed total, but only 3 files are relevant to BF-92

## Proposed Solutions

### Option A: Accept as-is with note
- Merge PR as-is, note the mixed commits for future reference
- **Pros:** No rework needed
- **Cons:** Sets precedent for mixed PRs
- **Effort:** None
- **Risk:** Low (BF-78 changes are to dev-only test page)

### Option B: Split into two PRs
- Cherry-pick BF-78 commits to a separate branch/PR
- **Pros:** Clean git history, independent review tracks
- **Cons:** Rework effort, potential merge conflicts
- **Effort:** Medium
- **Risk:** Low

## Recommended Action
<!-- Filled during triage -->

## Technical Details
- **Affected files:** `pages/test/hormuz/index.vue`, `data/straits/hormuz-polygon.json`
- **Components:** Particle test page (dev-only)

## Acceptance Criteria
- [ ] BF-92 changes are reviewable independently of BF-78 particle work
- [ ] Git history clearly separates the two feature tracks

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Created from PR #29 code review | 3/6 commits are BF-78 particle work |

## Resources
- PR: https://github.com/ccmdesign/bfna-indopacific/pull/29
- Linear: BF-92, BF-78
