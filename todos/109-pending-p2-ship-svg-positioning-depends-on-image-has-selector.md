---
status: resolved
priority: p2
issue_id: "BF-101"
tags: [code-review, correctness, css]
dependencies: []
---

# Ship SVG absolute positioning and clipping depend on image :has() selector

## Problem Statement

The `.strait-circle__ships` SVG overlay uses `position: absolute` and relies on its parent `.strait-circle` having `position: relative` and `overflow: hidden` for correct positioning and circular clipping. However, these properties are only applied via `.strait-circle:has(.strait-circle__image)` — they activate when the satellite image is present.

Currently this works because `showShips` and `imageUrl` are both gated on `selected` in `StraitData.vue`, so they always appear together. But this implicit coupling is fragile: if ships were ever shown without an image (e.g., during image loading or for a strait without a satellite image), the SVG would not be positioned correctly and would overflow the circle boundary.

## Findings

- `StraitCircle.vue:116-119` — `position: relative` and `overflow: hidden` only applied via `:has(.strait-circle__image)`
- `StraitCircle.vue:125-131` — `.strait-circle__ships` uses `position: absolute; inset: 0` requiring a positioned parent
- `StraitData.vue:56-59` — both `imageUrl` and `showShips` gated on `selected`, creating implicit coupling
- Without the image, ships SVG would position against next positioned ancestor, not the circle

## Proposed Solutions

### Option 1: Broaden the :has() selector to include ships

**Approach:** Change `.strait-circle:has(.strait-circle__image)` to `.strait-circle:has(.strait-circle__image, .strait-circle__ships)`.

**Pros:**
- Ships work correctly with or without image
- Minimal CSS change

**Cons:**
- None

**Effort:** 5 minutes

**Risk:** Low

---

### Option 2: Always apply position:relative and overflow:hidden

**Approach:** Move `position: relative; overflow: hidden;` to the base `.strait-circle` rule.

**Pros:**
- Simplest fix, no fragile selectors
- All child positioning works unconditionally

**Cons:**
- `overflow: hidden` on non-selected circles may clip box-shadow or other effects
- Need to verify glow/shadow rendering is unaffected

**Effort:** 15 minutes

**Risk:** Low-Medium (need visual QA)

## Recommended Action

*To be filled during triage.*

## Technical Details

**Affected files:**
- `components/straits/StraitCircle.vue:116-119` — CSS :has() rule
- `components/straits/StraitData.vue:56-59` — prop coupling

## Resources

- **PR:** #25

## Acceptance Criteria

- [ ] Ships SVG renders correctly even without satellite image present
- [ ] Circular clipping works for ships overlay
- [ ] Non-selected circles still render glows/shadows correctly

## Work Log

### 2026-03-08 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified fragile CSS coupling between image and ships positioning
- Verified current behavior works due to co-gated props in StraitData
- Proposed two fix approaches
