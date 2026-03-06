---
status: pending
priority: p2
issue_id: "061"
tags: [code-review, quality, robustness]
dependencies: []
---

# Fragile String Replace for Active Stroke Opacity

## Problem Statement

In `StraitMap.vue` line 109, the active stroke color is derived by string-replacing `'0.7)'` with `'1)'` in the HSLA string output of `straitStroke()`. This is a brittle pattern -- if the alpha value is ever changed to `0.70`, `0.7 ` (trailing space), or the color function format changes (e.g., to CSS Color Level 4 syntax without commas), the replace silently fails and the stroke stays at 0.7 opacity during hover.

**Why it matters:** The rest of the color system uses clean helper functions (`straitFill`, `straitStroke`, `straitGlowFill`, etc.) that derive HSLA strings from structured `{h, s, l}` objects. This one inline string manipulation breaks the pattern and introduces a hidden fragility.

## Findings

- **Location:** `components/StraitMap.vue`, line 109
- **Evidence:** `stroke: isActive ? straitStroke(id).replace('0.7)', '1)') : straitStroke(id)`
- **Agent:** quality-reviewer, code-simplicity-reviewer
- **Impact:** If the base stroke opacity changes from `0.7` to any other value, the active state stroke will silently remain at the base opacity instead of going to full.

## Proposed Solutions

### Option 1: Add a dedicated `straitActiveStroke()` helper
- **Description:** Add a new helper alongside the existing color functions:
  ```ts
  function straitActiveStroke(id: string): string {
    const c = getStraitColor(id)
    return `hsla(${c.h}, ${c.s}%, ${c.l}%, 1)`
  }
  ```
  Then use it in `circleStyle()`: `stroke: isActive ? straitActiveStroke(id) : straitStroke(id)`
- **Pros:** Consistent with existing helper pattern; no string manipulation; self-documenting
- **Cons:** One more function (minimal)
- **Effort:** Small (5 min)
- **Risk:** None

### Option 2: Parameterize `straitStroke()` with alpha
- **Description:** Change signature to `straitStroke(id: string, alpha = 0.7)` and call `straitStroke(id, 1)` for active state.
- **Pros:** Single function serves both purposes; DRY
- **Cons:** Changes existing function signature
- **Effort:** Small (5 min)
- **Risk:** None

## Recommended Action

Option 2 -- parameterize alpha for maximum DRYness.

## Technical Details

- **Affected files:** `components/StraitMap.vue`
- **Affected lines:** 66-68 (straitStroke), 109 (circleStyle)

## Acceptance Criteria

- [ ] No string `.replace()` calls on color strings
- [ ] Active stroke renders at full opacity on hover
- [ ] Default stroke renders at 0.7 opacity

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #19 code review | String manipulation on HSLA output is fragile; prefer structured color helpers |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/19
