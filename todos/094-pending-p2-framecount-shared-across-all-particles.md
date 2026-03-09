---
status: resolved
priority: p2
issue_id: "094"
tags: [code-review, architecture, correctness, BF-89]
dependencies: []
---

# frameCount Incremented Per-Particle Instead of Per-Frame

## Problem Statement

In `useParticleSystem.ts`, `frameCount++` is called inside `updateParticle()`, which runs once per particle per frame. With 240 particles, `frameCount` increments 240 times per animation frame instead of once. This causes the noise-based organic drift (`noise(time)` where `time = frameCount * 0.02 + p.noiseOffset`) to advance 240x faster than intended, producing jittery, high-frequency motion instead of smooth organic drift.

## Findings

- **Agent:** architecture-strategist
- **Evidence:** `composables/useParticleSystem.ts` — `frameCount++` is inside `updateParticle()` (called in the `for (const p of particles)` loop in `animate()`)

## Proposed Solutions

### Option 1: Move frameCount++ to animate() loop
Increment `frameCount` once per frame in `animate()`, before the particle update loop.

- **Pros:** Correct behavior, trivial fix
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `composables/useParticleSystem.ts`

## Acceptance Criteria

- [ ] `frameCount` increments exactly once per animation frame
- [ ] Particle drift is smooth, not jittery

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
