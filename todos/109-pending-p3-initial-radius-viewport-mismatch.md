---
status: pending
priority: p3
issue_id: "BF-91"
tags: [code-review, css, javascript]
dependencies: []
---

# Initial radius calculation may not match CSS clamp container width

## Problem Statement

The synchronous initial radius on line 26 uses `Math.round(Math.min(window.innerWidth * 0.65, 288) / 2)` to approximate the CSS `clamp(160px, 65vw, 288px)`. However, `window.innerWidth * 0.65` does not account for the component's horizontal padding (`0 1rem` on `.strait-mobile-detail`), margins, or scrollbar width. The actual container width will be slightly less than `65vw`, causing a brief size mismatch until the ResizeObserver fires on mount.

## Findings

- `StraitMobileDetail.vue:26` - `Math.min(window.innerWidth * 0.65, 288) / 2`
- `StraitMobileDetail.vue:239` - CSS uses `clamp(160px, 65vw, 288px)` on the container
- Parent `.strait-mobile-detail` has `padding: 0 1rem` (line 193), which reduces available width
- The CSS clamp uses `65vw` (viewport width), but the container is inset by padding, so the resolved width is `min(65vw, container-width)` where container-width < viewport-width
- Mismatch is small (16-32px on most devices) and resolves within one frame

## Proposed Solutions

### Option 1: Accept as-is

**Approach:** The mismatch is small and resolves in the first frame when ResizeObserver fires. The flash is imperceptible.

**Pros:**
- No code change needed
- SSR-safe approach is already good

**Cons:**
- Technically imprecise initial value

**Effort:** 0

**Risk:** None

---

### Option 2: Subtract known padding from calculation

**Approach:** Use `Math.min((window.innerWidth - 32) * 0.65, 288)` to approximate padding.

**Pros:**
- Closer initial approximation

**Cons:**
- Hardcodes padding assumption in JS
- Still not exact if max-width: 600px kicks in

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `components/straits/StraitMobileDetail.vue:26`

## Resources

- **PR:** #28

## Acceptance Criteria

- [ ] No visible flash/jump on first paint of hero circle

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Compared JS initial calc with CSS clamp resolved values
- Identified padding as source of minor discrepancy
