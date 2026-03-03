---
status: resolved
priority: p2
issue_id: "006"
tags: [code-review, quality, typescript, architecture]
dependencies: []
---

# Missing TypeScript in layout/default.vue script setup

## Problem Statement

The new `layouts/default.vue` uses `<script setup>` without `lang="ts"`, while sibling components (`GridOverlay.vue`, `RotateDeviceOverlay.vue`) use `<script setup lang="ts">`. This means route meta properties (`layoutClass`, `showBackLink`, `footerSource`) have no compile-time type checking. Future pages could pass malformed values to `definePageMeta` (e.g. a string instead of an object for `footerSource`) and no error would surface until runtime.

**Why it matters:** As more pages are added to this multi-infographic site, the layout's contract with pages (which meta fields it reads and their expected shapes) should be enforced. TypeScript would catch mismatches at build time rather than producing silent rendering bugs.

## Findings

- **Location:** `layouts/default.vue`, line 1 (`<script setup>`)
- **Evidence:** The file reads `route.meta.layoutClass`, `route.meta.showBackLink`, and `route.meta.footerSource` without any type narrowing or validation. Components in the same project already use `lang="ts"`.
- **Agent:** architecture-strategist, quality-reviewer
- **Impact:** Medium -- no current bug, but increases risk of silent failures as pages multiply.

## Proposed Solutions

### Option 1: Add `lang="ts"` and declare a route meta interface
- **Pros:** Full type safety, IntelliSense in editors, catches errors early
- **Cons:** Requires declaring a `RouteMeta` augmentation or using type assertions
- **Effort:** Small (add lang="ts", add interface/type for meta fields)
- **Risk:** None

### Option 2: Add runtime validation with defaults
- **Pros:** Works without TypeScript, defensive at runtime
- **Cons:** Less developer ergonomics, errors surface at runtime instead of build time
- **Effort:** Small
- **Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `layouts/default.vue`
- **Components:** Layout script setup block
- **Database changes:** None

## Acceptance Criteria

- [ ] `layouts/default.vue` uses `<script setup lang="ts">`
- [ ] Route meta properties are typed (either via interface or type assertion)
- [ ] `npm run generate` passes with no type errors
- [ ] Existing page (`pages/index.vue`) continues to render correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #6 code review | Layout should match TypeScript usage of sibling components |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/6
- File: `layouts/default.vue` line 1
- Nuxt docs on typed route meta: https://nuxt.com/docs/guide/directory-structure/pages#typing-custom-metadata
