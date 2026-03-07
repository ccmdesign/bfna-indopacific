---
status: pending
priority: p3
issue_id: "071"
tags: [code-review, performance, vue]
dependencies: []
---

# useFisheyeCanvas Composable Runs Even When Canvas Is Not Rendered

## Problem Statement

`useFisheyeCanvas` is called unconditionally in `StraitCircle.vue` setup, but the `<canvas>` element is conditionally rendered with `v-if="showCanvas"`. When `showCanvas` is false (no imageUrl, reduced motion, or no WebGL), the composable still executes its `onMounted` hook, attempting to get a WebGL context from a null canvas ref. While this is handled gracefully (early return on null canvas), it is unnecessary work and allocates watchers that serve no purpose.

## Findings

- **Source:** `components/straits/StraitCircle.vue`, line 31 - composable called unconditionally
- **Source:** `composables/useFisheyeCanvas.ts`, line 447 - early return if canvas is null
- **Impact:** Minor - the composable handles the null case, but watchers for distortion/aberration still run

## Proposed Solutions

### Option A: Guard composable invocation with a condition
- **Pros:** Avoids unnecessary work
- **Cons:** Composables in Vue must be called unconditionally at setup time (Vue reactivity rules)
- **Effort:** Medium (would need restructuring)
- **Risk:** Low

### Option B: Accept current behavior (recommended)
- **Pros:** Follows Vue composable rules; null handling is already correct
- **Cons:** Minor wasted CPU cycles
- **Effort:** None
- **Risk:** None

## Recommended Action

_To be filled during triage._

## Technical Details

- **Affected files:** `components/straits/StraitCircle.vue`, `composables/useFisheyeCanvas.ts`

## Acceptance Criteria

- [ ] Composable handles null canvas ref gracefully (already met)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-06 | Identified during PR #20 code review | Acceptable trade-off per Vue reactivity rules |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/20
