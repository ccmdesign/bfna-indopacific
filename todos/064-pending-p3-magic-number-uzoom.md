---
status: resolved
priority: p3
issue_id: "064"
tags: [code-review, quality, maintainability]
dependencies: []
---

# Magic Number: uZoom Value of 4.0 Undocumented

## Problem Statement

The zoom factor `4.0` in the shader uniforms (line 61) is a magic number with no comment explaining why 4x magnification was chosen or how it relates to the texture resolution and viewport size.

## Findings

- **Agent:** quality-reviewer
- **Location:** `components/StraitLensZoom.vue:61`
- **Evidence:** `uZoom: { value: 4.0 }` -- no comment or named constant
- **Impact:** Future developers may not understand the zoom level rationale

## Proposed Solutions

### Option A: Extract to Named Constant with Comment

```ts
/** 4x zoom shows ~25% of the texture width in the lens viewport */
const LENS_ZOOM_FACTOR = 4.0
```

- **Pros:** Self-documenting, easy to tune
- **Cons:** Minor refactor
- **Effort:** Small
- **Risk:** None

## Technical Details

- **Affected files:** `components/StraitLensZoom.vue`

## Acceptance Criteria

- [ ] Zoom factor is a named constant with explanatory comment

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #18 review | |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/18
