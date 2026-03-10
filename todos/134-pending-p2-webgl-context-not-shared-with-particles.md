---
status: resolved
priority: p2
issue_id: "134"
tags: [code-review, performance, webgl, architecture]
dependencies: ["066"]
---

# Each selected strait creates a new WebGL context (FisheyeLens + particle canvas)

## Problem Statement

When a strait is selected, `FisheyeLens.vue` creates its own WebGL context and `StraitParticles.vue` creates another canvas (2D context). Combined with any other WebGL contexts from other components, this can exceed browser WebGL context limits (typically 8-16 active contexts). This was already flagged in todo #066 for particle canvases, but PR #33 adds another WebGL context per selected strait.

**Why it matters:** Browsers silently lose older WebGL contexts when the limit is exceeded. On mobile devices with lower limits, this could cause the fisheye lens or particle system to silently fail.

## Findings

- **Location:** `composables/useFisheyeCanvas.ts` line 194 (`canvas.getContext('webgl2')`)
- **Evidence:** Each `FisheyeLens` instance requests its own WebGL context. Only one strait is selected at a time (enforced by StraitMap), so in practice only 1 FisheyeLens context exists at once, mitigating the issue. However, combined with the existing particle system contexts, total context count grows.
- **Agent:** performance-reviewer
- **Note:** Severity reduced because only one strait is selected at a time, limiting to 1 fisheye + 1 particle context simultaneously.

## Proposed Solutions

### Option A: Accept current behavior (one-at-a-time selection)
Since StraitMap enforces single selection, only 1 FisheyeLens and 1 StraitParticles exist simultaneously. Total WebGL contexts are bounded.

- **Pros:** No code change needed; risk is theoretical
- **Cons:** If selection model ever changes, context count could spike
- **Effort:** None
- **Risk:** Low

### Option B: Share a single offscreen WebGL context
Use a single shared WebGL context and render to different framebuffers or swap textures.

- **Pros:** Guaranteed single context; future-proof
- **Cons:** Significant refactor; complexity increase
- **Effort:** Large
- **Risk:** Medium

## Recommended Action

_To be decided during triage._

## Technical Details

- **Affected files:** `composables/useFisheyeCanvas.ts`, `components/straits/FisheyeLens.vue`
- **Related:** todo #066 (six simultaneous WebGL contexts)

## Acceptance Criteria

- [ ] Verify total active WebGL contexts never exceed browser limits during normal usage
- [ ] Document the constraint (single selection) that keeps context count bounded

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-10 | Created | Code review finding from PR #33 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/33
- Related: todo #066
