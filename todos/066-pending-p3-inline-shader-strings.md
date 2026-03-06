---
status: pending
priority: p3
issue_id: "066"
tags: [code-review, quality, maintainability, webgl]
dependencies: []
---

# Shader Strings Inline Rather Than Extracted to .glsl Files

## Problem Statement

The vertex and fragment shaders are defined as template literal strings within `StraitLensZoom.vue` (lines 23-55). The plan notes that `@tresjs/nuxt` supports GLSL imports via `vite-plugin-glsl`, and recommends extracting shaders to `.glsl` files for syntax highlighting, linting, and maintainability -- especially as the shader grows more complex in future tickets (barrel distortion, chromatic aberration).

## Findings

- **Agent:** architecture-reviewer
- **Location:** `components/StraitLensZoom.vue:23-55`
- **Evidence:** Inline GLSL strings miss editor syntax highlighting and linting
- **Impact:** Low for current simple shader, grows as shader complexity increases

## Proposed Solutions

### Option A: Extract to .glsl Files

Create `shaders/lens-zoom.vert` and `shaders/lens-zoom.frag`, import via `vite-plugin-glsl`.

- **Pros:** Syntax highlighting, linting, reusable across components
- **Cons:** Additional files, import configuration
- **Effort:** Small
- **Risk:** None

### Option B: Keep Inline (Accept for Now)

The shader is short (~30 lines total). Extract when it grows.

- **Effort:** None
- **Risk:** None

## Technical Details

- **Affected files:** `components/StraitLensZoom.vue`
- **New files:** `shaders/lens-zoom.vert`, `shaders/lens-zoom.frag`

## Acceptance Criteria

- [ ] Shader code has syntax highlighting in editors
- [ ] Imports work with `vite-plugin-glsl`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Created during PR #18 review | |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/18
- vite-plugin-glsl: https://github.com/UstymUkhman/vite-plugin-glsl
