---
status: resolved
resolution: "Option A — documented the scope/cleanup contract on both useTypewriter and useScramble (doc block + inline comment at the guard); guard kept"
priority: p3
issue_id: "161"
tags: [code-review, quality, vue, composables, BF-72]
dependencies: []
---

# `useTypewriter` / `useScramble` Silently Skip Cleanup If Ever Called Outside an Effect Scope

## Problem Statement

Both new composables register cleanup conditionally:

```ts
// composables/useTypewriter.ts (and useScramble.ts, identical shape)
if (getCurrentScope()) {
  onScopeDispose(clearTimer)   // useScramble: onScopeDispose(cancelRaf)
}
```

Inside a `<script setup>` (the only current callers — `AseanMap.vue` and
`AseanInfographic.vue`) there is always an active effect scope, so `onScopeDispose` is
registered and timers/rAF are cleaned up correctly. **No live bug today.**

The guard's effect is on *future* misuse: if someone later calls these composables outside a
component/effect scope (a plain module, a non-setup store action, a test harness), the
`if (getCurrentScope())` short-circuits and **no cleanup is registered, with no warning** — a
silent `setInterval` / `requestAnimationFrame` leak. Without the guard, `onScopeDispose` would
emit Vue's standard dev-mode warning, surfacing the misuse loudly.

Note: a sibling todo (#107) flagged a `getCurrentScope()` guard that was genuinely *redundant*
because it sat inside `onMounted` (always scoped). This case is different — the guard sits at
the composable's top level, where calling outside a scope is actually possible — so the guard is
defensible. The concern here is the *silent* failure mode, not redundancy.

## Findings

- **Source:** `composables/useTypewriter.ts` (around line 90) and `composables/useScramble.ts`
  (around line 117) — `if (getCurrentScope()) onScopeDispose(...)`.
- **Impact:** None for current usage (both consumers are in setup scope). Latent: a future
  out-of-scope caller leaks a timer/rAF silently.
- **Severity:** P3, advisory.

## Proposed Solutions

### Option A: Document the scope requirement (recommended, lowest churn)
- Add a one-line doc note to each composable: "Must be called within a component setup or
  effect scope (relies on `onScopeDispose` for timer/rAF cleanup)." Keep the guard.
- **Effort:** Trivial. **Risk:** None.

### Option B: Drop the guard so misuse warns
- Call `onScopeDispose(...)` unconditionally. When invoked outside a scope, Vue emits its
  standard dev warning, making the misuse visible instead of silent.
- **Pros:** Loud failure on misuse. **Cons:** The warning is dev-only; behavior is otherwise
  unchanged. Slightly noisier if a caller intentionally manages cleanup via the returned `stop()`.
- **Effort:** Trivial. **Risk:** Low.

## Recommended Action

Option A (document the contract; keep the guard). Either is acceptable; both are cosmetic given
current usage.

## Technical Details

- **Affected files:** `composables/useTypewriter.ts`, `composables/useScramble.ts`

## Resolution (2026-05-22) — Option A (document the contract, keep the guard)

Kept the `if (getCurrentScope())` guard (defensible at the composable top level — calling outside a
scope is genuinely possible) and made the silent-failure contract explicit on both composables:

- Added an `IMPORTANT` paragraph to each JSDoc block (`useTypewriter`, `useScramble`) stating the
  composable must be called within a component `setup` or active effect scope; outside one, the
  guard short-circuits and the caller MUST own teardown via the returned `stop()`, else the
  `setInterval` / `requestAnimationFrame` leaks.
- Added an inline comment at the guard site in both files noting the skip is intentional and
  pointing back to the doc-block contract.

Option B (drop the guard so Vue dev-warns) was not taken — the dev-only warning adds noise for any
caller that intentionally manages cleanup via `stop()`, and documenting the contract is sufficient
given both current callers (`AseanMap.vue`, `AseanInfographic.vue`) are in setup scope. No code
behavior change. `npm run build` re-run after the change — passes.

## Acceptance Criteria

- [x] The scope/cleanup contract is documented on both composables (doc block + inline guard
      comment); guard kept (Option A).
- [x] `npm run build` passes.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-05-22 | Created from PR #46 code review (autofix mode) | Top-level `getCurrentScope()` guard is defensible (unlike the redundant in-`onMounted` case in #107) but turns out-of-scope misuse into a silent timer/rAF leak. No live bug — both current callers are in setup scope. Advisory. |
| 2026-05-22 | Resolved via Option A (document) | Documented the scope/cleanup contract in both composables' JSDoc + an inline comment at the guard; kept the guard. Chose docs over dropping the guard (Option B) to avoid dev-warning noise for callers that own cleanup via stop(). Build green. |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/46
- Plan: docs/plans/2026-05-22-004-feat-asean-country-switch-transition-plan.md (R7/R8/R9 cleanup)
- Related: todos/107-pending-p3-redundant-getcurrentscope-guard.md
- Run artifact: /tmp/compound-engineering/ce-code-review/20260522-173335-61abe09e/
