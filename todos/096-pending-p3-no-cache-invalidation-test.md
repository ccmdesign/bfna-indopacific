---
status: pending
priority: p3
issue_id: "096"
tags: [code-review, quality, testing]
dependencies: []
---

# No Test Coverage for Module-Level Geometry Cache

## Problem Statement

The `geometryCache` in `useCorridor.ts` is never tested for cache behavior: no test verifies that repeated calls return the same object (cache hit), and there is no mechanism to clear the cache for test isolation. Since tests import `deriveGeometry` directly (bypassing the cache), the caching path in `useCorridor` is untested.

**Why it matters:** If cache logic has a bug (e.g., stale data, wrong key), it would not be caught by the test suite.

## Findings

- **Source:** `composables/useCorridor.ts` lines 122-132, `tests/corridor-geometry.test.ts`
- **Evidence:** Tests only call `deriveGeometry()` directly, never exercise `useCorridor()` or the cache.

## Proposed Solutions

### Option A: Add composable-level tests with Vue Test Utils
- Test `useCorridor` with a reactive ref, verify cache hits return same reference
- **Pros:** Full coverage of the composable
- **Cons:** Requires Vue test environment (happy-dom already in devDeps)
- **Effort:** Small
- **Risk:** None

### Option B: Export a cache-clear function for testing
- Add `export function _clearGeometryCache() { geometryCache.clear() }` guarded by `import.meta.vitest`
- **Pros:** Enables isolated tests
- **Cons:** Exposes internal API
- **Effort:** Trivial
- **Risk:** None

## Recommended Action

_(To be filled during triage)_

## Technical Details

- **Affected files:** `composables/useCorridor.ts`, `tests/corridor-geometry.test.ts`

## Acceptance Criteria

- [ ] At least one test exercises the `useCorridor` composable (not just `deriveGeometry`)
- [ ] Cache behavior is verified (same input returns cached result)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #23 code review | Cache path has zero test coverage |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/23
