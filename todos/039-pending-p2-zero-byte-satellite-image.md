---
status: resolved
priority: p2
issue_id: "039"
tags: [code-review, performance, asset]
dependencies: []
---

# Zero-Byte Satellite Background Image

## Problem Statement

The satellite map background image `public/assets/map-indo-pacific-2x.webp` is **0 bytes** (an empty placeholder). The entire StraitMap visualization depends on this image to provide geographic context for the proportional circles. Without it, users see only the dark fallback background (`#0a1628`) with floating circles that have no spatial meaning.

This undermines the core value of the visualization: communicating strait locations geographically.

## Findings

- **File:** `public/assets/map-indo-pacific-2x.webp` — 0 bytes
- **Referenced in:** `components/StraitMap.vue` line 89, `composables/useStraitsHead.ts` line 19
- The `useStraitsHead` composable issues a `<link rel="preload">` for this 0-byte file, wasting a preload slot
- The plan specifies an LCP budget of 500KB for this image, implying a real asset was expected

## Proposed Solutions

### Option A: Ship the real satellite WebP image
- **Pros:** Feature works as intended; geographic context is immediate
- **Cons:** Adds asset weight (target ~300-500KB); must be sourced/licensed
- **Effort:** Small (if asset exists) / Medium (if needs creation)
- **Risk:** Low

### Option B: Add a visible placeholder with "image pending" indicator
- **Pros:** Makes it obvious the feature is incomplete; prevents confusion
- **Cons:** Still not the final experience
- **Effort:** Small
- **Risk:** Low

## Recommended Action



## Technical Details

- **Affected files:** `public/assets/map-indo-pacific-2x.webp`, `components/StraitMap.vue`, `composables/useStraitsHead.ts`
- **Components:** StraitMap, StraitsInfographic

## Acceptance Criteria

- [ ] The satellite image file has non-zero content and renders in the browser
- [ ] Circles are visually positioned over geographic strait locations
- [ ] Image file size is under 500KB (per plan's LCP budget)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during PR #14 code review | Image was committed as 0-byte placeholder |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/14
- Plan: `docs/plans/2026-03-05-feat-overview-map-proportional-circles-plan.md`
