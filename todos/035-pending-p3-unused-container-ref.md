---
status: pending
priority: p3
issue_id: "035"
tags: [code-review, quality, vue]
dependencies: []
---

# Unused `container` Ref and `ref` Import in StraitMap.vue

## Problem Statement

`StraitMap.vue` imports `ref` from Vue and declares `const container = ref<HTMLElement | null>(null)` with a corresponding `ref="container"` on the template root element. However, `container` is never read or used in any lifecycle hook or computed property. The `ref` import is also only used for this unused variable (not for `straits` or `meta`, which are plain assignments).

**Why it matters:** Unused imports and variables add noise to the component. While the plan explains this as a forward-compatibility measure for Phase 2+ D3/Canvas work, shipping unused code in production goes against the YAGNI principle. The ref can be trivially added back when imperative DOM access is actually needed.

## Findings

- **Location:** `/components/StraitMap.vue`, lines 3 and 5
- **Evidence:** `import { ref } from 'vue'` and `const container = ref<HTMLElement | null>(null)` are declared but `container` is never accessed in `onMounted`, `watch`, `computed`, or any other context. The template `ref="container"` attribute is also unnecessary without a corresponding script-side consumer.
- **Agent:** code-simplicity-reviewer
- **Impact:** Minimal runtime impact (Vue still binds the template ref), but adds 2 unnecessary lines and an unused import.

## Proposed Solutions

### Option 1: Remove the unused ref and import
- **Pros:** Cleaner code; follows YAGNI; trivial to re-add in Phase 2
- **Cons:** Slightly more work when Phase 2 starts (adding 2 lines)
- **Effort:** Small (remove 2 lines, remove `ref="container"` from template)
- **Risk:** None

### Option 2: Keep as-is with a comment explaining forward-compatibility intent
- **Pros:** Ready for Phase 2 without any changes
- **Cons:** Dead code in production; comment may become stale
- **Effort:** Small (add 1 comment line)
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `components/StraitMap.vue`
- **Lines:** 3 (import), 5 (declaration), 12 (template ref attribute)

## Acceptance Criteria

- [ ] Either `container` ref is used in a lifecycle hook, or it is removed along with the unused `ref` import

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-04 | Identified during PR #13 code review | Scaffold code should avoid pre-wiring unused hooks; add them when needed |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/13
- File: `components/StraitMap.vue`
