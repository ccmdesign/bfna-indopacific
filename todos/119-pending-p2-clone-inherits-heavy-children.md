---
status: resolved
priority: p2
issue_id: "BF-93"
tags: [code-review, performance, animation]
dependencies: []
---

# Clone deep-copies SVG/canvas children causing memory waste and visual artifacts

## Problem Statement

`createClone` on line 96 of `useStraitTransition.ts` uses `sourceEl.cloneNode(true)` which deep-clones all children of the hero circle element, including the full SVG from `StraitCircle`, any canvas elements from the particle system, and potentially other complex DOM subtrees. This wastes memory for the 350ms animation duration and may cause visual artifacts if the cloned SVG or canvas renders differently in the fixed-position context.

## Findings

- `composables/useStraitTransition.ts:96` - `sourceEl.cloneNode(true)` deep-clones everything
- The hero circle contains a `StraitCircle` component which renders an SVG with images, circles, and potentially a particle canvas
- The clone only needs to visually approximate the circle (an image in a round container)
- Deep cloning a canvas element produces a blank canvas (canvas content is not cloned), which may flash as a black circle

## Proposed Solutions

### Option 1: Create a lightweight clone with just the image

**Approach:** Instead of `cloneNode(true)`, construct a minimal clone containing only a circular container with the satellite image (extracted from the source element's `<image>` or `<img>` tag).

**Pros:**
- Much lighter DOM footprint
- No canvas cloning artifacts
- Faster clone creation

**Cons:**
- More code to construct the clone manually
- Must keep in sync with StraitCircle's visual output

**Effort:** 1 hour

**Risk:** Low

---

### Option 2: Use cloneNode(true) but remove canvas elements from clone

**Approach:** After cloning, query and remove any `canvas` elements from the clone.

**Pros:**
- Simple fix
- Preserves SVG appearance

**Cons:**
- Still clones the full SVG unnecessarily

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

(To be filled during triage.)

## Technical Details

**Affected files:**
- `composables/useStraitTransition.ts:95-104` - createClone function

## Resources

- **PR:** #30

## Acceptance Criteria

- [ ] Clone does not contain canvas elements
- [ ] Clone visually matches the source circle during animation
- [ ] No blank/black circle flash during transition

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Claude Code (PR Review)

**Actions:**
- Identified deep clone including heavy SVG and canvas children
- Confirmed canvas.cloneNode produces blank canvas (spec behavior)
