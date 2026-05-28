---
status: resolved
resolution: "safe_auto fix applied — flag CardFlip now bound to :duration-ms=\"FLAG_FLIP_MS\""
priority: p3
issue_id: "162"
tags: [code-review, quality, vue, animation, BF-72]
dependencies: []
---

# Flag-Flip Normalize Timeout (700ms) Implicitly Coupled to CardFlip's Default Duration

## Problem Statement

The flag-flip choreography in `components/infographics/AseanInfographic.vue` normalizes the
CardFlip faces after the rotate settles:

```ts
const FLAG_FLIP_MS = 700
...
function flipFlagTo(nextUrl: string) {
  clearFlagSettle()
  flagBack.value = nextUrl
  flagFlipped.value = true
  flagSettleTimer = setTimeout(() => { ... }, FLAG_FLIP_MS)
}
```

`FLAG_FLIP_MS` must match CardFlip's own rotate duration so the post-settle "snap"
(`flagFront = incoming; flagFlipped = false`) happens exactly when the rotation finishes — too
early shows a mid-rotate/stale face, too late risks a visible flicker. The flag CardFlip was
rendered **without** a `:duration-ms` prop, so it relied on CardFlip's internal default
(`durationMs ?? 700`). The 700/700 match was correct but **implicit**: if CardFlip's default
ever changed, the normalize timeout would silently drift out of sync.

## Resolution (2026-05-22)

**Applied as a `safe_auto` fix** during PR #46 code review (autofix mode). Bound the flag
CardFlip's duration to the same constant that drives the normalize timeout:

```html
<CardFlip :flipped="flagFlipped" :duration-ms="FLAG_FLIP_MS">
```

- Behavior-identical today (`FLAG_FLIP_MS === 700 === CardFlip default`), so no visual change.
- Removes the silent coupling: the rotate and the normalize `setTimeout` are now driven by one
  source of truth, independent of CardFlip's internal default.
- `npm run build` re-run after the change — passes.
- Commit: `fix(asean): bind flag CardFlip duration to FLAG_FLIP_MS [BF-72]` (11a6444).

## Technical Details

- **Affected files:** `components/infographics/AseanInfographic.vue`

## Acceptance Criteria

- [x] Flag CardFlip rotate duration and the normalize timeout share one constant.
- [x] No visual/behavioral change (700 === prior default).
- [x] `npm run build` passes.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-05-22 | Created + resolved from PR #46 code review (autofix safe_auto) | Implicit 700ms coupling between FLAG_FLIP_MS and CardFlip's default made explicit by passing :duration-ms; deterministic, behavior-neutral, qualifies as safe_auto. |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/46
- Plan: docs/plans/2026-05-22-004-feat-asean-country-switch-transition-plan.md (R7)
- Run artifact: /tmp/compound-engineering/ce-code-review/20260522-173335-61abe09e/
