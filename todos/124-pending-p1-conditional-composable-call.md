---
status: pending
priority: p1
issue_id: "BF-104"
tags: [code-review, architecture, vue]
dependencies: []
---

# Conditional composable call violates Vue composition API rules

## Problem Statement

In `StraitParticleCanvas.vue`, `useParticleFlow` is called conditionally inside an `if (config.value)` block at the top level of `<script setup>`. Vue composables must be called unconditionally during setup — conditional calls break reactivity tracking and can cause hydration mismatches, memory leaks, or silent failures when the condition changes.

This is especially dangerous because `config` is a `computed` whose value could theoretically change (e.g., if `flowConfigs` is updated dynamically or `props.straitId` changes).

## Findings

- `components/straits/StraitParticleCanvas.vue:31-38` wraps `useParticleFlow()` in `if (config.value)`.
- Vue's composition API requires all composables to be called in the same order on every setup invocation.
- The parent `StraitCircle.vue` does guard with `v-if="showParticles"`, which means the component remounts when visibility changes. This partially mitigates the issue since each mount is a fresh setup call.
- However, if `straitId` changes while `showParticles` remains true, the config could change from valid to null or vice versa without remounting.

## Proposed Solutions

### Option 1: Always call the composable, pass a reactive config ref

**Approach:** Remove the conditional. Pass `config` as a `Ref<StraitFlowConfig | null>` and have `useParticleFlow` handle null internally (skip initialization when null).

**Pros:**
- Follows Vue composition API rules correctly
- Handles dynamic config changes gracefully

**Cons:**
- Requires minor refactor of `useParticleFlow` to accept nullable config

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Rely on parent v-if guard (document decision)

**Approach:** Since `StraitCircle.vue` already uses `v-if="showParticles"`, the component fully remounts on each toggle. Document this invariant and add a comment explaining the guard is safe because of the parent v-if.

**Pros:**
- No code changes needed
- Works correctly given current parent structure

**Cons:**
- Fragile — breaks if parent changes its v-if pattern
- Violates Vue best practices (linters will flag it)

**Effort:** 15 minutes

**Risk:** Medium (relies on external invariant)

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `components/straits/StraitParticleCanvas.vue:31-38` — conditional composable call
- `components/straits/StraitCircle.vue:35-39` — parent v-if guard
- `composables/useParticleFlow.ts` — composable that would need nullable config support

## Resources

- **PR:** #32
- **Vue docs:** https://vuejs.org/guide/extras/composition-api-faq.html#caveats

## Acceptance Criteria

- [ ] `useParticleFlow` is called unconditionally in `StraitParticleCanvas.vue` setup
- [ ] Composable handles null/missing config gracefully
- [ ] No Vue lint warnings about conditional composable calls

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified conditional composable call pattern in StraitParticleCanvas.vue
- Verified parent v-if partially mitigates but doesn't eliminate the risk
- Proposed two solutions

**Learnings:**
- Parent v-if causes full remount, so each setup call is fresh — but this is an implicit contract
