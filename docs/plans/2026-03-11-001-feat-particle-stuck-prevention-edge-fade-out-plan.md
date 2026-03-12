---
title: Particle Stuck Prevention & Edge Fade-Out (Ship Docking)
type: feat
status: active
date: 2026-03-11
linear: BF-110
---

# Particle Stuck Prevention & Edge Fade-Out (Ship Docking)

## Overview

Two particle behavior improvements for the straits particle system that replace abrupt respawns with smooth fade-out transitions. Stuck particles and coastline-hitting particles should gracefully fade to zero opacity before recycling, producing a more polished "ship docking" visual.

## Problem Statement

**Stuck particles:** The current stuck detection (lines 714-733 in `particleEngine.ts`) steers stuck particles toward the nearest boundary point at 1.5x speed, then respawns them when they get close. This produces an unnatural "particle zipping to the wall then teleporting" effect.

**Edge collisions:** When a particle leaves the water polygon, the engine either teleports it to the spine centerline or tries candidate positions (lines 686-709). If all candidates fail, the particle snaps to the centerline. Particles that genuinely hit coastline never "dock" -- they either bounce or teleport.

Both behaviors break visual continuity. The fix is a unified fade-out mechanism.

## Proposed Solution

Add an `opacity` field and a `fadeRate` field to the `Particle` interface. When a particle enters fade-out (from either trigger), set `fadeRate > 0` to begin decrementing opacity each frame. When opacity reaches 0, recycle via `respawn()`. During fade-out, freeze velocity so the particle appears to stop in place.

### Trigger 1: Stuck Prevention

Keep the existing rolling-window stuck detection (`stuckX`, `stuckY`, `stuckFrames`, `STUCK_RADIUS`, `STUCK_FRAMES`). But instead of setting `stuckTarget` to steer toward boundary, set `fadeRate` to begin fade-out. Remove the `stuckTarget` field and its steering logic entirely.

### Trigger 2: Edge/Coastline Collision (Ship Docking)

After position update in `updateParticle()`, check `isInWater(p.x, p.y, grid)`. If the particle has left water and is not already fading, revert to previous position (or keep current -- it is at the coastline edge) and begin fade-out. This simulates a ship arriving at port.

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
  p.opacity -= p.fadeRate * dt
  if (p.opacity <= 0) {
    this.respawn(p)
  }
  return
}
```

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

**Edge collision detection (ship docking):**

After the position update block (after both strait-mode and open-water-mode), before stuck detection, add:

```typescript
// Edge collision: particle left water polygon -> dock fade-out
if (!isInWater(p.x, p.y, grid)) {
  // Revert to pre-move position (still at coastline edge)
  // Actually: keep position (it's at the coast), just stop and fade
  p.vx = 0
  p.vy = 0
  p.fadeRate = FADE_RATE
  return
}
```

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
```

This keeps the hot path (most particles) batched. Only the ~2-5 particles fading at any given time get individual draws.

## System-Wide Impact

- **Interaction graph:** `updateParticle()` -> fade check -> `respawn()`. No new callbacks or observers. The fade-out is purely internal to the simulation tick.
- **Error propagation:** No new error paths. If `opacity` somehow goes negative, `respawn()` resets it to 1.
- **State lifecycle risks:** None. The `respawn()` call resets all fields via `Object.assign(p, this.spawn())`, which will set `opacity: 1` and `fadeRate: 0`.
- **API surface parity:** The `Particle` interface is exported. Any external code reading particles (e.g., Tweakpane debug) will see the new fields but they are additive.
- **Performance:** No new per-frame allocations. `fadeRate` and `opacity` are primitive number fields on existing objects. The early-return in `updateParticle()` for fading particles actually reduces work (no physics computed during fade).

## Acceptance Criteria

- [ ] `Particle` interface has `opacity: number` (default 1) and `fadeRate: number` (default 0)
- [ ] `stuckTarget` field and its steering logic are removed from `Particle` and `updateParticle()`
- [ ] Stuck particles (within `STUCK_RADIUS` for `STUCK_FRAMES`) trigger `fadeRate = FADE_RATE` instead of boundary steering
- [ ] Particles leaving water polygon (`!isInWater` after position update) stop velocity and trigger `fadeRate = FADE_RATE`
- [ ] Fading particles decrement `opacity` each tick; when `opacity <= 0`, `respawn()` is called
- [ ] `drawTest()` multiplies `globalAlpha` by `p.opacity`
- [ ] `drawProduction()` handles `p.opacity` for fading particles without breaking batch rendering for non-fading particles
- [ ] No visual glitches: particles smoothly fade rather than disappearing abruptly
- [ ] Particle pool stays healthy: count remains at `params.particleCount` over time
- [ ] No new object allocations in the tick hot path
- [ ] `STUCK_SECONDS` reduced from 3 to 2 to match the ~2s acceptance criterion

## Files to Modify

| File | Changes |
|------|---------|
| `utils/particleEngine.ts` | Add `FADE_SECONDS`/`FADE_RATE` constants; update `Particle` interface (add `opacity`, `fadeRate`; remove `stuckTarget`); update `spawn()`; add fade early-return in `updateParticle()`; replace stuck steering with fade trigger; add edge collision fade trigger; reduce `STUCK_SECONDS` to 2 |
| `composables/useParticleFlow.ts` | Update `drawTest()` to use `p.opacity`; update `drawProduction()` to split fading particles for individual alpha draws |

## Dependencies & Risks

- **Low risk:** Changes are additive to the Particle interface and confined to two files.
- **Edge case -- strait mode:** In strait mode (1D spine advancement), particles are positioned directly on the spine and should rarely leave water. But if they do (polygon rasterization edge case), the dock fade handles it gracefully.
- **Edge case -- spawn on non-water:** If a spawn point lands outside water (bad polygon data), the particle would immediately trigger dock fade. This is acceptable -- it fades and respawns, self-healing.
- **Reduced motion:** In `prefers-reduced-motion` mode, particles are ticked to a static snapshot. Fading particles in that snapshot will appear partially transparent. This is fine -- they represent ships at various stages of docking.

## Sources & References

- Existing particle engine: `utils/particleEngine.ts`
- Rendering composable: `composables/useParticleFlow.ts`
- Unification plan (predecessor): `docs/plans/2026-03-09-refactor-unify-particle-system-plan.md`
