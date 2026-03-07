---
status: wont_fix
priority: p2
issue_id: "068"
tags: [code-review, quality, assets]
dependencies: []
---

# Placeholder Satellite Images Should Be Replaced Before Production

## Problem Statement

The PR includes 6 satellite images in `public/assets/straits/` that are described as "placeholder satellite images for development (to be replaced with real satellite crops)" in the PR description. All six files are suspiciously similar in size (~54-55KB each), suggesting they may be generic/synthetic placeholders rather than actual satellite imagery. Shipping placeholder assets to production degrades the visual quality of the feature.

## Findings

- **Source:** `public/assets/straits/*.webp` - 6 files, all between 54,418 and 55,123 bytes
- **Source:** PR description explicitly states "Includes placeholder satellite images for development (to be replaced with real satellite crops)"
- **Evidence:** File sizes within 1.3% of each other suggest identical or near-identical content

## Proposed Solutions

### Option A: Block merge until real images are provided
- **Pros:** Ensures production quality from day one
- **Cons:** Blocks the entire feature on asset availability
- **Effort:** Depends on image sourcing
- **Risk:** Low

### Option B: Merge with placeholder images, track replacement as follow-up
- **Pros:** Unblocks feature development; shader code can be validated
- **Cons:** Placeholder images may reach production
- **Effort:** Small (just create follow-up task)
- **Risk:** Medium

## Recommended Action

_To be filled during triage._

## Technical Details

- **Affected files:** `public/assets/straits/bab-el-mandeb.webp`, `hormuz.webp`, `lombok.webp`, `luzon.webp`, `malacca.webp`, `taiwan.webp`

## Acceptance Criteria

- [ ] Each strait has a unique, high-quality satellite image crop
- [ ] Images are appropriately sized for the circle display (not oversized)
- [ ] WebP format with reasonable compression

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Identified during PR #20 code review | PR description confirms these are placeholders |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/20
