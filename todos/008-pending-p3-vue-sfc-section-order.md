---
status: pending
priority: p3
issue_id: "BF-73"
tags: [code-review, quality, vue]
dependencies: []
---

# RenewableEnergyChart.vue SFC section order does not follow Vue convention

## Problem Statement

The `RenewableEnergyChart.vue` component has its Single-File Component (SFC) sections in the order `<template>`, `<style>`, `<script setup>`. The Vue/Nuxt community convention is `<script setup>`, `<template>`, `<style>`. This is a pre-existing issue not introduced by PR #5, but since this PR modifies the `<script setup>` section, it is worth noting for a future cleanup pass.

The plan document itself acknowledges this: "The Vue/Nuxt convention is `<script>`, `<template>`, `<style>`. This is a pre-existing issue not introduced by this migration."

## Findings

- `components/RenewableEnergyChart.vue` line 3: `<template>` block
- `components/RenewableEnergyChart.vue` line 9: `<style>` block
- `components/RenewableEnergyChart.vue` line 129: `<script setup>` block
- This ordering makes it harder to see the component logic at a glance (script is at the bottom of a ~490 line file)
- The Vue Style Guide recommends script-first ordering for better developer experience

## Proposed Solutions

### Option 1: Reorder SFC sections in a separate PR

**Approach:** Move `<script setup>` to the top, then `<template>`, then `<style>`.

**Pros:**
- Follows Vue community convention
- Improves developer experience (logic first, template second, styles last)
- Clean git diff if done as a standalone commit

**Cons:**
- Large diff for a purely cosmetic change
- Should not be mixed with functional changes

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

*To be filled during triage.*

## Technical Details

**Affected files:**
- `components/RenewableEnergyChart.vue` - SFC section reordering

## Resources

- **PR:** #5
- **Vue Style Guide:** https://vuejs.org/style-guide/rules-recommended.html#single-file-component-top-level-element-order

## Acceptance Criteria

- [ ] `<script setup>` appears before `<template>` which appears before `<style>`
- [ ] Component renders identically after reordering
- [ ] No functional changes introduced

## Work Log

### 2026-03-03 - Code Review Discovery

**By:** Claude Code (PR #5 review)

**Actions:**
- Identified non-standard SFC section ordering during component review
- Confirmed this is a pre-existing issue, not introduced by PR #5
- The PR plan document also notes this as a follow-up cleanup

**Learnings:**
- Keep SFC reordering in a separate commit/PR to avoid mixing cosmetic and functional changes
