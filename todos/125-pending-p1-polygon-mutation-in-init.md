---
status: resolved
priority: p1
issue_id: "BF-104"
tags: [code-review, architecture, data-integrity]
dependencies: []
---

# ParticleSimulation.init() mutates shared polygon data

## Problem Statement

`ParticleSimulation.init()` in `utils/particleEngine.ts:443-449` directly mutates the `polygon.exitEdge` array when `exitEdgeExtensions` are configured. Since polygon data is loaded via dynamic `import()` and cached by the module system, this mutation persists across simulation resets and re-initializations, prepending exit edge extensions repeatedly.

Each call to `init()` with the same polygon adds another copy of the extensions to `exitEdge`, growing it unboundedly.

## Findings

- `utils/particleEngine.ts:443-449` — `polygon.exitEdge = [...extensions, ...origExit]` replaces the array reference on the shared object.
- The polygon is loaded via `import(`~/data/straits/${id}-polygon.json`)` in `useParticleFlow.ts:198`, which is cached by Vite/webpack module system.
- On subsequent calls (e.g., switching straits and back, or year changes triggering restart), the already-extended `exitEdge` gets extended again.
- Currently no strait configs use `exitEdgeExtensions`, so this is latent — but the field exists in the type and could be used.

## Proposed Solutions

### Option 1: Clone polygon before mutation

**Approach:** Deep-clone `exitEdge` (or the entire polygon) before modifying it in `init()`.

```ts
const exitEdge = [...polygon.exitEdge]
if (this.config.exitEdgeExtensions?.length) {
  exitEdge.unshift(...this.config.exitEdgeExtensions.map(p => p as [number, number]))
}
polygon = { ...polygon, exitEdge }
```

**Pros:**
- Prevents mutation of cached module data
- Simple, localized fix

**Cons:**
- Minor memory overhead from cloning

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Store extended edges separately in simulation

**Approach:** Keep the original polygon immutable. Store computed edges (with extensions) as separate simulation properties.

**Pros:**
- Clean separation of source data from computed data
- Polygon stays readonly

**Cons:**
- Slightly more refactoring

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `utils/particleEngine.ts:441-449` — `init()` method mutates polygon
- `composables/useParticleFlow.ts:196-199` — polygon loading (cached by module system)

## Resources

- **PR:** #32

## Acceptance Criteria

- [ ] Polygon data from `import()` is never mutated
- [ ] Calling `init()` multiple times with the same polygon produces identical results
- [ ] Exit edge extensions work correctly on first and subsequent initializations

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified shared-state mutation in ParticleSimulation.init()
- Verified polygon is module-cached via dynamic import
- Currently latent (no configs use exitEdgeExtensions) but architecturally unsound
