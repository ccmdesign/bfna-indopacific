---
status: resolved
priority: p2
issue_id: "BF-110"
tags: [code-review, quality, maintainability]
dependencies: []
---

# Hardcoded magic numbers in production fading renderer diverge from batch renderer params

## Problem Statement

In `composables/useParticleFlow.ts`, the fading particle draw uses hardcoded `0.85` for dot alpha and `0.2` for glow alpha, and `2.5` for glow radius. These duplicate the same magic numbers in the batched (non-fading) draw path. If either path's constants are updated independently, the fading and non-fading particles will render at different brightness levels, causing a visible "pop" when a particle transitions from non-fading to fading.

## Findings

- `useParticleFlow.ts:427` — batched dot pass uses `ctx!.globalAlpha = 0.85`
- `useParticleFlow.ts:442` — batched glow pass uses `ctx!.globalAlpha = 0.2`
- `useParticleFlow.ts:445` — batched glow radius uses `p.radius * 2.5`
- `useParticleFlow.ts:456` — fading dot pass duplicates `0.85 * p.opacity`
- `useParticleFlow.ts:461` — fading glow pass duplicates `0.2 * p.opacity`
- `useParticleFlow.ts:463` — fading glow radius duplicates `p.radius * 2.5`
- These six values are logically linked but have no shared constant

## Proposed Solutions

### Option 1: Extract constants at module scope

**Approach:** Define `DOT_ALPHA = 0.85`, `GLOW_ALPHA = 0.2`, `GLOW_RADIUS_MULT = 2.5` at the top of the file and reference them in both draw paths.

**Pros:**
- Single source of truth, prevents drift
- Trivial change, low risk

**Cons:**
- Adds three module-level constants

**Effort:** Small
**Risk:** Low

### Option 2: Leave as-is, add comment linking them

**Approach:** Add `// SYNC: must match fading draw below` comments.

**Pros:**
- No code change

**Cons:**
- Comments can drift, not enforced

**Effort:** Small
**Risk:** Low

## Recommended Action

Option 1 — extract shared constants.

## Technical Details

**Affected files:** `composables/useParticleFlow.ts`

## Acceptance Criteria

- [ ] All six hardcoded render values reference shared constants
- [ ] Fading and non-fading particles at opacity=1 produce identical visual output

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-11 | Created | Code review of PR #34 (BF-110) |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/34
