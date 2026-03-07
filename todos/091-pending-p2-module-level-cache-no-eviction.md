---
status: resolved
priority: p2
issue_id: "091"
tags: [code-review, performance, architecture]
dependencies: []
---

# Module-Level Geometry Cache Has No Eviction Strategy

## Problem Statement

`useCorridor.ts` uses a module-level `Map<string, CorridorGeometry>` cache with no size limit, TTL, or eviction. While the current dataset (6 corridors) makes this harmless, the pattern is problematic for SSR (Nuxt server-side rendering) where the cache persists across requests and is shared between users.

**Why it matters:** In SSR mode, module-level mutable state is a known Nuxt anti-pattern that can leak data between requests or grow unbounded.

## Findings

- **Source:** `composables/useCorridor.ts` line 11
- **Evidence:** `const geometryCache = new Map<string, CorridorGeometry>()` at module scope, never cleared.

## Proposed Solutions

### Option A: Guard cache with client-only check
- Wrap cache usage in `if (import.meta.client)` or use `useState` for SSR-safe storage
- **Pros:** SSR-safe, minimal code change
- **Cons:** Slightly more complex
- **Effort:** Small
- **Risk:** Low

### Option B: Accept current approach with documentation
- Add a comment noting the cache is intentionally unbounded for the fixed corridor set
- **Pros:** No code change
- **Cons:** Doesn't fix the SSR concern
- **Effort:** Trivial
- **Risk:** Low (if SSR is not used for this page)

## Recommended Action

Option A implemented: Cache is now guarded with `typeof window !== 'undefined'` check. On the server (SSR), `geometryCache` is `null` and geometry is recomputed per request. On the client, the Map cache works as before.

## Technical Details

- **Affected files:** `composables/useCorridor.ts`

## Acceptance Criteria

- [ ] Cache is either SSR-safe or explicitly documented as client-only
- [ ] No memory leak risk in server-side rendering scenarios

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #23 code review | Module-level Map persists across SSR requests |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/23
- Nuxt docs on shared state: https://nuxt.com/docs/getting-started/state-management
