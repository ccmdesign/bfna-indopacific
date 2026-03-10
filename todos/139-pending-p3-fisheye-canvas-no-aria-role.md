---
status: pending
priority: p3
issue_id: "139"
tags: [code-review, accessibility]
dependencies: []
---

# FisheyeLens canvas uses aria-hidden but no role attribute

## Problem Statement

The `<canvas>` in `FisheyeLens.vue` has `aria-hidden="true"` which is correct for a decorative visual effect. However, the parent `StraitCircle` container does not communicate that the visual state has changed (WebGL lens active vs plain image fallback). Screen reader users have no indication that a visual enhancement is present or absent.

**Why it matters:** This is a minor accessibility concern. The `aria-hidden` is correct — the canvas is purely decorative. No action is strictly required, but documenting the accessibility decision is good practice.

## Findings

- **Location:** `components/straits/FisheyeLens.vue` line 115 (`aria-hidden="true"`)
- **Evidence:** Canvas is correctly marked as decorative. The fallback `<img>` in StraitCircle also has `aria-hidden="true"`. Both are satellite imagery backgrounds that don't convey information.
- **Agent:** accessibility-reviewer

## Proposed Solutions

### Option A: No change needed — document the decision
Both the canvas and fallback image are decorative. `aria-hidden="true"` is correct.

- **Pros:** No code change
- **Cons:** None
- **Effort:** None
- **Risk:** None

## Recommended Action

_To be decided during triage._

## Technical Details

- **Affected files:** `components/straits/FisheyeLens.vue`

## Acceptance Criteria

- [ ] Confirm aria-hidden usage is correct for decorative canvas

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-10 | Created | Code review finding from PR #33 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/33
