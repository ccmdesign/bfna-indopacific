---
status: resolved
priority: p2
issue_id: "098"
tags: [code-review, completeness, BF-89, BF-78]
dependencies: []
---

# Particle System Only Has Polygon Data for Hormuz

## Problem Statement

The new polygon-based particle system dynamically imports `~/data/straits/${id}-polygon.json`, but only `hormuz-polygon.json` exists. For all other straits (malacca, taiwan, luzon, sunda, lombok, etc.), `loadPolygon()` will hit the `catch` branch, log a warning, and return `null` — meaning no particles render at all for those straits.

The old Bezier-path system (`straitPaths`) has been removed from `useParticleSystem.ts`, so there is no fallback. The `StraitParticleCanvas` is now rendered inside `StraitCircle` (via `v-if="selected && straitId && year"`), so selecting any non-Hormuz strait will mount the canvas but show nothing.

## Findings

- **Agent:** quality-reviewer, architecture-strategist
- **Evidence:**
  - `composables/useParticleSystem.ts` — `loadPolygon()` dynamic import
  - `data/straits/` — only `hormuz-polygon.json` exists
  - `data/straits/strait-paths.ts` import removed

## Proposed Solutions

### Option 1: Guard particle canvas rendering
Only render `StraitParticleCanvas` when polygon data is known to exist (e.g., a whitelist or checking data availability).

- **Pros:** No console warnings for missing data
- **Cons:** Still no particles for other straits
- **Effort:** Small
- **Risk:** Low

### Option 2: Keep Bezier fallback
Retain the old `straitPaths` data as a fallback when no polygon exists.

- **Pros:** Particles work for all straits
- **Cons:** Maintains two systems
- **Effort:** Medium
- **Risk:** Medium

## Technical Details

- **Affected files:** `composables/useParticleSystem.ts`, `components/straits/StraitCircle.vue`

## Acceptance Criteria

- [ ] No console warnings for straits without polygon data
- [ ] Clear plan for providing polygon data for remaining straits

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
