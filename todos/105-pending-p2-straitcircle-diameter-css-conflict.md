---
status: resolved
priority: p2
issue_id: "BF-91"
tags: [code-review, architecture, css]
dependencies: []
---

# StraitCircle inline --diameter conflicts with parent CSS clamp sizing

## Problem Statement

The hero circle container is now sized by CSS `clamp(160px, 65vw, 288px)` with `aspect-ratio: 1`, but `StraitCircle.vue` independently sets its own dimensions via `width: var(--diameter)` / `height: var(--diameter)` where `--diameter` is `radius * 2` pixels. These two sizing mechanisms can conflict: the parent dictates a CSS-driven width, the ResizeObserver reads that width to compute `heroRadius`, and then StraitCircle sets a pixel-based diameter that may not exactly match the parent's resolved size due to sub-pixel rounding.

## Findings

- `StraitCircle.vue:24` sets `--diameter: ${radius * 2}px` and uses it for `width` and `height` (lines 49-50)
- `StraitMobileDetail.vue:239` sets parent `.hero-circle` to `width: clamp(160px, 65vw, 288px); aspect-ratio: 1`
- `heroRadius` is computed as `Math.round(entry.contentRect.width / 2)`, meaning `radius * 2` may differ from the container's actual CSS width by up to 1px
- On some viewports this could cause the circle to slightly overflow or underflow its container

## Proposed Solutions

### Option 1: Make StraitCircle fill its parent (100% width/height)

**Approach:** When used in the mobile detail hero context, set StraitCircle to `width: 100%; height: 100%` instead of using the `--diameter` custom property. The radius prop would only be used for the particle canvas `circle-size`.

**Pros:**
- Eliminates the dual-sizing conflict entirely
- CSS-only sizing, no rounding issues

**Cons:**
- Requires refactoring StraitCircle which is used in multiple contexts
- May need a new prop like `fill-parent`

**Effort:** 1-2 hours

**Risk:** Medium - touches shared component

---

### Option 2: Remove CSS clamp from parent, let StraitCircle control sizing

**Approach:** Remove `width: clamp(...)` from `.hero-circle` and let StraitCircle's `--diameter` be the source of truth. Compute the responsive radius entirely in JS.

**Pros:**
- Single source of truth for sizing
- Matches how StraitCircle works everywhere else

**Cons:**
- Loses the CSS-first responsive approach
- JS must handle all sizing

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `components/straits/StraitMobileDetail.vue:81,239-240` - parent container CSS
- `components/straits/StraitCircle.vue:24,49-50` - inline diameter sizing

## Resources

- **PR:** #28
- **Related issue:** BF-91

## Acceptance Criteria

- [ ] Circle renders at exactly the intended size with no overflow/underflow
- [ ] No sub-pixel gap or overflow visible on iPhone SE (320px) through tablet (768px)
- [ ] Single source of truth for circle dimensions

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified dual-sizing conflict between CSS clamp and JS --diameter
- Traced data flow: CSS clamp -> ResizeObserver -> heroRadius -> StraitCircle --diameter
- Confirmed Math.round can produce 1px mismatch

**Learnings:**
- StraitCircle was designed for map context where radius is the sole sizing authority
- Mobile detail context introduces a new CSS-first sizing paradigm that conflicts
