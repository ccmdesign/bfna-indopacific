---
title: Particle Stuck Prevention & Edge Fade-Out (Ship Docking)
type: feat
status: active
date: 2026-03-11
linear: BF-110
deepened: 2026-03-11
---

# Particle Stuck Prevention & Edge Fade-Out (Ship Docking)

## Enhancement Summary

**Deepened on:** 2026-03-11
**Sections enhanced:** 7
**Research sources:** Canvas2D rendering best practices, particle system fade patterns, TypeScript strict typing, V8 hidden-class optimization, animation frame race condition analysis, production codebase audit (particleEngine.ts, useParticleFlow.ts)

### Key Improvements
1. **Race condition in strait-mode edge check:** Strait-mode particles (lines 604-621) set `p.x`/`p.y` via `spineAt()` which can place them on non-water grid cells at polygon rasterization boundaries. The plan's `!isInWater` check after the strait-mode block would catch these and trigger an unintended dock-fade. Added a guard to skip the edge check for strait-mode particles.
2. **`nearestBoundaryPoint` becomes dead code:** After removing `stuckTarget` steering, the only call site for `nearestBoundaryPoint()` (line 728) is removed. The function itself (lines 394-408) and its export should be preserved (it is a public API) but the import in `updateParticle` is no longer needed.
3. **Opacity clamping for numerical safety:** The `p.opacity -= p.fadeRate * dt` subtraction can produce negative values (especially with high `dt` from tab-return). Must clamp: `p.opacity = Math.max(0, p.opacity - p.fadeRate * dt)` before the `<= 0` check to prevent a single frame of negative-alpha rendering.
4. **`fading` array allocation on every frame:** The production renderer creates `const fading: Particle[] = []` each frame. Pre-allocate or reuse a module-scoped array to avoid GC pressure at 60fps.
5. **`globalAlpha` reset after fading draw:** The fading particle loop in `drawProduction()` sets `globalAlpha` per particle but never resets it to 1 before `ctx.restore()`. While `ctx.restore()` handles it, the `drawTest()` path explicitly resets `ctx.globalAlpha = 1` (line 331) -- the production path should be consistent.

### New Risks Discovered
- **Strait-mode false-positive dock fade:** `spineAt()` positions particles exactly on the spine polyline. In narrow straits, the spine may cross grid cells flagged as non-water due to 4px grid quantization. Without an `inStrait` guard, these particles will immediately fade -- visually breaking strait traversal.
- **Rapid tab-switching pool drain:** If a user rapidly switches tabs, `dt` can spike to the 3x cap (line 463). A particle with `fadeRate = 0.033` and `dt = 3` loses `0.099` opacity per tick. Combined with the `!isInWater` check catching any drift during the large dt step, many particles could simultaneously enter fade, temporarily draining the visible pool.
- **`Object.assign` hidden-class churn:** Removing `stuckTarget` (object | null) from the Particle shape and adding two number fields changes the V8 hidden class. Since `respawn()` uses `Object.assign(p, this.spawn())`, the first respawn after the change will transition all particles to the new hidden class. This is a one-time cost per session, not per-frame, so it is acceptable -- but worth noting for profiling.

---

## Overview

Two particle behavior improvements for the straits particle system that replace abrupt respawns with smooth fade-out transitions. Stuck particles and coastline-hitting particles should gracefully fade to zero opacity before recycling, producing a more polished "ship docking" visual.

## Problem Statement

**Stuck particles:** The current stuck detection (lines 714-733 in `particleEngine.ts`) steers stuck particles toward the nearest boundary point at 1.5x speed, then respawns them when they get close. This produces an unnatural "particle zipping to the wall then teleporting" effect.

**Edge collisions:** When a particle leaves the water polygon, the engine either teleports it to the spine centerline or tries candidate positions (lines 686-709). If all candidates fail, the particle snaps to the centerline. Particles that genuinely hit coastline never "dock" -- they either bounce or teleport.

Both behaviors break visual continuity. The fix is a unified fade-out mechanism.

### Research Insights

**Motion Design (Emil Kowalski principles):**
- Fade-out duration of 0.5s (30 frames) is appropriate for a data visualization context. It is long enough to be perceived as intentional, short enough not to feel sluggish. In productivity-oriented motion design, transitions under 300ms feel snappy; 500ms is the upper bound before they feel slow. For ambient background particles, 500ms is the sweet spot -- it communicates "docking complete" without demanding attention.
- Freezing velocity during fade is the right call. Any residual drift during fade would create a "ghost sliding along the wall" effect that undermines the docking metaphor.

**Canvas2D Performance Patterns:**
- Per-particle `globalAlpha` changes are cheap on modern browsers (~0.1us per state change). The concern about breaking batch rendering is valid but the impact is minimal at 2-5 fading particles per frame. The split-draw approach (Option A) is correct.
- Avoid `ctx.save()`/`ctx.restore()` in the fading particle inner loop -- they serialize the full canvas state. Instead, just set `globalAlpha` directly and reset after the loop.

## Proposed Solution

Add an `opacity` field and a `fadeRate` field to the `Particle` interface. When a particle enters fade-out (from either trigger), set `fadeRate > 0` to begin decrementing opacity each frame. When opacity reaches 0, recycle via `respawn()`. During fade-out, freeze velocity so the particle appears to stop in place.

### Trigger 1: Stuck Prevention

Keep the existing rolling-window stuck detection (`stuckX`, `stuckY`, `stuckFrames`, `STUCK_RADIUS`, `STUCK_FRAMES`). But instead of setting `stuckTarget` to steer toward boundary, set `fadeRate` to begin fade-out. Remove the `stuckTarget` field and its steering logic entirely.

### Trigger 2: Edge/Coastline Collision (Ship Docking)

After position update in `updateParticle()`, check `isInWater(p.x, p.y, grid)`. If the particle has left water and is not already fading, revert to previous position (or keep current -- it is at the coastline edge) and begin fade-out. This simulates a ship arriving at port.

### Research Insights

**Pattern Recognition:**
- The current code has two distinct "particle removal" strategies: stuck-steering-to-boundary and candidate-position-fallback-to-centerline. Both are complex multi-step state machines. Replacing both with a single `fadeRate > 0` flag is a textbook simplification -- one state variable replaces two code paths.
- The `stuckTarget` field is the only nullable object field on `Particle`. Removing it makes the interface purely primitive-typed, which is better for V8 hidden class stability and eliminates a GC root per particle.

**Simplicity Review:**
- The plan correctly removes `nearestBoundaryPoint` from the hot path. However, the function itself (exported at line 394) should be kept -- it may be used by debug overlays or future features. Just remove the call site at line 728.
- The candidate-position fallback (lines 686-709) should remain unchanged for now. It handles the "particle drifted slightly out of water" case in open-water mode by trying alternative positions. The new `!isInWater` check acts as a second-pass catch for anything the candidates miss. Both mechanisms serve different purposes: candidates try to keep the particle alive; the new check gracefully retires it.

## Technical Approach

### Changes to `utils/particleEngine.ts`

**Constants:**

```typescript
const FADE_SECONDS = 0.5
const FADE_RATE = 1 / (FADE_SECONDS * 60) // ~0.033 per frame
```

**Particle interface changes:**

```typescript
export interface Particle {
  // ... existing fields ...
  opacity: number       // NEW: 1.0 = fully visible, fades to 0
  fadeRate: number       // NEW: 0 = not fading, >0 = decrement per frame
  // REMOVE: stuckTarget: { x: number; y: number } | null
}
```

**`spawn()` changes:**

```typescript
return {
  // ... existing fields ...
  opacity: 1,
  fadeRate: 0,
  // REMOVE stuckTarget: null
}
```

**`updateParticle()` changes -- fade-out early return:**

At the top of `updateParticle()`, before any physics, add:

```typescript
// Fade-out phase: decrement opacity, freeze position
if (p.fadeRate > 0) {
  p.opacity = Math.max(0, p.opacity - p.fadeRate * dt)
  if (p.opacity <= 0) {
    this.respawn(p)
  }
  return
}
```

### Research Insights -- Fade-out Early Return

**Numerical Safety:**
- The original plan used `p.opacity -= p.fadeRate * dt` without clamping. When `dt` is large (up to 3x after tab-return, per line 463 of `useParticleFlow.ts`), opacity can go negative. Canvas2D `globalAlpha` values below 0 are clamped to 0 by the spec, but the respawn check `p.opacity <= 0` should trigger on the exact frame rather than allowing a negative opacity to persist for one frame. Use `Math.max(0, ...)` for correctness.

**Race Condition -- Fade + Respawn Timing:**
- The `respawn()` call inside the fade check uses `Object.assign(p, this.spawn())` which resets `opacity` to 1 and `fadeRate` to 0. Since this happens mid-iteration of the `for (const p of particles)` loop in `tick()`, and `respawn` mutates in place (does not create a new object), there is no array-mutation race. The particle is immediately reusable on the next tick. This is correct.

**Stuck detection refactor (lines ~714-733):**

Replace the `stuckTarget` steering block with:

```typescript
// Stuck detection -- trigger fade instead of boundary steering
const dFromRef = Math.hypot(p.x - p.stuckX, p.y - p.stuckY)
if (dFromRef < STUCK_RADIUS) {
  p.stuckFrames += dt
  if (p.stuckFrames >= STUCK_FRAMES) {
    p.fadeRate = FADE_RATE
    p.vx = 0
    p.vy = 0
  }
} else {
  p.stuckX = p.x
  p.stuckY = p.y
  p.stuckFrames = 0
}
```

### Research Insights -- Stuck Detection

**TypeScript Review:**
- The stuck detection correctly resets `stuckFrames` when the particle moves beyond `STUCK_RADIUS`. However, there is a subtle issue: `stuckFrames` is incremented by `dt` (a float), but compared against `STUCK_FRAMES` (an integer derived from `Math.round(STUCK_SECONDS * 60)`). This is already the existing behavior and is fine -- `dt` is typically ~1.0 (one frame at 60fps), so `stuckFrames` accumulates in frame-equivalent units.
- After setting `p.fadeRate = FADE_RATE`, the stuck detection should also reset `p.stuckFrames = 0` to prevent re-triggering on subsequent frames before the fade early-return kicks in. Without this, the `stuckFrames >= STUCK_FRAMES` condition remains true on the next frame, redundantly setting `fadeRate` again. While harmless (idempotent), it is cleaner to reset:

```typescript
if (p.stuckFrames >= STUCK_FRAMES) {
  p.fadeRate = FADE_RATE
  p.vx = 0
  p.vy = 0
  p.stuckFrames = 0  // prevent redundant re-trigger
}
```

**Edge collision detection (ship docking):**

After the position update block (after both strait-mode and open-water-mode), before stuck detection, add:

```typescript
// Edge collision: particle left water polygon -> dock fade-out
// Skip for strait-mode particles: spineAt() positions them on the polyline,
// which may cross non-water grid cells due to 4px quantization.
if (!inStrait && !isInWater(p.x, p.y, grid)) {
  p.vx = 0
  p.vy = 0
  p.fadeRate = FADE_RATE
  return
}
```

### Research Insights -- Edge Collision

**Critical: Strait-mode false positive (NEW FINDING):**
- The original plan places the `!isInWater` check unconditionally after the position update. However, in strait mode (lines 604-621), particles are positioned via `spineAt()` which returns exact coordinates on the spine polyline. The `isInWater()` function uses a rasterized grid with 4px cells (`GRID_CELL = 4`). In narrow passages, the spine centerline can pass through grid cells that are flagged as non-water because the cell center is outside the polygon even though the spine itself is inside.
- **Fix:** Guard the `!isInWater` check with `!inStrait`. Strait-mode particles are already constrained to the 1D spine and do not need containment checking. The `inStrait` variable is already computed at line 600 (`const inStrait = localWidth < STRAIT_THRESHOLD`).
- This variable is scoped inside the `if (inStrait) { ... } else { ... }` block. To use it after both branches, hoist it or use a flag:

```typescript
// Before the if/else block (already computed at line 600):
// const inStrait = localWidth < STRAIT_THRESHOLD  // already exists

// After both blocks:
if (!inStrait && !isInWater(p.x, p.y, grid)) {
  p.vx = 0
  p.vy = 0
  p.fadeRate = FADE_RATE
  return
}
```

**Previous position revert consideration:**
- The plan mentions "revert to pre-move position" but then says "actually: keep position." Keeping the current position is correct. Reverting would require storing `prevX`/`prevY` (two extra fields per particle, 16 bytes each at Float64). The visual difference is negligible -- the particle is at most one frame-step (1-3 pixels) past the coastline. Keeping it in place and fading is sufficient.

**Important placement note:** This check must go AFTER the position update but BEFORE stuck detection and waypoint advancement. The `nearStrait` / `distToExit < 60` code path (lines 682-684) does not check `isInWater`, so particles in tight straits or near exits can clip through coastline. The new check catches these.

### Changes to `composables/useParticleFlow.ts`

**`drawTest()` -- use `p.opacity`:**

Replace the particle drawing loop (lines ~317-331):

```typescript
for (const p of sim.particles) {
  ctx!.fillStyle = p.color
  ctx!.globalAlpha = params.dotOpacity * p.opacity  // CHANGED: multiply by p.opacity
  ctx!.beginPath()
  ctx!.arc(p.x, p.y, p.radius, 0, TAU)
  ctx!.fill()

  if (params.showGlow && params.glowOpacity > 0) {
    ctx!.globalAlpha = params.glowOpacity * p.opacity  // CHANGED
    ctx!.beginPath()
    ctx!.arc(p.x, p.y, p.radius * params.glowRadius, 0, TAU)
    ctx!.fill()
  }
}
```

**`drawProduction()` -- use `p.opacity`:**

The production renderer batches particles by type for performance. Adding per-particle opacity breaks the single-path optimization. Two approaches:

**Option A (recommended): Split fading particles into separate draws.**

During the grouping step, separate fading particles (those with `opacity < 1`) into a separate list. Draw non-fading particles with the existing batched path. Draw fading particles individually with per-particle `globalAlpha`.

```typescript
const fading: Particle[] = []
const grouped: Record<ParticleType, Particle[]> = { container: [], dryBulk: [], tanker: [] }
for (const p of sim.particles) {
  if (p.opacity < 1) {
    fading.push(p)
  } else {
    const type = particleTypeMap.get(p) ?? 'tanker'
    grouped[type].push(p)
  }
}

// Batch draw non-fading (unchanged)
// ...existing batch code...

// Individual draw fading particles
for (const p of fading) {
  const type = particleTypeMap.get(p) ?? 'tanker'
  ctx!.fillStyle = PARTICLE_COLORS[type]
  ctx!.globalAlpha = 0.85 * p.opacity
  ctx!.beginPath()
  ctx!.arc(p.x, p.y, p.radius, 0, TAU)
  ctx!.fill()
  // Glow
  ctx!.globalAlpha = 0.2 * p.opacity
  ctx!.beginPath()
  ctx!.arc(p.x, p.y, p.radius * 2.5, 0, TAU)
  ctx!.fill()
}
ctx!.globalAlpha = 1  // Reset after fading draws
```

This keeps the hot path (most particles) batched. Only the ~2-5 particles fading at any given time get individual draws.

### Research Insights -- Production Rendering

**Performance Analysis:**
- At 120-240 particles, the hot path processes ~235 particles in batched mode and ~5 in individual mode. The fading array allocation (`const fading: Particle[] = []`) creates a new array every frame. At 60fps, this is 60 allocations/second. Each is tiny (empty array + ~5 pushes), but for zero-allocation purists:
  - **Option 1 (simple):** Keep the allocation. V8's generational GC handles short-lived small arrays efficiently. The minor GC pause is ~0.1ms, invisible at 60fps.
  - **Option 2 (zero-alloc):** Use a module-scoped `let fadingBuf: Particle[] = []` and `fadingBuf.length = 0` each frame. This reuses the backing store. Only worth it if profiling shows GC spikes.
  - **Recommendation:** Start with Option 1. Only optimize to Option 2 if Chrome DevTools Performance panel shows GC pressure in the particle rendering phase.

**`globalAlpha` State Management (Frontend Races Review):**
- The existing `drawProduction()` uses `ctx.save()`/`ctx.restore()` around the entire function (lines 359/447). This means `globalAlpha` changes within the function are properly sandboxed. However, the fading particle loop sets `globalAlpha` to values like `0.85 * 0.5 = 0.425` and `0.2 * 0.5 = 0.1`. If the `ctx.restore()` is missed (e.g., an early return due to a future code change), subsequent draws would use stale alpha. Adding `ctx!.globalAlpha = 1` after the fading loop is defensive and recommended.

**Canvas2D Batch Path Optimization:**
- The existing batch code uses `ctx.moveTo(p.x + p.radius, p.y)` before each `ctx.arc()` to avoid implicit `lineTo` connections between arcs. This pattern must be preserved in the fading particle loop. The plan's code correctly uses separate `beginPath()`/`fill()` calls per fading particle, which is even cleaner (no moveTo needed since each is its own path).

## System-Wide Impact

- **Interaction graph:** `updateParticle()` -> fade check -> `respawn()`. No new callbacks or observers. The fade-out is purely internal to the simulation tick.
- **Error propagation:** No new error paths. If `opacity` somehow goes negative, the `Math.max(0, ...)` clamp prevents it, and `respawn()` resets it to 1.
- **State lifecycle risks:** None. The `respawn()` call resets all fields via `Object.assign(p, this.spawn())`, which will set `opacity: 1` and `fadeRate: 0`.
- **API surface parity:** The `Particle` interface is exported. Any external code reading particles (e.g., Tweakpane debug) will see the new fields but they are additive. The removal of `stuckTarget` is a breaking change to the exported interface -- but no external consumers exist outside this project.
- **Performance:** No new per-frame allocations. `fadeRate` and `opacity` are primitive number fields on existing objects. The early-return in `updateParticle()` for fading particles actually reduces work (no physics computed during fade).

### Research Insights -- System Impact

**Architecture Review:**
- The plan correctly confines all changes to two files with no new inter-module dependencies. The `Particle` interface change is additive (two new number fields) and subtractive (one nullable object field removed). Net effect is a simpler, flatter type.
- The `nearestBoundaryPoint` export at line 394 of `particleEngine.ts` becomes unused within the module after removing the `stuckTarget` call site. It should remain exported for potential external use (debug tools, future features) but a `// Currently unused internally -- retained as public API` comment would be helpful.

**Dead Code Inventory:**
After this change, the following become unused internally:
1. `nearestBoundaryPoint()` -- no internal callers (keep as export)
2. The `stuckTarget` type `{ x: number; y: number } | null` -- removed from interface entirely
3. The steering block (lines 714-723) -- deleted entirely

## Acceptance Criteria

- [ ] `Particle` interface has `opacity: number` (default 1) and `fadeRate: number` (default 0)
- [ ] `stuckTarget` field and its steering logic are removed from `Particle` and `updateParticle()`
- [ ] Stuck particles (within `STUCK_RADIUS` for `STUCK_FRAMES`) trigger `fadeRate = FADE_RATE` instead of boundary steering
- [ ] Particles leaving water polygon (`!isInWater` after position update) stop velocity and trigger `fadeRate = FADE_RATE`
- [ ] **NEW:** Edge collision check is guarded with `!inStrait` to prevent false positives in strait-mode
- [ ] Fading particles decrement `opacity` each tick with `Math.max(0, ...)` clamping; when `opacity <= 0`, `respawn()` is called
- [ ] `drawTest()` multiplies `globalAlpha` by `p.opacity`
- [ ] `drawProduction()` handles `p.opacity` for fading particles without breaking batch rendering for non-fading particles
- [ ] `globalAlpha` is reset to 1 after fading particle draws in both renderers
- [ ] No visual glitches: particles smoothly fade rather than disappearing abruptly
- [ ] Particle pool stays healthy: count remains at `params.particleCount` over time
- [ ] No new object allocations in the tick hot path
- [ ] `STUCK_SECONDS` reduced from 3 to 2 to match the ~2s acceptance criterion
- [ ] **NEW:** `stuckFrames` reset to 0 when fade is triggered to prevent redundant re-trigger

## Files to Modify

| File | Changes |
|------|---------|
| `utils/particleEngine.ts` | Add `FADE_SECONDS`/`FADE_RATE` constants; update `Particle` interface (add `opacity`, `fadeRate`; remove `stuckTarget`); update `spawn()`; add fade early-return in `updateParticle()` with `Math.max(0, ...)` clamping; replace stuck steering with fade trigger (with `stuckFrames` reset); add edge collision fade trigger guarded by `!inStrait`; reduce `STUCK_SECONDS` to 2 |
| `composables/useParticleFlow.ts` | Update `drawTest()` to use `p.opacity`; update `drawProduction()` to split fading particles for individual alpha draws; add `globalAlpha = 1` reset after fading loop |

## Dependencies & Risks

- **Low risk:** Changes are additive to the Particle interface and confined to two files.
- **Edge case -- strait mode:** In strait mode (1D spine advancement), particles are positioned directly on the spine and should rarely leave water. But if they do (polygon rasterization edge case), the dock fade handles it gracefully. **IMPORTANT: The `!isInWater` check MUST be guarded with `!inStrait` to prevent false-positive fading in narrow strait passages where the spine crosses non-water grid cells.**
- **Edge case -- spawn on non-water:** If a spawn point lands outside water (bad polygon data), the particle would immediately trigger dock fade. This is acceptable -- it fades and respawns, self-healing.
- **Edge case -- rapid tab switching:** Large `dt` values (up to 3x) after tab return can cause multiple particles to simultaneously enter fade, temporarily reducing visible count. The progressive spawn system (SPAWN_INTERVAL / SPAWN_BATCH_FRAC) will replenish them within ~0.5s. This is acceptable and may even look intentional (a "burst" of ships docking upon return).
- **Reduced motion:** In `prefers-reduced-motion` mode, particles are ticked to a static snapshot. Fading particles in that snapshot will appear partially transparent. This is fine -- they represent ships at various stages of docking.
- **Hidden class transition:** Removing `stuckTarget` (object|null) and adding `opacity`/`fadeRate` (numbers) changes the V8 hidden class for `Particle` objects. This is a one-time transition cost per session, not per-frame. No action needed.

## Sources & References

- Existing particle engine: `utils/particleEngine.ts`
- Rendering composable: `composables/useParticleFlow.ts`
- Unification plan (predecessor): `docs/plans/2026-03-09-refactor-unify-particle-system-plan.md`
- Canvas2D `globalAlpha` spec: values outside [0, 1] are clamped by the UA
- V8 hidden classes: monomorphic shapes (all-primitive fields) are faster than polymorphic shapes (mixed object|null fields)
