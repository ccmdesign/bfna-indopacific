---
status: pending
priority: p3
issue_id: "BF-91"
tags: [code-review, css, quality]
dependencies: []
---

# Description border-bottom duplicates new section divider

## Problem Statement

`.strait-mobile-detail__desc` has `border-bottom: 1px solid rgba(255, 255, 255, 0.06)` with `padding-bottom: 20px` (lines 325-326). The new `.strait-mobile-detail__divider` renders the same `rgba(255, 255, 255, 0.06)` line with `margin: 0 0 20px`. When a strait has a description AND qualitative content, users see two nearly identical thin lines separated by ~20px of empty space, which looks like a visual glitch.

## Findings

- `StraitMobileDetail.vue:325-326` - `.strait-mobile-detail__desc` has `border-bottom: 1px solid rgba(255,255,255,0.06)` and `padding-bottom: 20px`
- `StraitMobileDetail.vue:333-338` - `.strait-mobile-detail__divider` has `background: rgba(255,255,255,0.06)` and `margin: 0 0 20px`
- Both use identical color values, producing a double-line effect
- Straits with description + industries/threats/facts will show both lines

## Proposed Solutions

### Option 1: Remove border-bottom from description

**Approach:** Remove `border-bottom` and `padding-bottom` from `.strait-mobile-detail__desc`, relying solely on the new divider for section separation.

**Pros:**
- Clean single separator
- Divider is the explicit semantic separator

**Cons:**
- If description is the only qualitative content, `hasQualContent` is true but divider still shows (though this is correct behavior)

**Effort:** 5 minutes

**Risk:** Low

---

### Option 2: Keep description border, hide divider when description is last qual element

**Approach:** Add logic to not render divider if description is the only qualitative content shown.

**Pros:**
- Preserves description's visual containment

**Cons:**
- More complex conditional logic

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `components/straits/StraitMobileDetail.vue:323-330,332-338`

## Resources

- **PR:** #28

## Acceptance Criteria

- [ ] No double-line visible between qualitative and quantitative sections
- [ ] Visual separation maintained between sections

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified overlapping visual separators in CSS
