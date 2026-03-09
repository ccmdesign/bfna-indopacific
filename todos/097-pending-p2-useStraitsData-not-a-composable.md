---
status: resolved
priority: p2
issue_id: "097"
tags: [code-review, architecture, naming, BF-89]
dependencies: []
---

# useStraitsData Is Not a Vue Composable (Misleading Name)

## Problem Statement

`composables/useStraitsData.ts` exports plain constants and a pure function — it has no reactive state, no lifecycle hooks, and no `use*` composable pattern. It is a data module, not a composable. Placing it in `composables/` with a `use` prefix is misleading and breaks the Nuxt convention where `composables/` auto-imports are expected to be Vue composables with reactive returns.

## Findings

- **Agent:** architecture-strategist
- **Evidence:** `composables/useStraitsData.ts` — exports `straits`, `meta`, `historical`, `LATEST_YEAR`, `historicalByStrait()` as plain values

## Proposed Solutions

### Option 1: Move to utils/ or data/
Rename to `utils/straitsData.ts` or `data/straitsData.ts` and remove the `use` prefix.

- **Pros:** Correct convention, clear intent
- **Cons:** Import path changes in 2-3 files
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `composables/useStraitsData.ts`, `components/StraitMap.vue`, `pages/infographics/straits/[[id]].vue`

## Acceptance Criteria

- [ ] File is in `utils/` or `data/`, not `composables/`
- [ ] No `use` prefix on the module name

## Work Log

| Date | Action | Details |
|------|--------|---------|
| 2026-03-09 | Created | Found during PR #26 code review |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/26
