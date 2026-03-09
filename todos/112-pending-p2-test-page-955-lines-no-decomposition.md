---
status: wont_fix
priority: p2
issue_id: "112"
tags: [code-review, architecture, maintainability]
dependencies: []
---

# Test Page 955 Lines With No Component Decomposition

## Problem Statement
`pages/test/hormuz/index.vue` is a 955-line single-file component containing the entire particle simulation system: polygon rasterization, BFS distance field, spine pathfinding, particle physics, Tweakpane UI, canvas rendering, and drag-drop editing. This makes the file difficult to navigate, test, or reuse.

**Why it matters:** While this is a dev-only test page, the particle system logic will likely need to be extracted for production use. Starting decomposition now prevents a larger refactor later.

## Findings
- **File:** `pages/test/hormuz/index.vue` — 955 lines
- Contains 7+ distinct concerns: polygon math, distance field, spine system, particle spawning/physics, canvas rendering, Tweakpane controls, mouse drag/drop
- Functions like `buildDistanceField`, `spineNearest`, `pointInPolygon` are pure utilities that could be extracted
- The reactive `spine` array and `params` object are tightly coupled to the canvas render loop

## Proposed Solutions

### Option A: Extract pure utilities to composables/utils
- Move `pointInPolygon`, `rasterize`, `buildDistanceField`, `edgeLengths`, `pointAtDistance`, `randomPointOnEdge`, `buildSpine`, `spineNearest`, `spineAt` to `utils/particleGeometry.ts`
- **Pros:** Testable, reusable, reduces file to ~500 lines
- **Cons:** Import overhead, need to pass grid dimensions
- **Effort:** Medium
- **Risk:** Low

### Option B: Extract particle system as a composable
- Create `composables/useParticleSystem.ts` with spawn/update/render logic
- **Pros:** Full encapsulation, reusable across straits
- **Cons:** Larger refactor
- **Effort:** Large
- **Risk:** Medium

## Recommended Action
<!-- Filled during triage -->

## Technical Details
- **Affected files:** `pages/test/hormuz/index.vue`
- **Components:** Particle test page

## Acceptance Criteria
- [ ] Core geometry functions are extracted and unit-testable
- [ ] Test page still functions identically after extraction

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Created from PR #29 code review | 955 lines in single dev-only page |

## Resources
- PR: https://github.com/ccmdesign/bfna-indopacific/pull/29
- Linear: BF-78
