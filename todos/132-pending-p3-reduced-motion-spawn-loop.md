---
status: resolved
priority: p3
issue_id: "BF-104"
tags: [code-review, quality, accessibility]
dependencies: []
---

# prefers-reduced-motion spawn loop calls tick() N times instead of batch spawning

## Problem Statement

In `useParticleFlow.ts:543-548`, when `prefersReducedMotion` is true, particles are spawned by calling `simulation.tick(1)` in a loop `particleCount` times. Since `tick()` runs the full physics simulation (including movement, stuck detection, boundary checking), this is significantly more expensive than simply spawning particles at rest. For 240 particles with batch spawning at 5% per tick, this requires ~240/12 = 20 ticks, but the loop runs 240 times.

## Findings

- `useParticleFlow.ts:543-548` — loop calling `tick(1)` for each desired particle
- `tick()` spawns in batches of `SPAWN_BATCH_FRAC` (5%) every `SPAWN_INTERVAL` (30) frames
- With 240 target particles, the loop runs 240 iterations but only spawns ~12 per 30 frames
- Most tick iterations just move existing particles without spawning
- The intent is to spread particles along the spine (not all at spawn point), which is why tick is called

## Proposed Solutions

### Option 1: Add a dedicated spawnStatic() method to ParticleSimulation

**Approach:** Create a method that spawns all particles and distributes them along the spine without running full physics.

**Pros:**
- Much faster initialization for reduced motion
- Clear intent

**Cons:**
- New method to maintain

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Accept current behavior (document)

**Approach:** The visual result is correct — particles end up distributed along the flow path. Document that initialization is intentionally heavier for reduced motion to achieve proper distribution.

**Pros:**
- No code changes
- Works correctly

**Cons:**
- Slower than necessary for a one-time operation

**Effort:** 5 minutes

**Risk:** None

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `composables/useParticleFlow.ts:542-549` — reduced motion initialization

## Resources

- **PR:** #32

## Acceptance Criteria

- [ ] Reduced motion initialization completes in under 50ms
- [ ] Particles appear distributed along the flow path (not clustered at spawn)

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Analyzed reduced motion initialization loop
- Identified mismatch between loop count and spawn rate
