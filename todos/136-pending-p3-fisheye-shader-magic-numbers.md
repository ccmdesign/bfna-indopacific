---
status: pending
priority: p3
issue_id: "136"
tags: [code-review, quality, shader]
dependencies: ["073"]
---

# New shader uniforms use hardcoded magic numbers for specular geometry

## Problem Statement

The fragment shader contains hardcoded magic numbers for the specular highlight arc: `vec2(0.15, 0.2)` (specular position offset), `0.2` (arc radius), `80.0` (arc sharpness), `0.7` (falloff start). These are not configurable and their meaning is not documented in the shader comments.

**Why it matters:** If the visual design needs adjustment (different highlight position, wider/narrower arc), a developer must understand the shader math to make changes. This extends finding #073.

## Findings

- **Location:** `composables/useFisheyeCanvas.ts`, FRAG_SOURCE_V2 lines ~60-63
- **Evidence:** `vec2 specPos = fromCenter - vec2(0.15, 0.2); float specDist = length(specPos); float arcShape = exp(-pow(specDist - 0.2, 2.0) * 80.0); float specular = uSpecular * uStrength * arcShape * smoothstep(1.0, 0.7, r);`
- **Agent:** quality-reviewer

## Proposed Solutions

### Option A: Add inline shader comments explaining each constant
Document what each magic number controls without adding more uniforms.

- **Pros:** Zero performance cost; clarifies intent
- **Cons:** Still not runtime-configurable
- **Effort:** Small
- **Risk:** Low

### Option B: Expose as additional uniforms
Make specular position, radius, and sharpness configurable via uniforms.

- **Pros:** Full design-time control
- **Cons:** More uniforms = more API surface; may not be needed
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

_To be decided during triage._

## Technical Details

- **Affected files:** `composables/useFisheyeCanvas.ts`
- **Related:** todo #073

## Acceptance Criteria

- [ ] Magic numbers are either documented or configurable
- [ ] Shader behavior unchanged without explicit override

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-10 | Created | Code review finding from PR #33 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/33
