---
status: pending
priority: p3
issue_id: "095"
tags: [code-review, quality]
dependencies: []
---

# Large Binary and SVG Assets Committed to Git

## Problem Statement

This PR adds several large assets that inflate the repository permanently: `BlankMap-World-Equirectangular.svg` (7548 lines), `wrld-03.svg` (7260 lines), `world.topo.200404.3x21600x10800.jpg` (large raster), and multiple strait JPG images. These are source/reference assets that may not all be needed at runtime.

**Why it matters:** Large binary files in git history cannot be removed and slow clone/fetch for all contributors.

## Findings

- **Source:** `assets/images/BlankMap-World-Equirectangular.svg`, `assets/images/wrld-03.svg`, `assets/images/world.topo.*.jpg`, `public/assets/images/straits/*.jpg`
- **Evidence:** PR shows +7548 and +7260 line additions for SVG files alone

## Proposed Solutions

### Option A: Move reference assets to Git LFS or external storage
- Use Git LFS for large binaries, or store reference SVGs in a separate assets repo
- **Pros:** Keeps repo lean
- **Cons:** LFS setup overhead
- **Effort:** Medium
- **Risk:** Low

### Option B: Add to .gitignore if not needed at runtime
- If these are design reference files only, exclude them from the repo
- **Pros:** Immediate size reduction
- **Cons:** May lose reference material
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_(To be filled during triage)_

## Technical Details

- **Affected files:** `assets/images/` directory

## Acceptance Criteria

- [ ] Only runtime-required assets are in the git repository
- [ ] Reference/source assets are stored appropriately (LFS, external, or documented)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #23 code review | Multiple large assets added |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/23
