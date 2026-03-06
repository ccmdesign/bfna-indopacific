---
status: pending
priority: p3
issue_id: "054"
tags: [code-review, performance, BF-77]
dependencies: []
---

# Missing will-change hints for GSAP-animated properties

## Problem Statement

The GSAP transition animates `opacity`, `scale`, `x`, and `y` on SVG circle groups and the lens backdrop. Adding `will-change: opacity, transform` on `.strait-circle-group` and `.lens-backdrop` would hint browsers to promote these elements to compositor layers ahead of animation, reducing paint jank on lower-end devices.

## Findings

- **Source:** `components/StraitMap.vue` (CSS), `components/StraitLens.vue` (CSS)
- **Agent:** performance-oracle

## Proposed Solutions

### Option A: Add will-change to animated elements
- **Effort:** Small
- **Risk:** Low (over-promoting can increase memory; limited to 6 circles + 1 backdrop)

## Acceptance Criteria

- [ ] will-change applied to elements animated by GSAP

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #16 review | |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/16
