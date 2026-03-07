---
status: pending
priority: p2
issue_id: "085"
tags: [code-review, quality, maintainability, BF-96]
dependencies: []
---

# Duplicated Magic-Number Timers for Panel Visibility

## Problem Statement

The panel show/hide animation uses hardcoded timer values (600ms for zoom-out, 650ms for panel delay) that are duplicated across three locations in `StraitMap.vue`:

1. `onActivate()` (lines 113, 122-123) -- local-state mode
2. `watch(() => props.selectedStraitId, ...)` (lines 137-138) -- route-driven mode
3. `deselect()` (lines 287-288) -- close handler

These magic numbers are also tightly coupled to CSS transition durations (`.map-bg` transition is `0.6s`), but the coupling is implicit. Changing one without the other will create visual glitches.

Additionally, using `setTimeout` instead of `transitionend` events means the timers can drift from actual animation completion if CSS is changed.

## Findings

- **Agent:** quality-reviewer, architecture-reviewer
- **Evidence:** Search for `600` and `650` in `StraitMap.vue` reveals 6 occurrences across 3 functions
- **Location:** `components/StraitMap.vue` lines 113, 122, 137, 138, 287, 288

## Proposed Solutions

### Option 1: Extract constants (Recommended -- quick win)
```ts
const ZOOM_OUT_DURATION = 600
const PANEL_SHOW_DELAY = 650
```

- **Pros:** Single source of truth, self-documenting
- **Cons:** Still timer-based, not event-based
- **Effort:** Small
- **Risk:** Low

### Option 2: Use transitionend events instead of timers
Listen for `transitionend` on the map background to trigger panel visibility.

- **Pros:** Always in sync with actual animation, no magic numbers
- **Cons:** More complex, need to handle `prefers-reduced-motion` path
- **Effort:** Medium
- **Risk:** Low

## Technical Details

- **Affected files:** `components/StraitMap.vue`

## Acceptance Criteria

- [ ] Timer durations are defined as named constants
- [ ] Comment linking CSS transition duration to JS constants

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Identified during PR #22 code review | Timer/CSS coupling should be explicit |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/22
