---
status: resolved
priority: p3
issue_id: "063"
tags: [code-review, quality, simplicity]
dependencies: []
---

# Redundant Glow Color Helpers -- straitGlowColor and straitGlowFill Are Near-Identical

## Problem Statement

`straitGlowColor()` (line 81) returns `hsla(h, s%, l%, 0.25)` and `straitGlowFill()` (line 71) returns `hsla(h, s%, 70%, 0.08)`. Both produce low-opacity accent color variations for decorative glow effects. The plan's own deepening research (line 124 of the plan doc) flagged this: "Consider whether both are truly needed or if one can serve both the glow circle fill and the filter flood color."

**Why it matters:** Two functions with similar names and similar outputs increase cognitive load. The visual difference between a 0.25-opacity accent and a 0.08-opacity lightened accent on a dark background is negligible, especially since the glow circle is already blurred by the SVG filter.

## Findings

- **Location:** `components/StraitMap.vue`, lines 71-74 (`straitGlowFill`) and 81-84 (`straitGlowColor`)
- **Usage:** `straitGlowColor` is used for the glow background circle (line 282); `straitGlowFill` is used for the inner glow circle (line 300)
- **Agent:** code-simplicity-reviewer
- **Impact:** Minor code complexity; no functional issue

## Proposed Solutions

### Option 1: Consolidate into one function with optional lightness/alpha params
- **Pros:** Reduces function count; clarifies intent
- **Cons:** Slightly less readable than named functions
- **Effort:** Small (5 min)
- **Risk:** None

### Option 2: Keep both but rename for clarity
- **Description:** Rename to `straitOuterGlowColor()` and `straitInnerGlowColor()` to make the distinction clear.
- **Pros:** Self-documenting
- **Cons:** Doesn't reduce code
- **Effort:** Trivial
- **Risk:** None

## Technical Details

- **Affected files:** `components/StraitMap.vue`

## Acceptance Criteria

- [ ] Glow effect functions are either consolidated or clearly named

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created from PR #19 code review | Plan's own research flagged this redundancy |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/19
