---
status: resolved
priority: p3
issue_id: "128"
tags: [code-review, architecture]
dependencies: []
---

# StraitCardList No Longer Accepts Props -- Hardcoded Import

## Problem Statement

`StraitCardList.vue` previously accepted a `straits` prop and sorted internally, making it reusable with any subset of straits. The refactor removed the prop and replaced it with a direct import of `sortedStraits` from `utils/straitsData.ts`. While this achieves the goal of sharing sort order, it makes the component non-reusable (it can only display all straits, never a filtered subset).

This is a minor architectural concern -- there is currently only one usage. But if filtering is ever needed (e.g., "show only threatened straits"), the prop would need to be re-added.

## Findings

- **File:** `components/straits/StraitCardList.vue`, lines 1-3
- Removed `defineProps<{ straits: Strait[] }>()` and `computed(() => [...props.straits].sort(...))`
- Replaced with `import { sortedStraits } from '~/utils/straitsData'`
- The component now has zero props and is tightly coupled to the full data set

## Proposed Solutions

### Option A: Accept as-is (YAGNI)
There is only one usage and no current need for filtering. Revisit if filtering is needed.

- **Pros:** Simpler code now
- **Effort:** None
- **Risk:** None currently

### Option B: Keep prop but default to sortedStraits
`defineProps<{ straits?: Strait[] }>()` with `const items = computed(() => props.straits ?? sortedStraits)`

- **Pros:** Maintains reusability, still uses shared ordering by default
- **Effort:** Small
- **Risk:** None

## Technical Details

- **Affected files:** `components/straits/StraitCardList.vue`

## Acceptance Criteria

- [ ] Decision documented on whether reusability matters for this component

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-09 | Code review finding | PR #31 |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/31
