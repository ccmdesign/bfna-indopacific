---
status: resolved
priority: p2
issue_id: "062"
tags: [code-review, architecture, webgl, graceful-degradation]
dependencies: []
---

# Missing WebGL Fallback When Context Creation Fails

## Problem Statement

`StraitLensZoom.vue` renders a TresCanvas with a WebGL shader for the lens zoom effect. If WebGL is unavailable (older hardware, privacy browsers that block WebGL, or WebGL context limit exhausted), TresCanvas will fail silently or throw, leaving the user with a black circle and no feedback.

The plan acknowledges this risk ("Fallback: show a CSS `background-image` with `transform: scale(4)` if WebGL unavailable") but the implementation does not include any fallback.

## Findings

- **Agent:** architecture-reviewer
- **Location:** `components/StraitLensZoom.vue:202-221` (TresCanvas block)
- **Evidence:** No error boundary, no fallback rendering path, no `isSupported` check
- **Impact:** Users on WebGL-unsupported browsers see a broken lens with no explanation

## Proposed Solutions

### Option A: CSS Background Fallback (Recommended)

Detect WebGL support on mount. If unavailable, render a CSS-based zoom using `background-image` and `background-position` calculated from the strait's UV coordinates.

- **Pros:** Graceful degradation, no external dependency
- **Cons:** CSS zoom looks slightly different (no anti-aliased circle edge)
- **Effort:** Medium
- **Risk:** Low

### Option B: Error Boundary with Message

Wrap TresCanvas in a Vue error boundary that catches WebGL context errors and displays a message like "WebGL not available. Please use a modern browser."

- **Pros:** Simple, informative
- **Cons:** User gets no zoom functionality at all
- **Effort:** Small
- **Risk:** Low

### Option C: Accept Risk (Document Only)

Since this is a desktop-first infographic for a known audience (BFNA stakeholders), WebGL support is nearly universal. Document the requirement and move on.

- **Pros:** No code change
- **Cons:** Edge cases remain broken
- **Effort:** None
- **Risk:** Low (audience is known)

## Recommended Action

_(To be filled during triage)_

## Technical Details

- **Affected files:** `components/StraitLensZoom.vue`

## Acceptance Criteria

- [ ] Lens gracefully handles WebGL unavailability
- [ ] User receives feedback if WebGL fails

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #18 review | WebGL fallback consideration |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/18
- WebGL support: https://caniuse.com/webgl
