---
status: pending
priority: p2
issue_id: "BF-104"
tags: [code-review, quality]
dependencies: []
---

# showDebug defaults to true in production-shared defaultFlowParams

## Problem Statement

`defaultFlowParams()` in `utils/particleEngine.ts:135` sets `showDebug: true` by default. While the composable overrides this for production mode (`showDebug: !isProductionMode`), the default is surprising and error-prone. Any new consumer that forgets to override will get debug overlays in production.

## Findings

- `utils/particleEngine.ts:135` — `showDebug: true` in defaults.
- `composables/useParticleFlow.ts:133` — production mode overrides with `showDebug: !isProductionMode`.
- A pure-engine consumer (e.g., a future worker thread or SSR context) would inherit the debug default.

## Proposed Solutions

### Option 1: Default showDebug to false

**Approach:** Change `showDebug: true` to `showDebug: false` in `defaultFlowParams`. Test pages can pass `showDebug: true` explicitly.

**Pros:**
- Safe default for production
- Follows principle of least surprise

**Cons:**
- Test pages need to opt in

**Effort:** 15 minutes

**Risk:** None

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `utils/particleEngine.ts:135` — default value
- `composables/useParticleFlow.ts:133` — override

## Resources

- **PR:** #32

## Acceptance Criteria

- [ ] `showDebug` defaults to `false`
- [ ] Test pages still show debug overlays

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified unsafe default for showDebug flag
