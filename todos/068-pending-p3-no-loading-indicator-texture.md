---
status: resolved
priority: p3
issue_id: "068"
tags: [code-review, ux, quality]
dependencies: ["063"]
---

# No Loading Indicator While Texture Loads

## Problem Statement

Related to finding 063. When the lens opens, there is no visual loading state while the WebGL texture is being fetched. The lens circle appears immediately but may show a solid color (TresCanvas clear color `#0a1628`) until the texture finishes loading. For users on fast connections this is imperceptible, but on slower connections it could appear broken.

## Findings

- **Agent:** quality-reviewer
- **Location:** `components/StraitLensZoom.vue:202`
- **Evidence:** `TresCanvas :clear-color="'#0a1628'"` is all that shows before texture loads
- **Impact:** Brief dark circle with no context on slow connections

## Proposed Solutions

### Option A: CSS Spinner Overlay

Show a CSS spinner centered in the lens circle that fades out when the texture is ready.

- **Effort:** Small
- **Risk:** None

### Option B: Skeleton/Pulse Animation

Use a pulsing ring animation in the lens circle area while loading.

- **Effort:** Small
- **Risk:** None

## Technical Details

- **Affected files:** `components/StraitLensZoom.vue`

## Acceptance Criteria

- [ ] User sees visual feedback while texture loads

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #18 review | |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/18
